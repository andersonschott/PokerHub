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

        var now = DateTime.UtcNow;

        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

        var tournament = await context.Tournaments
            .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
            .FirstOrDefaultAsync(t => t.Id == tournamentId, stoppingToken);

        if (tournament == null) return;

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
            await AdvanceLevel(tournamentId, timerState, context, tournament, previousLevel, stoppingToken);
        }
        else if (!resolution.ReachedEnd && timerState.TimeRemainingSeconds % 10 == 0)
        {
            // Emit sync every 10 seconds, NO 1 second ticks. Suppressed once the tournament
            // has run past its last level to avoid spamming a frozen remaining=0.
            await PersistTimerState(tournamentId, timerState, stoppingToken);
            await SyncState(tournamentId, timerState, tournament, stoppingToken);
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

    private async Task AdvanceLevel(
        Guid tournamentId,
        TournamentTimerState timerState,
        PokerHubDbContext context,
        Domain.Entities.Tournament tournament,
        int previousLevel,
        CancellationToken stoppingToken)
    {
        // timerState was already advanced by TimerMath.Resolve in ProcessTimer; here we just persist
        // the resolved anchor/level and emit a single sync. Block on the lock so the persist always
        // happens (only contends with Pause/Resume, which is brief), keeping memory and DB in sync.
        var lockObj = GetAdvanceLock(tournamentId);
        await lockObj.WaitAsync(stoppingToken);

        try
        {
            tournament.CurrentLevel = timerState.CurrentLevel;
            tournament.TimeRemainingSeconds = timerState.TimeRemainingSeconds;
            tournament.CurrentLevelStartedAt = timerState.LevelStartedAt;
            await context.SaveChangesAsync(stoppingToken);
            _persistFailureCounts.TryRemove(tournamentId, out _);

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
        catch (Exception ex)
        {
            var failureCount = _persistFailureCounts.AddOrUpdate(tournamentId, 1, (_, count) => count + 1);
            if (failureCount >= 5)
                _logger.LogCritical(ex, "Persistent failure to advance level for {TournamentId}", tournamentId);
        }
        finally
        {
            lockObj.Release();
        }
    }

    private async Task PersistTimerState(Guid tournamentId, TournamentTimerState timerState, CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

            var tournament = await context.Tournaments.FindAsync(new object[] { tournamentId }, stoppingToken);
            if (tournament != null)
            {
                tournament.CurrentLevel = timerState.CurrentLevel;
                tournament.TimeRemainingSeconds = timerState.TimeRemainingSeconds;
                tournament.CurrentLevelStartedAt = timerState.LevelStartedAt;
                await context.SaveChangesAsync(stoppingToken);
                _persistFailureCounts.TryRemove(tournamentId, out _);
            }
        }
        catch (Exception ex)
        {
            var failureCount = _persistFailureCounts.AddOrUpdate(tournamentId, 1, (_, count) => count + 1);
            if (failureCount >= 5)
                _logger.LogCritical(ex, "Persistent failure to save timer state for {TournamentId}", tournamentId);
        }
    }

    public async Task PauseTournamentAsync(Guid tournamentId)
    {
        if (_activeTimers.TryGetValue(tournamentId, out var state))
        {
            state.IsPaused = true;
            await PersistTimerState(tournamentId, state, CancellationToken.None);

            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();
            var tournament = await context.Tournaments
                .Include(t => t.BlindLevels)
                .FirstOrDefaultAsync(t => t.Id == tournamentId);

            if (tournament != null)
                await SyncState(tournamentId, state, tournament, CancellationToken.None);
        }
    }

    public async Task ResumeTournament(Guid tournamentId)
    {
        if (_activeTimers.TryGetValue(tournamentId, out var state))
        {
            state.IsPaused = false;

            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();
            var tournament = await context.Tournaments
                .Include(t => t.BlindLevels)
                .FirstOrDefaultAsync(t => t.Id == tournamentId);

            if (tournament != null)
            {
                var currentBlind = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == state.CurrentLevel);
                if (currentBlind != null)
                {
                    // Re-anchor so the remaining time is preserved across the pause (anchor = now - elapsed).
                    var levelDurationSeconds = currentBlind.DurationMinutes * 60;
                    state.LevelStartedAt = TimerMath.AnchorForRemaining(
                        levelDurationSeconds, state.TimeRemainingSeconds, DateTime.UtcNow);
                    tournament.CurrentLevelStartedAt = state.LevelStartedAt;
                    await context.SaveChangesAsync();
                }

                await SyncState(tournamentId, state, tournament, CancellationToken.None);
            }
        }
    }

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
