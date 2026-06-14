using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.Tournament;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;
using PokerHub.Api.Hubs;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace PokerHub.Api.Services;

public class TournamentTimerService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IHubContext<TournamentHub> _hubContext;
    private readonly ILogger<TournamentTimerService> _logger;
    private readonly ConcurrentDictionary<Guid, TournamentTimerState> _activeTimers = new();
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _advanceLocks = new();

    private DateTime _lastRefresh = DateTime.MinValue;
    private static readonly TimeSpan RefreshInterval = TimeSpan.FromSeconds(5);
    private readonly ConcurrentDictionary<Guid, int> _persistFailureCounts = new();

    public TournamentTimerService(
        IServiceProvider serviceProvider,
        IHubContext<TournamentHub> hubContext,
        ILogger<TournamentTimerService> logger)
    {
        _serviceProvider = serviceProvider;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("TournamentTimerService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessActiveTimers(stoppingToken);
                await Task.Delay(1000, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in TournamentTimerService");
                await Task.Delay(5000, stoppingToken);
            }
        }

        _logger.LogInformation("TournamentTimerService stopped");
    }

    private async Task ProcessActiveTimers(CancellationToken stoppingToken)
    {
        if (DateTime.UtcNow - _lastRefresh > RefreshInterval)
        {
            await RefreshActiveTimers(stoppingToken);
            _lastRefresh = DateTime.UtcNow;
        }

        foreach (var (tournamentId, timerState) in _activeTimers)
        {
            if (stoppingToken.IsCancellationRequested) break;

            try
            {
                await ProcessTimer(tournamentId, timerState, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing timer for tournament {TournamentId}", tournamentId);
            }
        }
    }

    private SemaphoreSlim GetAdvanceLock(Guid tournamentId)
    {
        return _advanceLocks.GetOrAdd(tournamentId, _ => new SemaphoreSlim(1, 1));
    }

    private async Task RefreshActiveTimers(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

            var activeTournaments = await context.Tournaments
                .Where(t => t.Status == TournamentStatus.InProgress)
                .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
                .ToListAsync(stoppingToken);

            foreach (var tournament in activeTournaments)
            {
                // Seed under the SAME per-tournament lock the manual/auto ops use, so a freshly started
                // tournament whose manual op is mid-flight (holding the lock before its commit) can never be
                // seeded from a stale DB read and then clobber the just-applied manual change one tick later.
                // SemaphoreSlim is not reentrant, but this seed runs in the background loop OUTSIDE
                // ProcessTimer (which is what holds the lock during a tick), so no lock is already held here.
                var lockObj = GetAdvanceLock(tournament.Id);
                await lockObj.WaitAsync(stoppingToken);
                try
                {
                    if (!_activeTimers.ContainsKey(tournament.Id))
                    {
                        var currentBlind = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == tournament.CurrentLevel);
                        var levelStartedAt = tournament.CurrentLevelStartedAt ?? DateTime.UtcNow;

                        _activeTimers[tournament.Id] = new TournamentTimerState
                        {
                            TournamentId = tournament.Id,
                            CurrentLevel = tournament.CurrentLevel,
                            TimeRemainingSeconds = tournament.TimeRemainingSeconds ?? (currentBlind?.DurationMinutes ?? 15) * 60,
                            IsPaused = false,
                            LevelStartedAt = levelStartedAt
                        };

                        _logger.LogInformation("Added timer for tournament {TournamentId}", tournament.Id);
                    }
                }
                finally
                {
                    lockObj.Release();
                }
            }

            var activeIds = activeTournaments.Select(t => t.Id).ToHashSet();
            var toRemove = _activeTimers.Keys.Where(id => !activeIds.Contains(id)).ToList();
            foreach (var id in toRemove)
            {
                _activeTimers.TryRemove(id, out _);
                _advanceLocks.TryRemove(id, out _);
                _persistFailureCounts.TryRemove(id, out _);
                _logger.LogInformation("Removed timer for tournament {TournamentId}", id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Transient database error in RefreshActiveTimers, using cached timer state");
        }
    }

    private async Task ProcessTimer(Guid tournamentId, TournamentTimerState timerState, CancellationToken stoppingToken)
    {
        if (timerState.IsPaused)
            return;

        // Hold the per-tournament lock for the whole resolve+mutate+persist so the automatic tick can
        // never clobber a concurrent manual control (next/prev/time/pause). The lock is per-tournament
        // and only contended by the (rare) manual operations, so this adds no throughput cost.
        var lockObj = GetAdvanceLock(tournamentId);
        await lockObj.WaitAsync(stoppingToken);
        try
        {
            var now = DateTime.UtcNow;

            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

            var tournament = await context.Tournaments
                .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
                .FirstOrDefaultAsync(t => t.Id == tournamentId, stoppingToken);

            if (tournament == null) return;

            // Re-check liveness under the lock: a manual pause/finish/cancel that landed while this tick
            // was queued must not be overwritten by the automatic resolution below.
            if (timerState.IsPaused || tournament.Status != TournamentStatus.InProgress) return;

            var levels = BuildLevels(tournament);
            if (levels.Count == 0) return;

            var previousLevel = timerState.CurrentLevel;

            // Time is ALWAYS derived from the absolute anchor; this also performs the multi-level
            // catch-up when the host woke up with several levels already expired (restart/scale-to-zero).
            var resolution = TimerMath.Resolve(levels, previousLevel, timerState.LevelStartedAt, now);

            timerState.CurrentLevel = resolution.ResolvedOrder;
            timerState.TimeRemainingSeconds = resolution.RemainingSeconds;
            timerState.LevelStartedAt = resolution.NewAnchorUtc;

            if (resolution.ResolvedOrder != previousLevel)
            {
                // One or more levels elapsed: persist once and emit a single TimerStateSync
                // (no broadcasts for the intermediate levels that were skipped).
                await PersistAndSyncLevelChange(tournamentId, timerState, context, tournament, previousLevel, stoppingToken);
            }
            else if (!resolution.ReachedEnd && timerState.TimeRemainingSeconds % 10 == 0)
            {
                // Emit sync every 10 seconds, NO 1 second ticks. Suppressed once the tournament
                // has run past its last level to avoid spamming a frozen remaining=0.
                PersistFromState(context, tournament, timerState);
                await TrySaveAsync(context, tournamentId, stoppingToken);
                await SyncState(tournamentId, timerState, tournament, stoppingToken);
            }
        }
        finally
        {
            lockObj.Release();
        }
    }

    private async Task SyncState(Guid tournamentId, TournamentTimerState timerState, Domain.Entities.Tournament tournament, CancellationToken stoppingToken)
    {
        var currentBlind = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == timerState.CurrentLevel);
        var nextBlind = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == timerState.CurrentLevel + 1);

        var dto = new TimerStateSyncDto
        {
            Seq = DateTime.UtcNow.Ticks,
            TournamentId = tournamentId,
            Status = tournament.Status.ToString(),
            CurrentLevel = timerState.CurrentLevel,
            CurrentBlindLevel = currentBlind?.Order,
            NextBlindLevel = nextBlind?.Order,
            LevelEndsAtUtc = timerState.LevelStartedAt.AddMinutes(currentBlind?.DurationMinutes ?? 0),
            PausedRemainingSeconds = timerState.IsPaused ? timerState.TimeRemainingSeconds : null,
            ServerNowUtc = DateTime.UtcNow
        };

        await _hubContext.Clients.Group($"tournament_{tournamentId}").SendAsync("TimerStateSync", dto, stoppingToken);
    }

    private static List<(int Order, int DurationSeconds)> BuildLevels(Domain.Entities.Tournament tournament) =>
        tournament.BlindLevels
            .OrderBy(bl => bl.Order)
            .Select(bl => (bl.Order, DurationSeconds: bl.DurationMinutes * 60))
            .ToList();

    private async Task PersistAndSyncLevelChange(
        Guid tournamentId,
        TournamentTimerState timerState,
        PokerHubDbContext context,
        Domain.Entities.Tournament tournament,
        int previousLevel,
        CancellationToken stoppingToken)
    {
        // timerState was already advanced by TimerMath.Resolve in ProcessTimer; here we just persist
        // the resolved anchor/level and emit a single sync. The caller (ProcessTimer) already holds the
        // per-tournament lock, so no extra synchronisation is needed here.
        PersistFromState(context, tournament, timerState);
        if (!await TrySaveAsync(context, tournamentId, stoppingToken)) return;

        await SyncState(tournamentId, timerState, tournament, stoppingToken);

        var jumped = timerState.CurrentLevel - previousLevel;
        if (jumped > 1)
            _logger.LogInformation(
                "Tournament {TournamentId} caught up {Jumped} levels: {From} -> {To}",
                tournamentId, jumped, previousLevel, timerState.CurrentLevel);
        else
            _logger.LogInformation(
                "Tournament {TournamentId} advanced to level {Level}", tournamentId, timerState.CurrentLevel);
    }

    /// <summary>Copies the in-memory timer state onto the tracked tournament entity (no save).</summary>
    private static void PersistFromState(
        PokerHubDbContext context,
        Domain.Entities.Tournament tournament,
        TournamentTimerState timerState)
    {
        tournament.CurrentLevel = timerState.CurrentLevel;
        tournament.TimeRemainingSeconds = timerState.TimeRemainingSeconds;
        tournament.CurrentLevelStartedAt = timerState.LevelStartedAt;
    }

    /// <summary>SaveChanges with the shared transient-failure counter. Returns false on failure.</summary>
    private async Task<bool> TrySaveAsync(PokerHubDbContext context, Guid tournamentId, CancellationToken stoppingToken)
    {
        try
        {
            await context.SaveChangesAsync(stoppingToken);
            _persistFailureCounts.TryRemove(tournamentId, out _);
            return true;
        }
        catch (Exception ex)
        {
            var failureCount = _persistFailureCounts.AddOrUpdate(tournamentId, 1, (_, count) => count + 1);
            if (failureCount >= 5)
                _logger.LogCritical(ex, "Persistent failure to save timer state for {TournamentId}", tournamentId);
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // Manual controls — the timer service is the SINGLE source of truth for a live
    // (InProgress) tournament. Each control mutates the authoritative in-memory state,
    // re-anchors via TimerMath, persists, and emits exactly one TimerStateSync, so there
    // is no manual-vs-auto race (the auto tick reads the same re-anchored state).
    // -------------------------------------------------------------------------

    /// <summary>Manually advances to the next blind level. Returns false when already on the last level.</summary>
    public Task<bool> AdvanceLevelManualAsync(Guid tournamentId) =>
        ApplyManualChangeAsync(tournamentId, (levels, state, now) =>
            TimerMath.ResolveManualNext(levels, state.CurrentLevel, now));

    /// <summary>Manually returns to the previous blind level. Returns false when already on the first level.</summary>
    public Task<bool> GoToPreviousLevelManualAsync(Guid tournamentId) =>
        ApplyManualChangeAsync(tournamentId, (levels, state, now) =>
            TimerMath.ResolveManualPrevious(levels, state.CurrentLevel, now));

    /// <summary>Manually sets the remaining time on the current level (re-anchored, clamped to the level duration).</summary>
    public Task<bool> SetTimeRemainingManualAsync(Guid tournamentId, int secondsRemaining) =>
        ApplyManualChangeAsync(tournamentId, (levels, state, now) =>
            TimerMath.ResolveManualTimeRemaining(levels, state.CurrentLevel, secondsRemaining, now));

    /// <summary>
    /// Shared pipeline for the manual level/time controls. Resolves the new anchor with the supplied
    /// pure TimerMath function, then persists + broadcasts + keeps the in-memory state coherent.
    /// Works whether or not the tournament is already tracked in <see cref="_activeTimers"/> (a freshly
    /// started tournament is loaded from the DB and applied immediately, without waiting for the refresh).
    /// </summary>
    private async Task<bool> ApplyManualChangeAsync(
        Guid tournamentId,
        Func<IReadOnlyList<(int Order, int DurationSeconds)>, TournamentTimerState, DateTime, TimerResolution?> resolve)
    {
        var lockObj = GetAdvanceLock(tournamentId);
        await lockObj.WaitAsync();
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

            var tournament = await context.Tournaments
                .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
                .FirstOrDefaultAsync(t => t.Id == tournamentId);

            if (tournament == null) return false;

            // Symmetry with Pause/Resume (which revalidate Status under the lock): the endpoint's InProgress
            // gate is read in a separate, unlocked query. Re-check here so a tournament paused/finished
            // between that gate and this application does not get a level/time change persisted (TOCTOU).
            if (tournament.Status != TournamentStatus.InProgress) return false;

            var levels = BuildLevels(tournament);
            if (levels.Count == 0) return false;

            // Use the tracked state when available (it is authoritative and may be ahead of the DB,
            // which is only persisted every 10s); otherwise seed a transient state from the DB.
            _activeTimers.TryGetValue(tournamentId, out var state);
            state ??= SeedStateFromTournament(tournament);

            var now = DateTime.UtcNow;
            var resolution = resolve(levels, state, now);
            if (resolution is null) return false;

            state.CurrentLevel = resolution.Value.ResolvedOrder;
            state.TimeRemainingSeconds = resolution.Value.RemainingSeconds;
            state.LevelStartedAt = resolution.Value.NewAnchorUtc;

            PersistFromState(context, tournament, state);
            if (!await TrySaveAsync(context, tournamentId, CancellationToken.None)) return false;

            // Register the post-manual state UNCONDITIONALLY so a freshly started (not-yet-tracked)
            // tournament becomes tracked with the applied change. The refresh seed then sees the key
            // (under the same lock) and will not overwrite it from a stale DB read.
            _activeTimers[tournamentId] = state;

            await SyncState(tournamentId, state, tournament, CancellationToken.None);
            return true;
        }
        finally
        {
            lockObj.Release();
        }
    }

    /// <summary>
    /// Manually pauses a live tournament: freezes the exact remaining time, flips the status to Paused,
    /// and broadcasts. Returns false when the tournament is not InProgress.
    /// </summary>
    public async Task<bool> PauseManualAsync(Guid tournamentId)
    {
        var lockObj = GetAdvanceLock(tournamentId);
        await lockObj.WaitAsync();
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

            var tournament = await context.Tournaments
                .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
                .FirstOrDefaultAsync(t => t.Id == tournamentId);

            if (tournament == null || tournament.Status != TournamentStatus.InProgress) return false;

            var now = DateTime.UtcNow;
            _activeTimers.TryGetValue(tournamentId, out var state);
            state ??= SeedStateFromTournament(tournament);

            // Freeze the exact remaining by resolving against the live anchor before flipping status.
            var levels = BuildLevels(tournament);
            if (levels.Count > 0)
            {
                var resolution = TimerMath.Resolve(levels, state.CurrentLevel, state.LevelStartedAt, now);
                state.CurrentLevel = resolution.ResolvedOrder;
                state.TimeRemainingSeconds = resolution.RemainingSeconds;
                state.LevelStartedAt = resolution.NewAnchorUtc;
            }

            state.IsPaused = true;
            PersistFromState(context, tournament, state);
            tournament.Status = TournamentStatus.Paused;
            if (!await TrySaveAsync(context, tournamentId, CancellationToken.None)) return false;

            _activeTimers[tournamentId] = state;

            await SyncState(tournamentId, state, tournament, CancellationToken.None);
            return true;
        }
        finally
        {
            lockObj.Release();
        }
    }

    /// <summary>
    /// Manually resumes a paused tournament: re-anchors so the frozen remaining is preserved, flips the
    /// status back to InProgress, and broadcasts. Returns false when the tournament is not Paused.
    /// </summary>
    public async Task<bool> ResumeManualAsync(Guid tournamentId)
    {
        var lockObj = GetAdvanceLock(tournamentId);
        await lockObj.WaitAsync();
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

            var tournament = await context.Tournaments
                .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
                .FirstOrDefaultAsync(t => t.Id == tournamentId);

            if (tournament == null || tournament.Status != TournamentStatus.Paused) return false;

            var now = DateTime.UtcNow;
            _activeTimers.TryGetValue(tournamentId, out var state);
            state ??= SeedStateFromTournament(tournament);

            // Re-anchor preserving the frozen remaining: anchor = now - (duration - remaining).
            var currentBlind = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == state.CurrentLevel);
            if (currentBlind != null)
            {
                var levelDurationSeconds = currentBlind.DurationMinutes * 60;
                state.LevelStartedAt = TimerMath.AnchorForRemaining(levelDurationSeconds, state.TimeRemainingSeconds, now);
            }

            state.IsPaused = false;
            PersistFromState(context, tournament, state);
            tournament.Status = TournamentStatus.InProgress;
            if (!await TrySaveAsync(context, tournamentId, CancellationToken.None)) return false;

            _activeTimers[tournamentId] = state;

            await SyncState(tournamentId, state, tournament, CancellationToken.None);
            return true;
        }
        finally
        {
            lockObj.Release();
        }
    }

    private static TournamentTimerState SeedStateFromTournament(Domain.Entities.Tournament tournament) =>
        new()
        {
            TournamentId = tournament.Id,
            CurrentLevel = tournament.CurrentLevel,
            TimeRemainingSeconds = tournament.TimeRemainingSeconds ?? 0,
            IsPaused = tournament.Status == TournamentStatus.Paused,
            LevelStartedAt = tournament.CurrentLevelStartedAt ?? DateTime.UtcNow
        };

    public async Task<TimerStateSyncDto?> GetTimerStateAsync(Guid tournamentId)
    {
        if (!_activeTimers.TryGetValue(tournamentId, out var timerState))
            return null;

        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();
        var tournament = await context.Tournaments
            .Include(t => t.BlindLevels)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null) return null;

        var currentBlind = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == timerState.CurrentLevel);
        var nextBlind = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == timerState.CurrentLevel + 1);

        return new TimerStateSyncDto
        {
            Seq = DateTime.UtcNow.Ticks,
            TournamentId = tournamentId,
            Status = tournament.Status.ToString(),
            CurrentLevel = timerState.CurrentLevel,
            CurrentBlindLevel = currentBlind?.Order,
            NextBlindLevel = nextBlind?.Order,
            LevelEndsAtUtc = timerState.LevelStartedAt.AddMinutes(currentBlind?.DurationMinutes ?? 0),
            PausedRemainingSeconds = timerState.IsPaused ? timerState.TimeRemainingSeconds : null,
            ServerNowUtc = DateTime.UtcNow
        };
    }

    private class TournamentTimerState
    {
        public Guid TournamentId { get; set; }
        public int CurrentLevel { get; set; }
        public int TimeRemainingSeconds { get; set; }
        public bool IsPaused { get; set; }
        public DateTime LevelStartedAt { get; set; }
    }
}
