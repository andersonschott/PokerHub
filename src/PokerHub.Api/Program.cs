using System.Globalization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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

builder.Services.AddHealthChecks()
    .AddDbContextCheck<PokerHubDbContext>("database");

var app = builder.Build();

app.MapHealthChecks("/health");

app.Run();

// Exposto para WebApplicationFactory nos testes de integração.
public partial class Program { }
