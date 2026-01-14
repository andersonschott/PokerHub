using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.Tournament;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;
using PokerHub.Web.Hubs;

namespace PokerHub.Web.Services;

public class TournamentTimerService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IHubContext<TorneioHub> _hubContext;
    private readonly ILogger<TournamentTimerService> _logger;
    private readonly ConcurrentDictionary<Guid, TournamentTimerState> _activeTimers = new();
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _advanceLocks = new();

    // Cache control for RefreshActiveTimers
    private DateTime _lastRefresh = DateTime.MinValue;
    private static readonly TimeSpan RefreshInterval = TimeSpan.FromSeconds(5);

    // Persistence failure tracking
    private readonly ConcurrentDictionary<Guid, int> _persistFailureCounts = new();

    public TournamentTimerService(
        IServiceProvider serviceProvider,
        IHubContext<TorneioHub> hubContext,
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
                await Task.Delay(1000, stoppingToken); // Tick every second
            }
            catch (TaskCanceledException)
            {
                // Service is stopping
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in TournamentTimerService");
                await Task.Delay(5000, stoppingToken); // Wait before retry
            }
        }

        _logger.LogInformation("TournamentTimerService stopped");
    }

    private async Task ProcessActiveTimers(CancellationToken stoppingToken)
    {
        // Refresh only every 5 seconds, not every tick (reduce DB queries)
        if (DateTime.UtcNow - _lastRefresh > RefreshInterval)
        {
            await RefreshActiveTimers(stoppingToken);
            _lastRefresh = DateTime.UtcNow;
        }

        // Process each active timer
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

            // Only get InProgress tournaments
            var activeTournaments = await context.Tournaments
                .Where(t => t.Status == TournamentStatus.InProgress)
                .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
                .ToListAsync(stoppingToken);

            // Add new active tournaments
            foreach (var tournament in activeTournaments)
            {
                if (!_activeTimers.ContainsKey(tournament.Id))
                {
                    var currentBlind = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == tournament.CurrentLevel);
                    var nextBlind = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == tournament.CurrentLevel + 1);

                    // Use CurrentLevelStartedAt for anti-drift calculation
                    var levelStartedAt = tournament.CurrentLevelStartedAt ?? DateTime.UtcNow;

                    _activeTimers[tournament.Id] = new TournamentTimerState
                    {
                        TournamentId = tournament.Id,
                        CurrentLevel = tournament.CurrentLevel,
                        TimeRemainingSeconds = tournament.TimeRemainingSeconds ?? (currentBlind?.DurationMinutes ?? 15) * 60,
                        CurrentBlindLevel = currentBlind != null ? MapToDto(currentBlind) : null,
                        NextBlindLevel = nextBlind != null ? MapToDto(nextBlind) : null,
                        IsPaused = false,
                        LastTickTime = DateTime.UtcNow,
                        LevelStartedAt = levelStartedAt
                    };

                    _logger.LogInformation("Added timer for tournament {TournamentId}", tournament.Id);
                }
            }

            // Remove ALL tournaments that are not InProgress (finished, paused, cancelled)
            var activeIds = activeTournaments.Select(t => t.Id).ToHashSet();
            var toRemove = _activeTimers.Keys.Where(id => !activeIds.Contains(id)).ToList();
            foreach (var id in toRemove)
            {
                _activeTimers.TryRemove(id, out _);
                _advanceLocks.TryRemove(id, out _);  // Clean up locks
                _persistFailureCounts.TryRemove(id, out _);  // Clean up failure counts
                _logger.LogInformation("Removed timer for tournament {TournamentId}", id);
            }
        }
        catch (Exception ex) when (IsTransientError(ex))
        {
            // Transient database error - log and continue with cached timers
            _logger.LogWarning(ex, "Transient database error in RefreshActiveTimers, using cached timer state");
        }
    }

    /// <summary>
    /// Checks if an exception is a transient database error that may resolve on retry
    /// </summary>
    private static bool IsTransientError(Exception ex)
    {
        if (ex is Microsoft.Data.SqlClient.SqlException sqlEx)
        {
            // Common transient error numbers
            // -2: Timeout, 40197: Service busy, 40501: Service busy, 40613: Database unavailable
            // 49918: Insufficient resources, 49919: Too many requests, 49920: Too many requests
            var transientErrors = new[] { -2, 40197, 40501, 40613, 49918, 49919, 49920, 4060, 233, 10053, 10054, 10060, 40143, 64 };
            return transientErrors.Contains(sqlEx.Number);
        }

        // Check inner exceptions
        if (ex.InnerException != null)
            return IsTransientError(ex.InnerException);

        return false;
    }

    private async Task ProcessTimer(Guid tournamentId, TournamentTimerState timerState, CancellationToken stoppingToken)
    {
        if (timerState.IsPaused || timerState.CurrentBlindLevel == null)
            return;

        var now = DateTime.UtcNow;

        // ANTI-DRIFT: Calculate time remaining based on absolute reference time
        // This prevents drift accumulation over long tournament durations
        var levelDurationSeconds = timerState.CurrentBlindLevel.DurationMinutes * 60;
        var elapsedSinceLevelStart = (int)(now - timerState.LevelStartedAt).TotalSeconds;
        var calculatedRemaining = levelDurationSeconds - elapsedSinceLevelStart;

        // Use the calculated value, not incremental subtraction
        timerState.TimeRemainingSeconds = Math.Max(0, calculatedRemaining);
        timerState.LastTickTime = now;

        // Check if level should change
        if (timerState.TimeRemainingSeconds <= 0)
        {
            await AdvanceLevel(tournamentId, timerState, stoppingToken);
        }
        else
        {
            // Broadcast timer tick
            await TorneioHub.BroadcastTimerTick(
                _hubContext,
                tournamentId,
                timerState.TimeRemainingSeconds,
                timerState.CurrentLevel,
                timerState.CurrentBlindLevel);
        }

        // Persist time remaining to database every 10 seconds
        if (timerState.TimeRemainingSeconds % 10 == 0)
        {
            await PersistTimerState(tournamentId, timerState, stoppingToken);
        }
    }

    private async Task AdvanceLevel(Guid tournamentId, TournamentTimerState timerState, CancellationToken stoppingToken)
    {
        // Use lock to prevent race condition with ManualAdvanceLevel
        var lockObj = GetAdvanceLock(tournamentId);
        if (!await lockObj.WaitAsync(0, stoppingToken)) // Non-blocking try
        {
            // Another advance is in progress, skip this tick
            return;
        }

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

            var tournament = await context.Tournaments
                .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
                .FirstOrDefaultAsync(t => t.Id == tournamentId, stoppingToken);

            if (tournament == null) return;

            // Get next level
            var nextLevel = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == timerState.CurrentLevel + 1);

            if (nextLevel == null)
            {
                // No more levels - keep current level running
                _logger.LogWarning("Tournament {TournamentId} has no more blind levels", tournamentId);
                timerState.TimeRemainingSeconds = 60; // Give 1 minute buffer
                timerState.LevelStartedAt = DateTime.UtcNow; // Reset to prevent immediate re-trigger
                return;
            }

            var now = DateTime.UtcNow;

            // Advance to next level
            timerState.CurrentLevel = nextLevel.Order;
            timerState.TimeRemainingSeconds = nextLevel.DurationMinutes * 60;
            timerState.CurrentBlindLevel = MapToDto(nextLevel);
            timerState.LevelStartedAt = now; // CRITICAL: Reset level start time for anti-drift

            var futureLevel = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == nextLevel.Order + 1);
            timerState.NextBlindLevel = futureLevel != null ? MapToDto(futureLevel) : null;

            // Update database
            tournament.CurrentLevel = nextLevel.Order;
            tournament.TimeRemainingSeconds = timerState.TimeRemainingSeconds;
            tournament.CurrentLevelStartedAt = now;
            await context.SaveChangesAsync(stoppingToken);

            // Broadcast level change
            await TorneioHub.BroadcastLevelChanged(
                _hubContext,
                tournamentId,
                timerState.CurrentBlindLevel,
                timerState.NextBlindLevel);

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

                // Reset failure count on success
                _persistFailureCounts.TryRemove(tournamentId, out _);
            }
        }
        catch (Exception ex)
        {
            // Track consecutive failures
            var failureCount = _persistFailureCounts.AddOrUpdate(tournamentId, 1, (_, count) => count + 1);

            _logger.LogWarning(ex, "Failed to persist timer state for tournament {TournamentId} (attempt {Count})",
                tournamentId, failureCount);

            // After 5 consecutive failures, log as critical
            if (failureCount >= 5)
            {
                _logger.LogCritical("Persistent failure to save timer state for {TournamentId} - {Count} consecutive failures",
                    tournamentId, failureCount);
            }
        }
    }

    #region Public methods for manual control

    public async Task PauseTournamentAsync(Guid tournamentId)
    {
        if (_activeTimers.TryGetValue(tournamentId, out var state))
        {
            // Set paused FIRST to stop the tick loop immediately
            // This prevents race condition where tick loop persists a "round" value
            state.IsPaused = true;

            // Now persist the current time state safely
            await PersistTimerState(tournamentId, state, CancellationToken.None);

            // Broadcast with the exact time remaining so all clients sync
            await TorneioHub.BroadcastTournamentPaused(_hubContext, tournamentId, state.TimeRemainingSeconds);

            _logger.LogInformation("Tournament {TournamentId} paused at {TimeRemaining} seconds remaining",
                tournamentId, state.TimeRemainingSeconds);
        }
    }

    public void ResumeTournament(Guid tournamentId)
    {
        if (_activeTimers.TryGetValue(tournamentId, out var state))
        {
            state.IsPaused = false;
            state.LastTickTime = DateTime.UtcNow;
            _ = TorneioHub.BroadcastTournamentResumed(_hubContext, tournamentId);
        }
    }

    public async Task NotifyPrizePoolUpdate(Guid tournamentId, decimal prizePool, int totalRebuys, int totalAddons)
    {
        _logger.LogInformation("[TimerService] Broadcasting PrizePoolAtualizado to tournament {TournamentId}: PrizePool={PrizePool}, Rebuys={Rebuys}, Addons={Addons}",
            tournamentId, prizePool, totalRebuys, totalAddons);
        await TorneioHub.BroadcastPrizePoolUpdated(_hubContext, tournamentId, prizePool, totalRebuys, totalAddons);
    }

    public async Task NotifyPlayerEliminated(Guid tournamentId, Guid playerId, string playerName, int position)
    {
        _logger.LogInformation("[TimerService] Broadcasting JogadorEliminado to tournament {TournamentId}: Player={PlayerName}, Position={Position}",
            tournamentId, playerName, position);
        await TorneioHub.BroadcastPlayerEliminated(_hubContext, tournamentId, playerId, playerName, position);
    }

    public async Task NotifyTournamentFinished(Guid tournamentId)
    {
        _activeTimers.TryRemove(tournamentId, out _);
        await TorneioHub.BroadcastTournamentFinished(_hubContext, tournamentId);
    }

    public async Task NotifyPlayerUpdated(Guid tournamentId)
    {
        _logger.LogInformation("[TimerService] Broadcasting PlayerUpdated to tournament {TournamentId}", tournamentId);
        await TorneioHub.BroadcastPlayerUpdated(_hubContext, tournamentId);
    }

    /// <summary>
    /// Sync timer state after manual level advance (called after TournamentService.AdvanceToNextLevelAsync)
    /// </summary>
    public async Task ManualAdvanceLevel(Guid tournamentId)
    {
        // Use lock to prevent race condition with auto-advance
        var lockObj = GetAdvanceLock(tournamentId);
        await lockObj.WaitAsync(); // Blocking wait for manual advance

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

            var tournament = await context.Tournaments
                .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
                .FirstOrDefaultAsync(t => t.Id == tournamentId);

            if (tournament == null) return;

            // Use current level from DB (already advanced by AdvanceToNextLevelAsync)
            var currentLevel = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == tournament.CurrentLevel);
            if (currentLevel == null)
            {
                _logger.LogWarning("Tournament {TournamentId} current level {Level} not found", tournamentId, tournament.CurrentLevel);
                return;
            }

            var now = DateTime.UtcNow;
            var currentLevelDto = MapToDto(currentLevel);
            var nextLevel = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == tournament.CurrentLevel + 1);
            var nextLevelDto = nextLevel != null ? MapToDto(nextLevel) : null;

            // Update in-memory state if timer is active
            if (_activeTimers.TryGetValue(tournamentId, out var timerState))
            {
                timerState.CurrentLevel = tournament.CurrentLevel;
                timerState.TimeRemainingSeconds = tournament.TimeRemainingSeconds ?? currentLevel.DurationMinutes * 60;
                timerState.CurrentBlindLevel = currentLevelDto;
                timerState.NextBlindLevel = nextLevelDto;
                timerState.LastTickTime = now;
                timerState.LevelStartedAt = tournament.CurrentLevelStartedAt ?? now; // CRITICAL: Sync level start time
            }

            // Broadcast level change to all clients
            await TorneioHub.BroadcastLevelChanged(_hubContext, tournamentId, currentLevelDto, nextLevelDto);

            _logger.LogInformation("Tournament {TournamentId} synced to level {Level}", tournamentId, tournament.CurrentLevel);
        }
        finally
        {
            lockObj.Release();
        }
    }

    /// <summary>
    /// Sync timer state after manual level revert (called after TournamentService.GoToPreviousLevelAsync)
    /// </summary>
    public async Task ManualGoToPreviousLevel(Guid tournamentId)
    {
        // Reuses same logic as ManualAdvanceLevel - reads current state from DB and broadcasts
        await ManualAdvanceLevel(tournamentId);
    }

    #endregion

    private static BlindLevelDto MapToDto(Domain.Entities.BlindLevel bl)
    {
        return new BlindLevelDto(
            bl.Id,
            bl.Order,
            bl.SmallBlind,
            bl.BigBlind,
            bl.Ante,
            bl.DurationMinutes,
            bl.IsBreak,
            bl.BreakDescription
        );
    }

    private class TournamentTimerState
    {
        public Guid TournamentId { get; set; }
        public int CurrentLevel { get; set; }
        public int TimeRemainingSeconds { get; set; }
        public BlindLevelDto? CurrentBlindLevel { get; set; }
        public BlindLevelDto? NextBlindLevel { get; set; }
        public bool IsPaused { get; set; }
        public DateTime LastTickTime { get; set; }
        public DateTime LevelStartedAt { get; set; } // For anti-drift calculation
    }
}
