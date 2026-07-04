using System.Net;

namespace PokerHub.Api.Tests;

public class HealthAndDocsTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public HealthAndDocsTests(ApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Health_ReturnsHealthy()
    {
        var resp = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("Healthy", await resp.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task OpenApiDocument_IsServed()
    {
        var resp = await _client.GetAsync("/openapi/v1.json");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadAsStringAsync();
        Assert.Contains("/api/auth/login", json);
        Assert.Contains("/api/leagues", json);
    }
}
