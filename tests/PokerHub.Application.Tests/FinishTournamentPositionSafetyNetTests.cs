using PokerHub.Application.Services;
using PokerHub.Domain.Entities;

namespace PokerHub.Application.Tests;

public class FinishTournamentPositionSafetyNetTests
{
    private static TournamentPlayer Player(
        bool isCheckedIn = true,
        decimal prize = 0,
        int? position = null)
    {
        return new TournamentPlayer
        {
            Id = Guid.NewGuid(),
            TournamentId = Guid.NewGuid(),
            PlayerId = Guid.NewGuid(),
            IsCheckedIn = isCheckedIn,
            Prize = prize,
            Position = position
        };
    }

    [Fact]
    public void NoChanges_WhenAllPrizedHavePositions()
    {
        var players = new[]
        {
            Player(prize: 500, position: 1),
            Player(prize: 200, position: 2),
            Player(prize: 0, position: 3)
        };

        var fixedIds = FinishTournamentPositionSafetyNet.AssignMissingPositions(players);

        Assert.Empty(fixedIds);
        Assert.Equal(1, players[0].Position);
        Assert.Equal(2, players[1].Position);
        Assert.Equal(3, players[2].Position);
    }

    [Fact]
    public void AssignsPositionOne_WhenWinnerIsMissing()
    {
        var winner = Player(prize: 500); // Position=null
        var runnerUp = Player(prize: 200, position: 2);
        var third = Player(prize: 0, position: 3);

        var fixedIds = FinishTournamentPositionSafetyNet.AssignMissingPositions(
            new[] { winner, runnerUp, third });

        Assert.Single(fixedIds);
        Assert.Equal(winner.PlayerId, fixedIds[0]);
        Assert.Equal(1, winner.Position);
        Assert.Equal(2, runnerUp.Position);
        Assert.Equal(3, third.Position);
    }

    [Fact]
    public void SkipsUsedPositions_AndFillsGaps()
    {
        // Positions 1 and 3 taken; next free is 2.
        var needsPosition = Player(prize: 100); // Position=null
        var first = Player(prize: 500, position: 1);
        var third = Player(prize: 50, position: 3);

        var fixedIds = FinishTournamentPositionSafetyNet.AssignMissingPositions(
            new[] { needsPosition, first, third });

        Assert.Single(fixedIds);
        Assert.Equal(2, needsPosition.Position);
    }

    [Fact]
    public void AssignsMultiple_InSequence()
    {
        var a = Player(prize: 500); // null
        var b = Player(prize: 200); // null
        var c = Player(prize: 100); // null

        var fixedIds = FinishTournamentPositionSafetyNet.AssignMissingPositions(
            new[] { a, b, c });

        Assert.Equal(3, fixedIds.Count);
        Assert.Equal(1, a.Position);
        Assert.Equal(2, b.Position);
        Assert.Equal(3, c.Position);
    }

    [Fact]
    public void IgnoresPlayers_NotCheckedIn()
    {
        var notCheckedIn = Player(isCheckedIn: false, prize: 500);

        var fixedIds = FinishTournamentPositionSafetyNet.AssignMissingPositions(
            new[] { notCheckedIn });

        Assert.Empty(fixedIds);
        Assert.Null(notCheckedIn.Position);
    }

    [Fact]
    public void IgnoresPlayers_WithZeroPrize()
    {
        var zeroPrize = Player(prize: 0); // Position=null, Prize=0 → not winner
        var withPrize = Player(prize: 100, position: 1);

        var fixedIds = FinishTournamentPositionSafetyNet.AssignMissingPositions(
            new[] { zeroPrize, withPrize });

        Assert.Empty(fixedIds);
        Assert.Null(zeroPrize.Position);
    }

    [Fact]
    public void WinnerWithPositionAlreadyTaken_GetsNextFreeSlot()
    {
        // Simulates the exact user-reported scenario: eliminated players fill 2,3,4,
        // and a prized "winner" is missing Position. Should get Position=1.
        var elim2 = Player(prize: 200, position: 2);
        var elim3 = Player(prize: 100, position: 3);
        var elim4 = Player(prize: 0, position: 4);
        var winner = Player(prize: 700); // Position=null — the bug scenario

        var fixedIds = FinishTournamentPositionSafetyNet.AssignMissingPositions(
            new[] { elim2, elim3, elim4, winner });

        Assert.Single(fixedIds);
        Assert.Equal(1, winner.Position);
    }
}
