using Microsoft.Extensions.DependencyInjection;
using PokerHub.Application.Interfaces;
using PokerHub.Application.Services;

namespace PokerHub.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<ILeagueService, LeagueService>();
        services.AddScoped<IPlayerService, PlayerService>();
        services.AddScoped<ITournamentService, TournamentService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IRankingService, RankingService>();
        services.AddScoped<ITournamentExpenseService, TournamentExpenseService>();

        return services;
    }
}
