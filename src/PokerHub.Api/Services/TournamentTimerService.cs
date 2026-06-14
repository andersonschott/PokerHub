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
        var currentBlind = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == timerState.CurrentLevel);
        if (currentBlind == null) return;

        var levelDurationSeconds = currentBlind.DurationMinutes * 60;
        var elapsedSinceLevelStart = (int)(now - timerState.LevelStartedAt).TotalSeconds;
        var calculatedRemaining = levelDurationSeconds - elapsedSinceLevelStart;

        timerState.TimeRemainingSeconds = Math.Max(0, calculatedRemaining);

        if (timerState.TimeRemainingSeconds <= 0)
        {
            await AdvanceLevel(tournamentId, timerState, stoppingToken);
        }

        // Emit sync every 10 seconds or when requested, NO 1 second ticks anymore.
        if (timerState.TimeRemainingSeconds % 10 == 0)
        {
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

    private async Task AdvanceLevel(Guid tournamentId, TournamentTimerState timerState, CancellationToken stoppingToken)
    {
        var lockObj = GetAdvanceLock(tournamentId);
        if (!await lockObj.WaitAsync(0, stoppingToken))
            return;

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

            var tournament = await context.Tournaments
                .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
                .FirstOrDefaultAsync(t => t.Id == tournamentId, stoppingToken);

            if (tournament == null) return;

            var nextLevel = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == timerState.CurrentLevel + 1);

            if (nextLevel == null)
            {
                timerState.TimeRemainingSeconds = 60;
                timerState.LevelStartedAt = DateTime.UtcNow;
                return;
            }

            var now = DateTime.UtcNow;
            timerState.CurrentLevel = nextLevel.Order;
            timerState.TimeRemainingSeconds = nextLevel.DurationMinutes * 60;
            timerState.LevelStartedAt = now;

            tournament.CurrentLevel = nextLevel.Order;
            tournament.TimeRemainingSeconds = timerState.TimeRemainingSeconds;
            tournament.CurrentLevelStartedAt = now;
            await context.SaveChangesAsync(stoppingToken);

            await SyncState(tournamentId, timerState, tournament, stoppingToken);

            _logger.LogInformation("Tournament {TournamentId} advanced to level {Level}", tournamentId, nextLevel.Order);
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
            state.LevelStartedAt = DateTime.UtcNow.AddSeconds(state.TimeRemainingSeconds - (/* total level duration - no easy access here, approximated */ state.TimeRemainingSeconds)); // simplified resume
            // To properly resume, we should adjust LevelStartedAt so elapsed time matches previous elapsed time.
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
                    var levelDurationSeconds = currentBlind.DurationMinutes * 60;
                    var elapsed = levelDurationSeconds - state.TimeRemainingSeconds;
                    state.LevelStartedAt = DateTime.UtcNow.AddSeconds(-elapsed);
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
