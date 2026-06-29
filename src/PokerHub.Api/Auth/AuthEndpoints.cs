using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PokerHub.Api.Common;
using PokerHub.Api.Email;
using PokerHub.Domain.Entities;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Api.Auth;

public static class AuthEndpoints
{
    /// <summary>Nome da política de rate limiting aplicada ao grupo anônimo /api/auth/*.</summary>
    public const string RateLimitPolicy = "auth";

    // Pre-computed ASP.NET Identity v3 password hash of a fixed dummy string.
    // Used to keep login response time constant regardless of whether the email
    // exists, preventing timing-based email enumeration attacks.
    // Generated once: new PasswordHasher<User>().HashPassword(new User(), "_dummy_pokerhub_")
    private const string DummyPasswordHash =
        "AQAAAAIAAYagAAAAEEFWQMScAYn6Hvde1Oc/NT2yu+yscgKOtA9m6/oSeV2d4ZL/iMe7WDrvfwobnKFoPA==";

    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth").AllowAnonymous()
            .RequireRateLimiting(RateLimitPolicy);

        group.MapPost("/register", async (
            RegisterRequest req,
            UserManager<User> userManager,
            JwtTokenService jwt,
            RefreshTokenService refreshSvc,
            PokerHubDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name)
                || string.IsNullOrWhiteSpace(req.Email)
                || string.IsNullOrWhiteSpace(req.Password))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["register"] = ["Name, Email e Password são obrigatórios."]
                });
            }

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

            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["login"] = ["Email e Password são obrigatórios."]
                });

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

        group.MapPost("/forgot-password", async (
            ForgotPasswordRequest req,
            UserManager<User> userManager,
            IPasswordResetEmailSender emailSender,
            IOptions<EmailOptions> emailOpts,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            // Resposta uniforme 200 (anti-enumeração). Só dispara email se a conta
            // existir E estiver ativa. Falha de SMTP é logada, nunca propagada.
            if (!string.IsNullOrWhiteSpace(req.Email))
            {
                var email = req.Email.Trim().ToLowerInvariant();
                var user = await userManager.FindByEmailAsync(email);
                if (user is not null && user.IsActive)
                {
                    var token = await userManager.GeneratePasswordResetTokenAsync(user);
                    var code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
                    var baseUrl = emailOpts.Value.AppBaseUrl.TrimEnd('/');
                    var link = $"{baseUrl}/redefinir-senha?email={Uri.EscapeDataString(user.Email!)}&code={code}";
                    try
                    {
                        await emailSender.SendPasswordResetAsync(user.Email!, user.Name, link, ct);
                    }
                    catch (Exception ex)
                    {
                        loggerFactory.CreateLogger("Auth.ForgotPassword")
                            .LogError(ex, "Falha ao enviar email de redefinição de senha.");
                    }
                }
            }

            return Results.Ok();
        });

        group.MapPost("/reset-password", async (
            ResetPasswordRequest req,
            UserManager<User> userManager,
            PokerHubDbContext db,
            CancellationToken ct) =>
        {
            const string generic = "Não foi possível redefinir a senha. Solicite um novo link.";
            Dictionary<string, string[]> Fail(params string[] msgs) => new() { ["resetPassword"] = msgs };

            if (string.IsNullOrWhiteSpace(req.Email)
                || string.IsNullOrWhiteSpace(req.Code)
                || string.IsNullOrWhiteSpace(req.NewPassword))
                return Results.ValidationProblem(Fail(generic));

            var user = await userManager.FindByEmailAsync(req.Email.Trim().ToLowerInvariant());
            if (user is null)
                return Results.ValidationProblem(Fail(generic)); // não vaza existência

            string token;
            try
            {
                token = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(req.Code));
            }
            catch (FormatException)
            {
                return Results.ValidationProblem(Fail(generic));
            }

            var result = await userManager.ResetPasswordAsync(user, token, req.NewPassword);
            if (!result.Succeeded)
            {
                var errors = result.Errors
                    .Select(e => e.Code switch
                    {
                        "InvalidToken" => "Link inválido ou expirado. Solicite um novo.",
                        "PasswordTooShort" => "Senha muito curta.",
                        "PasswordRequiresNonAlphanumeric" => "Senha deve conter ao menos um caractere especial.",
                        "PasswordRequiresDigit" => "Senha deve conter ao menos um número.",
                        "PasswordRequiresLower" => "Senha deve conter ao menos uma letra minúscula.",
                        "PasswordRequiresUpper" => "Senha deve conter ao menos uma letra maiúscula.",
                        "PasswordRequiresUniqueChars" => "Senha deve conter mais caracteres distintos.",
                        _ => generic
                    })
                    .ToArray();
                return Results.ValidationProblem(Fail(errors));
            }

            // Reset bem-sucedido: revoga todas as sessões ativas do usuário.
            var now = DateTime.UtcNow;
            var activeTokens = await db.RefreshTokens
                .Where(t => t.UserId == user.Id && t.RevokedAt == null)
                .ToListAsync(ct);
            foreach (var t in activeTokens) t.Revoke(null, now);
            await db.SaveChangesAsync(ct);

            return Results.NoContent();
        });

        app.MapPost("/api/auth/change-password", async (
            ChangePasswordRequest req,
            ClaimsPrincipal principal,
            UserManager<User> userManager) =>
        {
            if (string.IsNullOrWhiteSpace(req.CurrentPassword) || string.IsNullOrWhiteSpace(req.NewPassword))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["changePassword"] = ["Senha atual e nova senha são obrigatórias."]
                });
            }

            var user = await userManager.FindByIdAsync(principal.GetUserId());
            if (user is null) return Results.Unauthorized();

            var result = await userManager.ChangePasswordAsync(user, req.CurrentPassword, req.NewPassword);
            if (!result.Succeeded)
            {
                var errors = result.Errors
                    .Select(e => e.Code switch
                    {
                        "PasswordMismatch" => "Senha atual incorreta.",
                        "PasswordTooShort" => "Senha muito curta.",
                        "PasswordRequiresNonAlphanumeric" => "Senha deve conter ao menos um caractere especial.",
                        "PasswordRequiresDigit" => "Senha deve conter ao menos um número.",
                        "PasswordRequiresLower" => "Senha deve conter ao menos uma letra minúscula.",
                        "PasswordRequiresUpper" => "Senha deve conter ao menos uma letra maiúscula.",
                        "PasswordRequiresUniqueChars" => "Senha deve conter mais caracteres distintos.",
                        _ => "Requisição inválida."
                    })
                    .ToArray();

                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["changePassword"] = errors
                });
            }

            return Results.NoContent();
        })
        .WithTags("Auth")
        .RequireAuthorization();
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
