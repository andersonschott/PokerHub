using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using MudBlazor;
using MudBlazor.Services;
using PokerHub.Application.Interfaces;
using PokerHub.Client;
using PokerHub.Client.Services;
using PokerHub.Client.Services.Http;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// HTTP Client com base address da API
var apiBaseUrl = builder.Configuration["ApiBaseUrl"] ?? builder.HostEnvironment.BaseAddress;
builder.Services.AddScoped(sp =>
{
    var authService = sp.GetRequiredService<AuthStateService>();
    var handler = new AuthTokenHandler(authService)
    {
        InnerHandler = new HttpClientHandler()
    };
    return new HttpClient(handler) { BaseAddress = new Uri(apiBaseUrl) };
});

// Auth state
builder.Services.AddSingleton<AuthStateService>();
builder.Services.AddSingleton<AuthenticationStateProvider>(sp => sp.GetRequiredService<AuthStateService>());
builder.Services.AddAuthorizationCore();

// MudBlazor
builder.Services.AddMudServices(config =>
{
    config.SnackbarConfiguration.PositionClass = Defaults.Classes.Position.BottomCenter;
    config.SnackbarConfiguration.ShowTransitionDuration = 200;
    config.SnackbarConfiguration.HideTransitionDuration = 200;
});

// HTTP Services (implementações das interfaces do Shared)
builder.Services.AddScoped<ILeagueService, HttpLeagueService>();
builder.Services.AddScoped<ITournamentService, HttpTournamentService>();
builder.Services.AddScoped<IPlayerService, HttpPlayerService>();
builder.Services.AddScoped<IPaymentService, HttpPaymentService>();
builder.Services.AddScoped<IRankingService, HttpRankingService>();
builder.Services.AddScoped<ITournamentExpenseService, HttpExpenseService>();
builder.Services.AddScoped<ISeasonService, HttpSeasonService>();
builder.Services.AddScoped<IJackpotService, HttpJackpotService>();
builder.Services.AddScoped<IPrizeTableService, HttpPrizeTableService>();

// Serviços offline
builder.Services.AddScoped<IndexedDbService>();

await builder.Build().RunAsync();
