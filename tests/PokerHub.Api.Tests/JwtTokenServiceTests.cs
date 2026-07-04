using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Options;
using PokerHub.Api.Auth;

namespace PokerHub.Api.Tests;

public class JwtTokenServiceTests
{
    private static JwtTokenService CreateSut() => new(Options.Create(new JwtOptions
    {
        Issuer = "pokerhub-test",
        Audience = "pokerhub-api-test",
        SigningKey = "test-signing-key-with-32-plus-characters!",
        AccessTokenLifetimeMinutes = 15
    }));

    [Fact]
    public void GenerateAccessToken_ContainsExpectedClaims()
    {
        var sut = CreateSut();

        var jwt = sut.GenerateAccessToken("user-123", "Anderson", "a@a.com");

        var token = new JwtSecurityTokenHandler().ReadJwtToken(jwt);
        Assert.Equal("pokerhub-test", token.Issuer);
        Assert.Equal("user-123", token.Claims.Single(c => c.Type == "sub").Value);
        Assert.Equal("Anderson", token.Claims.Single(c => c.Type == "name").Value);
        Assert.Equal("a@a.com", token.Claims.Single(c => c.Type == "email").Value);
        Assert.NotEmpty(token.Claims.Single(c => c.Type == "jti").Value);
    }

    [Fact]
    public void GenerateAccessToken_ExpiresInConfiguredLifetime()
    {
        var sut = CreateSut();
        var before = DateTime.UtcNow;

        var jwt = sut.GenerateAccessToken("user-123", "Anderson", "a@a.com");

        var token = new JwtSecurityTokenHandler().ReadJwtToken(jwt);
        Assert.InRange(token.ValidTo, before.AddMinutes(14), before.AddMinutes(16));
    }

    [Fact]
    public void RefreshTokenService_GeneratesUniqueUrlSafeTokens()
    {
        var refreshSvc = new RefreshTokenService(Options.Create(new JwtOptions
        {
            Issuer = "x", Audience = "y",
            SigningKey = "test-signing-key-with-32-plus-characters!",
            RefreshTokenLifetimeDays = 30
        }));

        var (raw1, entity1) = refreshSvc.Issue("user-1", DateTime.UtcNow);
        var (raw2, _) = refreshSvc.Issue("user-1", DateTime.UtcNow);

        Assert.NotEqual(raw1, raw2);
        Assert.DoesNotContain('+', raw1);
        Assert.DoesNotContain('/', raw1);
        Assert.DoesNotContain('=', raw1);
        Assert.Equal(PokerHub.Domain.Entities.RefreshToken.HashToken(raw1), entity1.TokenHash);
    }
}
