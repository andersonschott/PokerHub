using PokerHub.Domain.Entities;

namespace PokerHub.Application.Tests;

public class LeagueTests
{
    [Fact]
    public void GenerateInviteCode_IsUrlSafe()
    {
        // Generate a large sample to cover the ~11.6% probability of '/' appearing
        // in a standard base64 output — 200 samples makes p(all safe) > 99.9999%.
        for (int i = 0; i < 200; i++)
        {
            var code = League.GenerateInviteCode();

            Assert.DoesNotContain('+', code);
            Assert.DoesNotContain('/', code);
            Assert.DoesNotContain('=', code);
            Assert.False(string.IsNullOrEmpty(code));
        }
    }

    [Fact]
    public void GenerateInviteCode_IsUnique()
    {
        var codes = Enumerable.Range(0, 50).Select(_ => League.GenerateInviteCode()).ToHashSet();
        Assert.Equal(50, codes.Count);
    }

    [Fact]
    public void RegenerateInviteCode_UpdatesInviteCode()
    {
        var league = new League { InviteCode = "ORIGINAL" };
        league.RegenerateInviteCode();
        Assert.NotEqual("ORIGINAL", league.InviteCode);
        Assert.DoesNotContain('+', league.InviteCode);
        Assert.DoesNotContain('/', league.InviteCode);
        Assert.DoesNotContain('=', league.InviteCode);
    }
}
