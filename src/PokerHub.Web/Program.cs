using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MudBlazor.Services;
using PokerHub.Application;
using PokerHub.Domain.Entities;
using PokerHub.Infrastructure.Data;
using PokerHub.Web.Components;
using PokerHub.Web.Components.Account;
using PokerHub.Web.Hubs;
using PokerHub.Web.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Blazor Server configuration for long-running tournaments (4-8 hours)
builder.Services.AddServerSideBlazor(options =>
{
    // Keep circuit in memory for 10 minutes after disconnection (allows reconnection)
    options.DisconnectedCircuitRetentionPeriod = TimeSpan.FromMinutes(10);

    // Maximum disconnected circuits to retain in memory
    options.DisconnectedCircuitMaxRetained = 100;

    // Detailed errors only in development
    options.DetailedErrors = builder.Environment.IsDevelopment();
});

// MudBlazor
builder.Services.AddMudServices();

// SignalR with optimized settings for long-running connections
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
});

// Background Services
// DatabaseWarmupService runs first to wake up Azure SQL from sleep mode
builder.Services.AddHostedService<DatabaseWarmupService>();
builder.Services.AddSingleton<TournamentTimerService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<TournamentTimerService>());

// Application Services
builder.Services.AddApplicationServices();

builder.Services.AddCascadingAuthenticationState();
builder.Services.AddScoped<IdentityRedirectManager>();
builder.Services.AddScoped<AuthenticationStateProvider, IdentityRevalidatingAuthenticationStateProvider>();

builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = IdentityConstants.ApplicationScheme;
        options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
    })
    .AddIdentityCookies();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<PokerHubDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        // Enable retry on transient failures (connection timeouts, etc.)
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
        sqlOptions.CommandTimeout(60); // 60 seconds command timeout
    }));

builder.Services.AddDatabaseDeveloperPageExceptionFilter();

builder.Services.AddIdentityCore<User>(options =>
    {
        options.SignIn.RequireConfirmedAccount = true;
        options.Stores.SchemaVersion = IdentitySchemaVersions.Version3;
    })
    .AddEntityFrameworkStores<PokerHubDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services.AddSingleton<IEmailSender<User>, IdentityNoOpEmailSender>();

// Health Checks for monitoring
builder.Services.AddHealthChecks()
    .AddDbContextCheck<PokerHubDbContext>("database");

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseMigrationsEndPoint();
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();

app.UseAntiforgery();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

// SignalR Hub
app.MapHub<TorneioHub>("/hubs/torneio");

// Health Check endpoint for Azure monitoring
app.MapHealthChecks("/health");

// Add additional endpoints required by the Identity /Account Razor components.
app.MapAdditionalIdentityEndpoints();

app.Run();
