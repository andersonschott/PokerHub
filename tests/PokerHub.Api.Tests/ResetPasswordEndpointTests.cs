using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;

namespace PokerHub.Api.Tests;

public class ResetPasswordEndpointTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public ResetPasswordEndpointTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private CapturingEmailSender Sender => _factory.Services.GetRequiredService<CapturingEmailSender>();

    private async Task<AuthResponse> RegisterAsync(string email)
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/register",
            new { Name = "User " + email, Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    /// <summary>Solicita o reset e extrai o `code` do link capturado pelo fake sender.</summary>
    private async Task<string> RequestCodeAsync(string email)
    {
        var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/api/auth/forgot-password", new { Email = email });
        var link = Sender.Sent.Last(e => e.ToEmail == email).ResetLink;
        return link.Split("code=")[1]; // code é o último parâmetro e é URL-safe
    }

    [Fact]
    public async Task ResetPassword_ValidCode_ChangesPassword_AndRevokesOldRefreshTokens()
    {
        var email = "reset-ok@test.com";
        var reg = await RegisterAsync(email);
        var code = await RequestCodeAsync(email);

        var anon = _factory.CreateClient();
        var reset = await anon.PostAsJsonAsync("/api/auth/reset-password",
            new { Email = email, Code = code, NewPassword = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);

        // Senha antiga falha, nova funciona.
        var oldLogin = await anon.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newLogin = await anon.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);

        // O refresh token emitido no register foi revogado pelo reset.
        var refresh = await anon.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = reg.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_InvalidToken_Returns400()
    {
        var email = "reset-badtoken@test.com";
        await RegisterAsync(email);
        // base64url válido, mas não é um token do Identity → ResetPasswordAsync falha (InvalidToken).
        var bogus = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
            System.Text.Encoding.UTF8.GetBytes("nao-e-um-token-valido"));

        var anon = _factory.CreateClient();
        var reset = await anon.PostAsJsonAsync("/api/auth/reset-password",
            new { Email = email, Code = bogus, NewPassword = "NovaSenha456!" });

        Assert.Equal(HttpStatusCode.BadRequest, reset.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_MalformedCode_Returns400_NotServerError()
    {
        var email = "reset-malformed@test.com";
        await RegisterAsync(email);

        var anon = _factory.CreateClient();
        var reset = await anon.PostAsJsonAsync("/api/auth/reset-password",
            new { Email = email, Code = "!!!nao-base64url!!!", NewPassword = "NovaSenha456!" });

        Assert.Equal(HttpStatusCode.BadRequest, reset.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_UnknownEmail_Returns400()
    {
        var anon = _factory.CreateClient();
        var reset = await anon.PostAsJsonAsync("/api/auth/reset-password",
            new { Email = "ninguem@test.com", Code = "qualquer", NewPassword = "NovaSenha456!" });

        Assert.Equal(HttpStatusCode.BadRequest, reset.StatusCode);
    }
}
