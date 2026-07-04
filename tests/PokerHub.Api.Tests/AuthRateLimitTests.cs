using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace PokerHub.Api.Tests;

/// <summary>
/// Brute-force protection for the anonymous /api/auth/* group.
/// Uses a dedicated factory with a tiny permit limit so the limiter trips
/// deterministically without coupling the assertion to the production value.
/// </summary>
public class AuthRateLimitTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AuthRateLimitTests(ApiFactory factory) => _factory = factory;

    private HttpClient ClientWithLimit(int permitLimit) =>
        _factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, cfg) =>
                cfg.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["RateLimit:Auth:PermitLimit"] = permitLimit.ToString(),
                    ["RateLimit:Auth:WindowSeconds"] = "60"
                }))).CreateClient();

    [Fact]
    public async Task Login_ExceedingPermitLimit_Returns429()
    {
        const int permitLimit = 3;
        var client = ClientWithLimit(permitLimit);

        // Fire one more request than the window allows, all from the same client.
        HttpResponseMessage? last = null;
        for (var i = 0; i <= permitLimit; i++)
        {
            last = await client.PostAsJsonAsync("/api/auth/login",
                new { Email = $"brute{i}@test.com", Password = "qualquer-senha!" });
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, last!.StatusCode);
    }

    [Fact]
    public async Task Login_WithinPermitLimit_IsNotThrottled()
    {
        const int permitLimit = 5;
        var client = ClientWithLimit(permitLimit);

        // Requests up to the limit must never be rejected with 429
        // (they return 401 for bad credentials, which is fine — just not throttled).
        for (var i = 0; i < permitLimit; i++)
        {
            var resp = await client.PostAsJsonAsync("/api/auth/login",
                new { Email = $"ok{i}@test.com", Password = "qualquer-senha!" });
            Assert.NotEqual(HttpStatusCode.TooManyRequests, resp.StatusCode);
        }
    }
}
