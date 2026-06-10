using System.Net;
using System.Net.Http.Json;

namespace PokerHub.Api.Tests;

public class AuthEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public AuthEndpointsTests(ApiFactory factory) => _client = factory.CreateClient();

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);

    private async Task<AuthResponse> RegisterAsync(string email)
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/register",
            new { Name = "Test User", Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    [Fact]
    public async Task Register_ThenLogin_ReturnsTokens()
    {
        await RegisterAsync("login@test.com");

        var resp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "login@test.com", Password = "Senha123!" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.False(string.IsNullOrEmpty(body!.AccessToken));
        Assert.False(string.IsNullOrEmpty(body.RefreshToken));
        Assert.Equal("login@test.com", body.Email);
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        await RegisterAsync("wrongpw@test.com");

        var resp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "wrongpw@test.com", Password = "errada!" });

        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Login_UnknownEmail_Returns401_WithoutLeakingEmailExistence()
    {
        // Must return 401 for an email that was never registered — same status as
        // wrong password — so callers cannot enumerate registered addresses.
        var resp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "nao-existe@test.com", Password = "qualquersenha!" });

        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
        // Body must use the same opaque message used for wrong-password so the two
        // paths are indistinguishable to the caller.
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("E-mail ou senha inválidos", body);
    }

    [Fact]
    public async Task Refresh_RotatesToken_OldOneStopsWorking()
    {
        var auth = await RegisterAsync("rotate@test.com");

        var first = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var rotated = await first.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotEqual(auth.RefreshToken, rotated!.RefreshToken);

        // o refresh antigo foi revogado na rotação
        var replay = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);

        // o novo continua válido
        var second = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = rotated.RefreshToken });
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
    }

    [Fact]
    public async Task Logout_RevokesRefreshToken()
    {
        var auth = await RegisterAsync("logout@test.com");

        var logout = await _client.PostAsJsonAsync("/api/auth/logout",
            new { RefreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var resp = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Refresh_UnknownToken_Returns401()
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = "token-fantasma" });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }
}
