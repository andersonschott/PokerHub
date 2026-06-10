using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PokerHub.Domain.Entities;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Api.Auth;

public static class AuthEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth").AllowAnonymous();

        group.MapPost("/register", async (
            RegisterRequest req,
            UserManager<User> userManager,
            JwtTokenService jwt,
            RefreshTokenService refreshSvc,
            PokerHubDbContext db) =>
        {
            var email = req.Email.Trim().ToLowerInvariant();
            var user = new User { UserName = email, Email = email, Name = req.Name.Trim() };

            var result = await userManager.CreateAsync(user, req.Password);
            if (!result.Succeeded)
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["register"] = result.Errors.Select(e => e.Description).ToArray()
                });

            return Results.Ok(await IssueTokensAsync(user, jwt, refreshSvc, db));
        });

        group.MapPost("/login", async (
            LoginRequest req,
            UserManager<User> userManager,
            JwtTokenService jwt,
            RefreshTokenService refreshSvc,
            PokerHubDbContext db) =>
        {
            var user = await userManager.FindByEmailAsync(req.Email.Trim().ToLowerInvariant());
            if (user is null || !user.IsActive || !await userManager.CheckPasswordAsync(user, req.Password))
                return Results.Problem(detail: "E-mail ou senha inválidos.", statusCode: 401);

            return Results.Ok(await IssueTokensAsync(user, jwt, refreshSvc, db));
        });

        group.MapPost("/refresh", async (
            RefreshRequest req,
            UserManager<User> userManager,
            JwtTokenService jwt,
            RefreshTokenService refreshSvc,
            PokerHubDbContext db) =>
        {
            // Resposta uniforme para unknown/expirado/revogado — não vazar status
            // de tokens roubados para quem sonda o endpoint.
            const string invalid = "Refresh token inválido.";

            if (string.IsNullOrWhiteSpace(req.RefreshToken))
                return Results.Problem(detail: invalid, statusCode: 401);

            var hash = RefreshToken.HashToken(req.RefreshToken);
            var existing = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
            var now = DateTime.UtcNow;

            if (existing is null || !existing.IsActive(now))
                return Results.Problem(detail: invalid, statusCode: 401);

            var user = await userManager.FindByIdAsync(existing.UserId);
            if (user is null || !user.IsActive)
                return Results.Problem(detail: invalid, statusCode: 401);

            // Rotação: emite o novo antes para encadear o ponteiro, depois revoga o antigo.
            var (raw, entity) = refreshSvc.Issue(user.Id, now);
            db.RefreshTokens.Add(entity);
            existing.Revoke(entity.Id, now);
            await db.SaveChangesAsync();

            var access = jwt.GenerateAccessToken(user.Id, user.Name, user.Email!);
            return Results.Ok(new AuthResponse(access, raw, user.Id, user.Name, user.Email!));
        });

        group.MapPost("/logout", async (LogoutRequest req, PokerHubDbContext db) =>
        {
            // Best-effort: sempre 204, mesmo para token desconhecido (fire-and-forget).
            if (!string.IsNullOrWhiteSpace(req.RefreshToken))
            {
                var hash = RefreshToken.HashToken(req.RefreshToken);
                var existing = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
                if (existing is not null)
                {
                    existing.Revoke(null, DateTime.UtcNow);
                    await db.SaveChangesAsync();
                }
            }
            return Results.NoContent();
        });
    }

    private static async Task<AuthResponse> IssueTokensAsync(
        User user, JwtTokenService jwt, RefreshTokenService refreshSvc, PokerHubDbContext db)
    {
        var (raw, entity) = refreshSvc.Issue(user.Id, DateTime.UtcNow);
        db.RefreshTokens.Add(entity);
        await db.SaveChangesAsync();

        var access = jwt.GenerateAccessToken(user.Id, user.Name, user.Email!);
        return new AuthResponse(access, raw, user.Id, user.Name, user.Email!);
    }
}
