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
        // Load active tournaments from database periodically
        await RefreshActiveTimers(stoppingToken);

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

    private async Task RefreshActiveTimers(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PokerHubDbContext>();

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

                _activeTimers[tournament.Id] = new TournamentTimerState
                {
                    TournamentId = tournament.Id,
                    CurrentLevel = tournament.CurrentLevel,
                    TimeRemainingSeconds = tournament.TimeRemainingSeconds ?? (currentBlind?.DurationMinutes ?? 15) * 60,
                    CurrentBlindLevel = currentBlind != null ? MapToDto(currentBlind) : null,
                    NextBlindLevel = nextBlind != null ? MapToDto(nextBlind) : null,
                    IsPaused = false,
                    LastTickTime = DateTime.UtcNow
                };

                _logger.LogInformation("Added timer for tournament {TournamentId}", tournament.Id);
            }
        }

        // Remove finished/paused tournaments
        var activeIds = activeTournaments.Select(t => t.Id).ToHashSet();
        var toRemove = _activeTimers.Keys.Where(id => !activeIds.Contains(id)).ToList();
        foreach (var id in toRemove)
        {
            _activeTimers.TryRemove(id, out _);
            _logger.LogInformation("Removed timer for tournament {TournamentId}", id);
        }
    }

    private async Task ProcessTimer(Guid tournamentId, TournamentTimerState timerState, CancellationToken stoppingToken)
    {
        if (timerState.IsPaused || timerState.CurrentBlindLevel == null)
            return;

        // Calculate elapsed time since last tick
        var now = DateTime.UtcNow;
        var elapsed = (int)(now - timerState.LastTickTime).TotalSeconds;
        timerState.LastTickTime = now;

        // Only process if at least 1 second has passed
        if (elapsed < 1) return;

        timerState.TimeRemainingSeconds -= elapsed;

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
            return;
        }

        // Advance to next level
        timerState.CurrentLevel = nextLevel.Order;
        timerState.TimeRemainingSeconds = nextLevel.DurationMinutes * 60;
        timerState.CurrentBlindLevel = MapToDto(nextLevel);

        var futureLevel = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == nextLevel.Order + 1);
        timerState.NextBlindLevel = futureLevel != null ? MapToDto(futureLevel) : null;

        // Update database
        tournament.CurrentLevel = nextLevel.Order;
        tournament.TimeRemainingSeconds = timerState.TimeRemainingSeconds;
        tournament.CurrentLevelStartedAt = DateTime.UtcNow;
        await context.SaveChangesAsync(stoppingToken);

        // Broadcast level change
        await TorneioHub.BroadcastLevelChanged(
            _hubContext,
            tournamentId,
            timerState.CurrentBlindLevel,
            timerState.NextBlindLevel);

        _logger.LogInformation("Tournament {TournamentId} advanced to level {Level}", tournamentId, nextLevel.Order);
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
                await context.SaveChangesAsync(stoppingToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist timer state for tournament {TournamentId}", tournamentId);
        }
    }

    #region Public methods for manual control

    public void PauseTournament(Guid tournamentId)
    {
        if (_activeTimers.TryGetValue(tournamentId, out var state))
        {
            state.IsPaused = true;
            _ = TorneioHub.BroadcastTournamentPaused(_hubContext, tournamentId);
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
        await TorneioHub.BroadcastPrizePoolUpdated(_hubContext, tournamentId, prizePool, totalRebuys, totalAddons);
    }

    public async Task NotifyPlayerEliminated(Guid tournamentId, Guid playerId, string playerName, int position)
    {
        await TorneioHub.BroadcastPlayerEliminated(_hubContext, tournamentId, playerId, playerName, position);
    }

    public async Task NotifyTournamentFinished(Guid tournamentId)
    {
        _activeTimers.TryRemove(tournamentId, out _);
        await TorneioHub.BroadcastTournamentFinished(_hubContext, tournamentId);
    }

    /// <summary>
    /// Sync timer state after manual level advance (called after TournamentService.AdvanceToNextLevelAsync)
    /// </summary>
    public async Task ManualAdvanceLevel(Guid tournamentId)
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
            timerState.LastTickTime = DateTime.UtcNow;
        }

        // Broadcast level change to all clients
        await TorneioHub.BroadcastLevelChanged(_hubContext, tournamentId, currentLevelDto, nextLevelDto);

        _logger.LogInformation("Tournament {TournamentId} synced to level {Level}", tournamentId, tournament.CurrentLevel);
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
    }
}
