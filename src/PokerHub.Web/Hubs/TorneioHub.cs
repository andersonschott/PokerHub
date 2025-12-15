using Microsoft.AspNetCore.SignalR;
using PokerHub.Application.DTOs.Tournament;
using PokerHub.Application.Interfaces;

namespace PokerHub.Web.Hubs;

public class TorneioHub : Hub
{
    private readonly ITournamentService _tournamentService;
    private readonly ILogger<TorneioHub> _logger;

    public TorneioHub(ITournamentService tournamentService, ILogger<TorneioHub> logger)
    {
        _tournamentService = tournamentService;
        _logger = logger;
    }

    /// <summary>
    /// Client joins a tournament group to receive real-time updates
    /// </summary>
    public async Task JoinTorneio(Guid torneioId)
    {
        var groupName = GetGroupName(torneioId);
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("Client {ConnectionId} joined tournament {TorneioId}", Context.ConnectionId, torneioId);

        // Send current timer state to the newly connected client
        var timerState = await _tournamentService.GetTimerStateAsync(torneioId);
        if (timerState != null)
        {
            await Clients.Caller.SendAsync("TimerStateUpdated", timerState);
        }
    }

    /// <summary>
    /// Client leaves a tournament group
    /// </summary>
    public async Task LeaveTorneio(Guid torneioId)
    {
        var groupName = GetGroupName(torneioId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("Client {ConnectionId} left tournament {TorneioId}", Context.ConnectionId, torneioId);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client {ConnectionId} disconnected", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    private static string GetGroupName(Guid torneioId) => $"torneio-{torneioId}";

    #region Server-to-Client Methods (called from TournamentTimerService)

    /// <summary>
    /// Broadcast timer tick to all clients in a tournament group
    /// </summary>
    public static async Task BroadcastTimerTick(IHubContext<TorneioHub> hubContext, Guid torneioId, int secondsRemaining, int currentLevel, BlindLevelDto currentBlind)
    {
        var groupName = GetGroupName(torneioId);
        await hubContext.Clients.Group(groupName).SendAsync("TimerTick", new
        {
            SecondsRemaining = secondsRemaining,
            CurrentLevel = currentLevel,
            SmallBlind = currentBlind.SmallBlind,
            BigBlind = currentBlind.BigBlind,
            Ante = currentBlind.Ante,
            IsBreak = currentBlind.IsBreak,
            BreakDescription = currentBlind.BreakDescription
        });
    }

    /// <summary>
    /// Broadcast level change to all clients
    /// </summary>
    public static async Task BroadcastLevelChanged(IHubContext<TorneioHub> hubContext, Guid torneioId, BlindLevelDto newLevel, BlindLevelDto? nextLevel)
    {
        var groupName = GetGroupName(torneioId);
        await hubContext.Clients.Group(groupName).SendAsync("NivelAlterado", new
        {
            NewLevel = newLevel,
            NextLevel = nextLevel
        });
    }

    /// <summary>
    /// Broadcast tournament paused
    /// </summary>
    public static async Task BroadcastTournamentPaused(IHubContext<TorneioHub> hubContext, Guid torneioId)
    {
        var groupName = GetGroupName(torneioId);
        await hubContext.Clients.Group(groupName).SendAsync("TorneioPausado");
    }

    /// <summary>
    /// Broadcast tournament resumed
    /// </summary>
    public static async Task BroadcastTournamentResumed(IHubContext<TorneioHub> hubContext, Guid torneioId)
    {
        var groupName = GetGroupName(torneioId);
        await hubContext.Clients.Group(groupName).SendAsync("TorneioRetomado");
    }

    /// <summary>
    /// Broadcast player eliminated
    /// </summary>
    public static async Task BroadcastPlayerEliminated(IHubContext<TorneioHub> hubContext, Guid torneioId, Guid playerId, string playerName, int position)
    {
        var groupName = GetGroupName(torneioId);
        await hubContext.Clients.Group(groupName).SendAsync("JogadorEliminado", new
        {
            PlayerId = playerId,
            PlayerName = playerName,
            Position = position
        });
    }

    /// <summary>
    /// Broadcast prize pool updated (rebuy/addon)
    /// </summary>
    public static async Task BroadcastPrizePoolUpdated(IHubContext<TorneioHub> hubContext, Guid torneioId, decimal prizePool, int totalRebuys, int totalAddons)
    {
        var groupName = GetGroupName(torneioId);
        await hubContext.Clients.Group(groupName).SendAsync("PrizePoolAtualizado", new
        {
            PrizePool = prizePool,
            TotalRebuys = totalRebuys,
            TotalAddons = totalAddons
        });
    }

    /// <summary>
    /// Broadcast tournament finished
    /// </summary>
    public static async Task BroadcastTournamentFinished(IHubContext<TorneioHub> hubContext, Guid torneioId)
    {
        var groupName = GetGroupName(torneioId);
        await hubContext.Clients.Group(groupName).SendAsync("TorneioFinalizado");
    }

    /// <summary>
    /// Broadcast full timer state update
    /// </summary>
    public static async Task BroadcastTimerState(IHubContext<TorneioHub> hubContext, Guid torneioId, TimerStateDto timerState)
    {
        var groupName = GetGroupName(torneioId);
        await hubContext.Clients.Group(groupName).SendAsync("TimerStateUpdated", timerState);
    }

    #endregion
}
