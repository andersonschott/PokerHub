using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PokerHub.Api.Auth;
using PokerHub.Api.Expenses;
using PokerHub.Api.Jackpot;
using PokerHub.Api.Leagues;
using PokerHub.Api.Payments;
using PokerHub.Api.Players;
using PokerHub.Api.PrizeTables;
using PokerHub.Api.Rankings;
using PokerHub.Api.Seasons;
using PokerHub.Api.Tournaments;
using PokerHub.Application;
using PokerHub.Domain.Entities;
using PokerHub.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Cultura pt-BR (mesma configuração do PokerHub.Web)
var cultureInfo = new CultureInfo("pt-BR");
CultureInfo.DefaultThreadCurrentCulture = cultureInfo;
CultureInfo.DefaultThreadCurrentUICulture = cultureInfo;

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<PokerHubDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
        sqlOptions.CommandTimeout(60);
    }));

// Identity core sem cookies — a API é JWT-only. AddSignInManager fica de fora;
// senha é validada via UserManager.CheckPasswordAsync.
builder.Services.AddIdentityCore<User>(options =>
    {
        options.SignIn.RequireConfirmedAccount = false;
        options.Stores.SchemaVersion = IdentitySchemaVersions.Version3;
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<PokerHubDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddApplicationServices();
builder.Services.AddSingleton<PokerHub.Api.Services.TournamentTimerService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<PokerHub.Api.Services.TournamentTimerService>());

// --- JWT bearer ---
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
var jwtOpts = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration section is missing.");
if (string.IsNullOrWhiteSpace(jwtOpts.SigningKey) || jwtOpts.SigningKey.Length < 32)
    throw new InvalidOperationException("Jwt:SigningKey must be at least 32 characters.");

builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddSingleton<RefreshTokenService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        // Mantém os nomes originais das claims (sub, name, email) sem remap XML.
        opts.MapInboundClaims = false;
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOpts.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOpts.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOpts.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
            NameClaimType = "name"
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddOpenApi();
builder.Services.AddSignalR();

// CORS para o front (SWA em prod, Vite em dev usa proxy mas registramos por robustez).
// Origens vêm de config: "Cors:AllowedOrigins": ["http://localhost:5173", "https://<swa>.azurestaticapps.net"]
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddPolicy("web", policy =>
    policy.WithOrigins(allowedOrigins)
          .AllowAnyHeader()
          .AllowAnyMethod()
          .AllowCredentials()));

builder.Services.AddHealthChecks()
    .AddDbContextCheck<PokerHubDbContext>("database");

var app = builder.Build();

app.MapOpenApi(); // /openapi/v1.json — fonte para geração de tipos TS na Fase 1

if (allowedOrigins.Length > 0)
    app.UseCors("web");

app.UseAuthentication();
app.UseAuthorization();

AuthEndpoints.Map(app);
LeagueEndpoints.Map(app);
TournamentEndpoints.Map(app);
PaymentEndpoints.Map(app);
PlayerEndpoints.Map(app);
SeasonEndpoints.Map(app);
RankingEndpoints.Map(app);
PrizeTableEndpoints.Map(app);
JackpotEndpoints.Map(app);
ExpenseEndpoints.Map(app);

app.MapHub<PokerHub.Api.Hubs.TournamentHub>("/hub/tournaments");

app.MapHealthChecks("/health");

app.Run();

// Exposto para WebApplicationFactory nos testes de integração.
public partial class Program { }
