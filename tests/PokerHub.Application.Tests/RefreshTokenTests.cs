using PokerHub.Domain.Entities;

namespace PokerHub.Application.Tests;

public class RefreshTokenTests
{
    private static readonly DateTime Now = new(2026, 6, 10, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Issue_StoresHashNotRawToken()
    {
        var token = RefreshToken.Issue("user-1", "raw-secret", TimeSpan.FromDays(30), Now);

        Assert.NotEqual("raw-secret", token.TokenHash);
        Assert.Equal(RefreshToken.HashToken("raw-secret"), token.TokenHash);
        Assert.Equal("user-1", token.UserId);
        Assert.Equal(Now.AddDays(30), token.ExpiresAt);
    }

    [Fact]
    public void HashToken_IsDeterministic()
    {
        Assert.Equal(RefreshToken.HashToken("abc"), RefreshToken.HashToken("abc"));
        Assert.NotEqual(RefreshToken.HashToken("abc"), RefreshToken.HashToken("abd"));
    }

    [Fact]
    public void IsActive_FalseWhenExpired()
    {
        var token = RefreshToken.Issue("user-1", "raw", TimeSpan.FromDays(1), Now);

        Assert.True(token.IsActive(Now.AddHours(23)));
        Assert.False(token.IsActive(Now.AddDays(2)));
    }

    [Fact]
    public void Revoke_SetsRevokedAtAndChainsReplacement()
    {
        var token = RefreshToken.Issue("user-1", "raw", TimeSpan.FromDays(30), Now);
        var replacementId = Guid.NewGuid();

        token.Revoke(replacementId, Now.AddMinutes(5));

        Assert.True(token.IsRevoked);
        Assert.Equal(Now.AddMinutes(5), token.RevokedAt);
        Assert.Equal(replacementId, token.ReplacedByTokenId);
        Assert.False(token.IsActive(Now.AddMinutes(6)));
    }

    [Fact]
    public void Revoke_IsIdempotent()
    {
        var token = RefreshToken.Issue("user-1", "raw", TimeSpan.FromDays(30), Now);
        token.Revoke(null, Now.AddMinutes(5));
        token.Revoke(Guid.NewGuid(), Now.AddMinutes(10));

        Assert.Equal(Now.AddMinutes(5), token.RevokedAt);
        Assert.Null(token.ReplacedByTokenId);
    }
}
