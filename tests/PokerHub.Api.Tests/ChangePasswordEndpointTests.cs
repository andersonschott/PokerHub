using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace PokerHub.Api.Tests;

public class ChangePasswordEndpointTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public ChangePasswordEndpointTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);

    private async Task<(HttpClient client, string email)> RegisteredClientAsync(string email)
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/register",
            new { Name = "User " + email, Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var auth = (await resp.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return (client, email);
    }

    [Fact]
    public async Task ChangePassword_CorrectCurrent_Returns204_AndNewPasswordWorks()
    {
        var (client, email) = await RegisteredClientAsync("changepw-ok@test.com");

        var change = await client.PostAsJsonAsync("/api/auth/change-password",
            new { CurrentPassword = "Senha123!", NewPassword = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);

        var anon = _factory.CreateClient();
        var oldLogin = await anon.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newLogin = await anon.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrent_Returns400()
    {
        var (client, _) = await RegisteredClientAsync("changepw-wrong@test.com");
        var change = await client.PostAsJsonAsync("/api/auth/change-password",
            new { CurrentPassword = "ErradaXYZ!", NewPassword = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.BadRequest, change.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WithoutToken_Returns401()
    {
        var anon = _factory.CreateClient();
        var change = await anon.PostAsJsonAsync("/api/auth/change-password",
            new { CurrentPassword = "Senha123!", NewPassword = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.Unauthorized, change.StatusCode);
    }
}
