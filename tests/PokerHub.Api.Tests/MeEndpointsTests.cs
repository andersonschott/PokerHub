using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace PokerHub.Api.Tests;

public class MeEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public MeEndpointsTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private sealed record LeagueResponse(Guid Id, string Name, string InviteCode, string OrganizerId);
    private sealed record ContactResponse(string? PixKey, int? PixKeyType, string? Phone);
    private sealed record PlayerResponse(Guid Id, Guid LeagueId, string Name, string? Phone, string? PixKey);

    private async Task<(HttpClient client, AuthResponse auth)> RegisteredClientAsync(string email)
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/register",
            new { Name = "User " + email, Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var auth = (await resp.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return (client, auth);
    }

    private async Task<LeagueResponse> CreateLeagueAsync(HttpClient client, string name)
    {
        var resp = await client.PostAsJsonAsync("/api/leagues",
            new { Name = name, Description = "desc", BlockCheckInWithDebt = false });
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<LeagueResponse>())!;
    }

    [Fact]
    public async Task GetContact_WithoutToken_Returns401()
    {
        var anon = _factory.CreateClient();
        var resp = await anon.GetAsync("/api/me/contact");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task PutContact_ThenGet_RoundTrips()
    {
        var (client, _) = await RegisteredClientAsync("me-contact-roundtrip@test.com");

        // O usuário precisa ter ao menos um Player para que o contato persista.
        var (org, _) = await RegisteredClientAsync("me-contact-org@test.com");
        var league = await CreateLeagueAsync(org, "Liga RoundTrip");
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/leagues/join/{league.InviteCode}", null)).StatusCode);

        var put = await client.PutAsJsonAsync("/api/me/contact",
            new { PixKey = "me@pix.com", PixKeyType = (int?)1, Phone = "11999998888" });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var get = await client.GetFromJsonAsync<ContactResponse>("/api/me/contact");
        Assert.NotNull(get);
        Assert.Equal("me@pix.com", get!.PixKey);
        Assert.Equal("11999998888", get.Phone);
    }

    [Fact]
    public async Task PutContact_AppliesToAllLeaguesOfUser()
    {
        // Organizadores criam duas ligas; o membro entra nas duas (2 Players vinculados ao userId).
        var (orgA, _) = await RegisteredClientAsync("me-orgA@test.com");
        var leagueA = await CreateLeagueAsync(orgA, "Liga A");
        var (orgB, _) = await RegisteredClientAsync("me-orgB@test.com");
        var leagueB = await CreateLeagueAsync(orgB, "Liga B");

        var (member, _) = await RegisteredClientAsync("me-member@test.com");
        Assert.Equal(HttpStatusCode.OK, (await member.PostAsync($"/api/leagues/join/{leagueA.InviteCode}", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await member.PostAsync($"/api/leagues/join/{leagueB.InviteCode}", null)).StatusCode);

        var put = await member.PutAsJsonAsync("/api/me/contact",
            new { PixKey = "multi@pix.com", PixKeyType = (int?)null, Phone = "21988887777" });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        // Cada organizador lista os jogadores da sua liga e vê o contato do membro atualizado.
        var playersA = await orgA.GetFromJsonAsync<List<PlayerResponse>>($"/api/leagues/{leagueA.Id}/players-list");
        var playersB = await orgB.GetFromJsonAsync<List<PlayerResponse>>($"/api/leagues/{leagueB.Id}/players-list");
        Assert.Contains(playersA!, p => p.PixKey == "multi@pix.com" && p.Phone == "21988887777");
        Assert.Contains(playersB!, p => p.PixKey == "multi@pix.com" && p.Phone == "21988887777");
    }
}
