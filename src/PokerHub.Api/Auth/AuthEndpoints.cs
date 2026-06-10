using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PokerHub.Domain.Entities;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Api.Auth;

public static class AuthEndpoints
{
    // Pre-computed ASP.NET Identity v3 password hash of a fixed dummy string.
    // Used to keep login response time constant regardless of whether the email
    // exists, preventing timing-based email enumeration attacks.
    // Generated once: new PasswordHasher<User>().HashPassword(new User(), "_dummy_pokerhub_")
    private const string DummyPasswordHash =
        "AQAAAAIAAYagAAAAEEFWQMScAYn6Hvde1Oc/NT2yu+yscgKOtA9m6/oSeV2d4ZL/iMe7WDrvfwobnKFoPA==";

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
            {
                // Map Identity error codes to opaque, localised messages so that
                // raw Identity descriptions (e.g. "Email 'x@y.com' is already taken.")
                // are never forwarded to the caller — preventing e-mail enumeration.
                var errors = result.Errors
                    .Select(e => e.Code switch
                    {
                        // Duplicate account — same vague message for both variants.
                        "DuplicateEmail" or "DuplicateUserName" =>
                            "E-mail ou nome de usuário já cadastrado.",
                        // Password policy violations — keep the code name so the
                        // client can show helpful hints without leaking existence.
                        "PasswordTooShort" =>
                            "Senha muito curta.",
                        "PasswordRequiresNonAlphanumeric" =>
                            "Senha deve conter ao menos um caractere especial.",
                        "PasswordRequiresDigit" =>
                            "Senha deve conter ao menos um número.",
                        "PasswordRequiresLower" =>
                            "Senha deve conter ao menos uma letra minúscula.",
                        "PasswordRequiresUpper" =>
                            "Senha deve conter ao menos uma letra maiúscula.",
                        "PasswordRequiresUniqueChars" =>
                            "Senha deve conter mais caracteres distintos.",
                        // Fallback for any future/unexpected Identity error code.
                        _ => "Requisição inválida."
                    })
                    .ToArray();

                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["register"] = errors
                });
            }

            return Results.Ok(await IssueTokensAsync(user, jwt, refreshSvc, db));
        });

        group.MapPost("/login", async (
            LoginRequest req,
            UserManager<User> userManager,
            IPasswordHasher<User> passwordHasher,
            JwtTokenService jwt,
            RefreshTokenService refreshSvc,
            PokerHubDbContext db) =>
        {
            const string invalid = "E-mail ou senha inválidos.";

            var user = await userManager.FindByEmailAsync(req.Email.Trim().ToLowerInvariant());

            if (user is null)
            {
                // Run a dummy hash verification to equalise response time and
                // prevent timing-based enumeration of registered e-mail addresses.
                // The result is always discarded — we always return 401 here.
                passwordHasher.VerifyHashedPassword(new User(), DummyPasswordHash, req.Password);
                return Results.Problem(detail: invalid, statusCode: 401);
            }

            if (!user.IsActive || !await userManager.CheckPasswordAsync(user, req.Password))
                return Results.Problem(detail: invalid, statusCode: 401);

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
