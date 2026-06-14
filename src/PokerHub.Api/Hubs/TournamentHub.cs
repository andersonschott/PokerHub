using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;

namespace PokerHub.Api.Hubs;

public class TournamentHub : Hub
{
    private readonly PokerHub.Api.Services.TournamentTimerService _timerService;

    public TournamentHub(PokerHub.Api.Services.TournamentTimerService timerService)
    {
        _timerService = timerService;
    }

    public async Task JoinTorneio(Guid id)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tournament_{id}");
        
        var state = await _timerService.GetTimerStateAsync(id);
        if (state != null)
        {
            await Clients.Caller.SendAsync("TimerStateSync", state);
        }
    }
}
