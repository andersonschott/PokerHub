using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Entities;
using PokerHub.Web.Components.Account.Pages;
using PokerHub.Web.Components.Account.Pages.Manage;

namespace Microsoft.AspNetCore.Routing;

internal static class IdentityComponentsEndpointRouteBuilderExtensions
{
    // These endpoints are required by the Identity Razor components defined in the /Components/Account/Pages directory of this project.
    public static IEndpointConventionBuilder MapAdditionalIdentityEndpoints(this IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        var accountGroup = endpoints.MapGroup("/Account");

        accountGroup.MapPost("/PerformLogin", async (
            HttpContext context,
            [FromServices] SignInManager<User> signInManager,
            [FromServices] ILogger<User> logger,
            [FromForm] string email,
            [FromForm] string password,
            [FromForm] bool? rememberMe,
            [FromForm] string? returnUrl) =>
        {
            var result = await signInManager.PasswordSignInAsync(email, password, rememberMe ?? false, lockoutOnFailure: false);

            if (result.Succeeded)
            {
                logger.LogInformation("User logged in.");
                return TypedResults.LocalRedirect(string.IsNullOrEmpty(returnUrl) ? "~/" : $"~/{returnUrl.TrimStart('/')}");
            }
            else if (result.RequiresTwoFactor)
            {
                var query = QueryString.Create(new Dictionary<string, string?>
                {
                    ["returnUrl"] = returnUrl,
                    ["rememberMe"] = (rememberMe ?? false).ToString()
                });
                return TypedResults.LocalRedirect($"~/Account/LoginWith2fa{query}");
            }
            else if (result.IsLockedOut)
            {
                logger.LogWarning("User account locked out.");
                return TypedResults.LocalRedirect("~/Account/Lockout");
            }
            else
            {
                var query = QueryString.Create(new Dictionary<string, string?>
                {
                    ["ReturnUrl"] = returnUrl,
                    ["Error"] = "Email ou senha invalidos."
                });
                return TypedResults.LocalRedirect($"~/Account/Login{query}");
            }
        });

        accountGroup.MapPost("/PerformRegister", async (
            HttpContext context,
            [FromServices] UserManager<User> userManager,
            [FromServices] IUserStore<User> userStore,
            [FromServices] SignInManager<User> signInManager,
            [FromServices] IPlayerService playerService,
            [FromServices] ILogger<User> logger,
            [FromForm] string email,
            [FromForm] string password,
            [FromForm] string confirmPassword,
            [FromForm] string? returnUrl) =>
        {
            // Validate passwords match
            if (password != confirmPassword)
            {
                var query = QueryString.Create(new Dictionary<string, string?>
                {
                    ["ReturnUrl"] = returnUrl,
                    ["Error"] = "As senhas nao coincidem."
                });
                return TypedResults.LocalRedirect($"~/Account/Register{query}");
            }

            // Validate password length
            if (string.IsNullOrEmpty(password) || password.Length < 6)
            {
                var query = QueryString.Create(new Dictionary<string, string?>
                {
                    ["ReturnUrl"] = returnUrl,
                    ["Error"] = "A senha deve ter no minimo 6 caracteres."
                });
                return TypedResults.LocalRedirect($"~/Account/Register{query}");
            }

            var user = Activator.CreateInstance<User>();
            await userStore.SetUserNameAsync(user, email, CancellationToken.None);

            if (userStore is IUserEmailStore<User> emailStore)
            {
                await emailStore.SetEmailAsync(user, email, CancellationToken.None);
            }

            var result = await userManager.CreateAsync(user, password);

            if (!result.Succeeded)
            {
                var errorMessage = string.Join(", ", result.Errors.Select(e => e.Description));
                var query = QueryString.Create(new Dictionary<string, string?>
                {
                    ["ReturnUrl"] = returnUrl,
                    ["Error"] = errorMessage
                });
                return TypedResults.LocalRedirect($"~/Account/Register{query}");
            }

            logger.LogInformation("User created a new account with password.");

            var userId = await userManager.GetUserIdAsync(user);

            // Auto-link players with the same email
            var linkedCount = await playerService.LinkPlayersByEmailAsync(email, userId);
            if (linkedCount > 0)
            {
                logger.LogInformation("Linked {Count} existing player(s) to user {UserId}", linkedCount, userId);
            }

            // Sign in the user
            await signInManager.SignInAsync(user, isPersistent: false);
            return TypedResults.LocalRedirect(string.IsNullOrEmpty(returnUrl) ? "~/" : $"~/{returnUrl.TrimStart('/')}");
        });

        accountGroup.MapPost("/PerformExternalLogin", (
            HttpContext context,
            [FromServices] SignInManager<User> signInManager,
            [FromForm] string provider,
            [FromForm] string returnUrl) =>
        {
            IEnumerable<KeyValuePair<string, StringValues>> query =
            [
                new("ReturnUrl", returnUrl),
                new("Action", ExternalLogin.LoginCallbackAction)
            ];

            var redirectUrl = UriHelper.BuildRelative(
                context.Request.PathBase,
                "/Account/ExternalLogin",
                QueryString.Create(query));

            var properties = signInManager.ConfigureExternalAuthenticationProperties(provider, redirectUrl);
            return TypedResults.Challenge(properties, [provider]);
        });

        accountGroup.MapPost("/Logout", async (
            ClaimsPrincipal user,
            [FromServices] SignInManager<User> signInManager,
            [FromForm] string returnUrl) =>
        {
            await signInManager.SignOutAsync();
            // Ensure returnUrl is a valid local path
            var safeReturnUrl = string.IsNullOrEmpty(returnUrl) || returnUrl == "/"
                ? "~/"
                : $"~/{returnUrl.TrimStart('/')}";
            return TypedResults.LocalRedirect(safeReturnUrl);
        });

        accountGroup.MapPost("/PasskeyCreationOptions", async (
            HttpContext context,
            [FromServices] UserManager<User> userManager,
            [FromServices] SignInManager<User> signInManager,
            [FromServices] IAntiforgery antiforgery) =>
        {
            await antiforgery.ValidateRequestAsync(context);

            var user = await userManager.GetUserAsync(context.User);
            if (user is null)
            {
                return Results.NotFound($"Unable to load user with ID '{userManager.GetUserId(context.User)}'.");
            }

            var userId = await userManager.GetUserIdAsync(user);
            var userName = await userManager.GetUserNameAsync(user) ?? "User";
            var optionsJson = await signInManager.MakePasskeyCreationOptionsAsync(new()
            {
                Id = userId,
                Name = userName,
                DisplayName = userName
            });
            return TypedResults.Content(optionsJson, contentType: "application/json");
        });

        accountGroup.MapPost("/PasskeyRequestOptions", async (
            HttpContext context,
            [FromServices] UserManager<User> userManager,
            [FromServices] SignInManager<User> signInManager,
            [FromServices] IAntiforgery antiforgery,
            [FromQuery] string? username) =>
        {
            await antiforgery.ValidateRequestAsync(context);

            var user = string.IsNullOrEmpty(username) ? null : await userManager.FindByNameAsync(username);
            var optionsJson = await signInManager.MakePasskeyRequestOptionsAsync(user);
            return TypedResults.Content(optionsJson, contentType: "application/json");
        });

        var manageGroup = accountGroup.MapGroup("/Manage").RequireAuthorization();

        manageGroup.MapPost("/LinkExternalLogin", async (
            HttpContext context,
            [FromServices] SignInManager<User> signInManager,
            [FromForm] string provider) =>
        {
            // Clear the existing external cookie to ensure a clean login process
            await context.SignOutAsync(IdentityConstants.ExternalScheme);

            var redirectUrl = UriHelper.BuildRelative(
                context.Request.PathBase,
                "/Account/Manage/ExternalLogins",
                QueryString.Create("Action", ExternalLogins.LinkLoginCallbackAction));

            var properties = signInManager.ConfigureExternalAuthenticationProperties(provider, redirectUrl, signInManager.UserManager.GetUserId(context.User));
            return TypedResults.Challenge(properties, [provider]);
        });

        var loggerFactory = endpoints.ServiceProvider.GetRequiredService<ILoggerFactory>();
        var downloadLogger = loggerFactory.CreateLogger("DownloadPersonalData");

        manageGroup.MapPost("/DownloadPersonalData", async (
            HttpContext context,
            [FromServices] UserManager<User> userManager,
            [FromServices] AuthenticationStateProvider authenticationStateProvider) =>
        {
            var user = await userManager.GetUserAsync(context.User);
            if (user is null)
            {
                return Results.NotFound($"Unable to load user with ID '{userManager.GetUserId(context.User)}'.");
            }

            var userId = await userManager.GetUserIdAsync(user);
            downloadLogger.LogInformation("User with ID '{UserId}' asked for their personal data.", userId);

            // Only include personal data for download
            var personalData = new Dictionary<string, string>();
            var personalDataProps = typeof(User).GetProperties().Where(prop => Attribute.IsDefined(prop, typeof(PersonalDataAttribute)));
            foreach (var p in personalDataProps)
            {
                personalData.Add(p.Name, p.GetValue(user)?.ToString() ?? "null");
            }

            var logins = await userManager.GetLoginsAsync(user);
            foreach (var l in logins)
            {
                personalData.Add($"{l.LoginProvider} external login provider key", l.ProviderKey);
            }

            personalData.Add("Authenticator Key", (await userManager.GetAuthenticatorKeyAsync(user))!);
            var fileBytes = JsonSerializer.SerializeToUtf8Bytes(personalData);

            context.Response.Headers.TryAdd("Content-Disposition", "attachment; filename=PersonalData.json");
            return TypedResults.File(fileBytes, contentType: "application/json", fileDownloadName: "PersonalData.json");
        });

        return accountGroup;
    }
}
