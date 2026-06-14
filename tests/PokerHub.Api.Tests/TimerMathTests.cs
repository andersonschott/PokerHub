using PokerHub.Api.Services;

namespace PokerHub.Api.Tests;

public class TimerMathTests
{
    // Fixed reference "now" so anchors are whole-second and the math is exact.
    private static readonly DateTime Now = new(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

    private static IReadOnlyList<(int Order, int DurationSeconds)> Levels(params int[] durations)
    {
        var list = new List<(int Order, int DurationSeconds)>(durations.Length);
        for (var i = 0; i < durations.Length; i++)
            list.Add((Order: i + 1, DurationSeconds: durations[i]));
        return list;
    }

    [Fact]
    public void Resolve_MultiLevelCatchUp_SkipsExpiredLevelsAndPreservesOverflow()
    {
        // Five 10-min levels; anchored 25 min ago while still on level 1.
        var levels = Levels(600, 600, 600, 600, 600);
        var anchor = Now.AddMinutes(-25);

        var result = TimerMath.Resolve(levels, currentOrder: 1, anchorStartUtc: anchor, nowUtc: Now);

        Assert.Equal(3, result.ResolvedOrder);
        Assert.Equal(300, result.RemainingSeconds);          // 5 min into level 3
        Assert.False(result.ReachedEnd);
        Assert.Equal(Now.AddSeconds(-300), result.NewAnchorUtc); // now - overflow, NOT now
        Assert.NotEqual(Now, result.NewAnchorUtc);
    }

    [Fact]
    public void Resolve_WithinCurrentLevel_StaysOnLevelWithExpectedRemaining()
    {
        var levels = Levels(600); // single 10-min level
        var anchor = Now.AddMinutes(-3);

        var result = TimerMath.Resolve(levels, currentOrder: 1, anchorStartUtc: anchor, nowUtc: Now);

        Assert.Equal(1, result.ResolvedOrder);
        Assert.Equal(420, result.RemainingSeconds); // 7 min left
        Assert.False(result.ReachedEnd);
        Assert.Equal(anchor, result.NewAnchorUtc);  // no re-anchor needed
    }

    [Fact]
    public void Resolve_ExactBoundary_AdvancesExactlyOneLevel()
    {
        // anchor elapsed == duration of level 1 exactly.
        var levels = Levels(600, 900, 600);
        var anchor = Now.AddSeconds(-600);

        var result = TimerMath.Resolve(levels, currentOrder: 1, anchorStartUtc: anchor, nowUtc: Now);

        Assert.Equal(2, result.ResolvedOrder);
        Assert.Equal(900, result.RemainingSeconds); // full duration of the next level
        Assert.False(result.ReachedEnd);
        Assert.Equal(Now, result.NewAnchorUtc);     // zero overflow into level 2
    }

    [Fact]
    public void Resolve_PastLastLevel_StaysOnLastWithReachedEndAndNoThrow()
    {
        var levels = Levels(600, 600, 600);
        var anchor = Now.AddHours(-5); // far beyond the total tournament length

        var result = TimerMath.Resolve(levels, currentOrder: 1, anchorStartUtc: anchor, nowUtc: Now);

        Assert.Equal(3, result.ResolvedOrder); // last level
        Assert.Equal(0, result.RemainingSeconds);
        Assert.True(result.ReachedEnd);
    }

    [Fact]
    public void AnchorForRemaining_ResumePreservesRemaining()
    {
        // Pausing with 7 min left, then resuming must keep 7 min left.
        var anchor = TimerMath.AnchorForRemaining(levelDurationSeconds: 600, remainingSeconds: 420, nowUtc: Now);
        Assert.Equal(Now.AddSeconds(-180), anchor); // elapsed = 600 - 420 = 180

        var result = TimerMath.Resolve(Levels(600), currentOrder: 1, anchorStartUtc: anchor, nowUtc: Now);
        Assert.Equal(1, result.ResolvedOrder);
        Assert.Equal(420, result.RemainingSeconds);
        Assert.False(result.ReachedEnd);
    }

    [Fact]
    public void Resolve_CatchUpAcrossUnequalDurations_LandsOnCorrectLevel()
    {
        // Durations 5min, 10min, 15min. Elapsed 18min from level 1 -> level 3, 3 min in.
        var levels = Levels(300, 600, 900);
        var anchor = Now.AddMinutes(-18); // 1080s; 300 + 600 = 900 consumed, 180 into level 3

        var result = TimerMath.Resolve(levels, currentOrder: 1, anchorStartUtc: anchor, nowUtc: Now);

        Assert.Equal(3, result.ResolvedOrder);
        Assert.Equal(720, result.RemainingSeconds);          // 900 - 180
        Assert.Equal(Now.AddSeconds(-180), result.NewAnchorUtc);
        Assert.False(result.ReachedEnd);
    }

    [Fact]
    public void Resolve_NegativeElapsed_TreatsAsFreshLevel()
    {
        // Anchor in the future (clock skew): clamp to a fresh level, no throw.
        var levels = Levels(600, 600);
        var anchor = Now.AddSeconds(120);

        var result = TimerMath.Resolve(levels, currentOrder: 1, anchorStartUtc: anchor, nowUtc: Now);

        Assert.Equal(1, result.ResolvedOrder);
        Assert.Equal(600, result.RemainingSeconds);
        Assert.False(result.ReachedEnd);
        Assert.Equal(Now, result.NewAnchorUtc);
    }

    [Fact]
    public void Resolve_StartingFromMiddleLevel_CatchesUpFromThatOrder()
    {
        // Already on level 2; 25 min elapsed should land on level 4 (10-min levels).
        var levels = Levels(600, 600, 600, 600, 600);
        var anchor = Now.AddMinutes(-25);

        var result = TimerMath.Resolve(levels, currentOrder: 2, anchorStartUtc: anchor, nowUtc: Now);

        Assert.Equal(4, result.ResolvedOrder);
        Assert.Equal(300, result.RemainingSeconds);
        Assert.False(result.ReachedEnd);
    }

    // -------------------------------------------------------------------------
    // Manual controls — re-anchor so the manual change survives the next auto Resolve (Flag B).
    // -------------------------------------------------------------------------

    [Fact]
    public void ResolveManualNext_AdvancesToNextLevelAnchoredAtNow()
    {
        var levels = Levels(600, 900, 600);

        var res = TimerMath.ResolveManualNext(levels, currentOrder: 1, Now);

        Assert.NotNull(res);
        Assert.Equal(2, res!.Value.ResolvedOrder);
        Assert.Equal(900, res.Value.RemainingSeconds); // full duration of level 2
        Assert.Equal(Now, res.Value.NewAnchorUtc);
        Assert.False(res.Value.ReachedEnd);
    }

    [Fact]
    public void ResolveManualNext_OnLastLevel_ReturnsNull()
    {
        var levels = Levels(600, 900);
        Assert.Null(TimerMath.ResolveManualNext(levels, currentOrder: 2, Now));
    }

    [Fact]
    public void ResolveManualNext_UnknownLevel_ReturnsNull()
    {
        var levels = Levels(600, 900);
        Assert.Null(TimerMath.ResolveManualNext(levels, currentOrder: 99, Now));
    }

    [Fact]
    public void ResolveManualNext_NoClobber_ReResolvingManualAnchorKeepsTheManualLevel()
    {
        // Level 1 is almost over (anchored 595s ago of a 600s level). The AUTOMATIC resolution would
        // stay on level 1 with 5s left; the bug (Flag B) was the auto tick reverting a manual advance.
        var levels = Levels(600, 900, 600);
        var nearlyExpiredAnchor = Now.AddSeconds(-595);
        var auto = TimerMath.Resolve(levels, currentOrder: 1, nearlyExpiredAnchor, Now);
        Assert.Equal(1, auto.ResolvedOrder); // proves the auto path would NOT have advanced on its own

        // Organizer hits next-level.
        var manual = TimerMath.ResolveManualNext(levels, currentOrder: 1, Now)!.Value;

        // The very next automatic tick re-resolves from the manual anchor/level at the SAME instant and
        // MUST stay on level 2 — it does not revert to level 1.
        var reresolved = TimerMath.Resolve(levels, manual.ResolvedOrder, manual.NewAnchorUtc, Now);
        Assert.Equal(2, reresolved.ResolvedOrder);
        Assert.Equal(900, reresolved.RemainingSeconds);
        Assert.False(reresolved.ReachedEnd);
    }

    [Fact]
    public void ResolveManualPrevious_GoesBackOneLevelAnchoredAtNow()
    {
        var levels = Levels(600, 900, 600);

        var res = TimerMath.ResolveManualPrevious(levels, currentOrder: 3, Now);

        Assert.NotNull(res);
        Assert.Equal(2, res!.Value.ResolvedOrder);
        Assert.Equal(900, res.Value.RemainingSeconds);
        Assert.Equal(Now, res.Value.NewAnchorUtc);
        Assert.False(res.Value.ReachedEnd);
    }

    [Fact]
    public void ResolveManualPrevious_OnFirstLevel_ReturnsNull()
    {
        var levels = Levels(600, 900);
        Assert.Null(TimerMath.ResolveManualPrevious(levels, currentOrder: 1, Now));
    }

    [Fact]
    public void ResolveManualPrevious_NoClobber_ReResolvingManualAnchorKeepsTheManualLevel()
    {
        // On level 3 with time elapsed; going back to level 2 must survive the next auto tick.
        var levels = Levels(600, 900, 600);
        var manual = TimerMath.ResolveManualPrevious(levels, currentOrder: 3, Now)!.Value;

        var reresolved = TimerMath.Resolve(levels, manual.ResolvedOrder, manual.NewAnchorUtc, Now);
        Assert.Equal(2, reresolved.ResolvedOrder);
        Assert.Equal(900, reresolved.RemainingSeconds);
    }

    [Fact]
    public void ResolveManualTimeRemaining_SetsRemainingAndReResolveYieldsIt()
    {
        var levels = Levels(600, 900, 600);

        var res = TimerMath.ResolveManualTimeRemaining(levels, currentOrder: 2, secondsRemaining: 120, Now);

        Assert.NotNull(res);
        Assert.Equal(2, res!.Value.ResolvedOrder);
        Assert.Equal(120, res.Value.RemainingSeconds);
        // anchor = now - (900 - 120) = now - 780
        Assert.Equal(Now.AddSeconds(-780), res.Value.NewAnchorUtc);

        // No-clobber: the next auto tick re-resolves the same 120s remaining on level 2.
        var reresolved = TimerMath.Resolve(levels, res.Value.ResolvedOrder, res.Value.NewAnchorUtc, Now);
        Assert.Equal(2, reresolved.ResolvedOrder);
        Assert.Equal(120, reresolved.RemainingSeconds);
    }

    [Fact]
    public void ResolveManualTimeRemaining_ClampsAboveDurationToFullLevel()
    {
        var levels = Levels(600, 900, 600);

        var res = TimerMath.ResolveManualTimeRemaining(levels, currentOrder: 1, secondsRemaining: 5000, Now);

        Assert.NotNull(res);
        Assert.Equal(600, res!.Value.RemainingSeconds); // clamped to the 600s level duration
        Assert.Equal(Now, res.Value.NewAnchorUtc);      // full level => anchor at now
    }

    [Fact]
    public void ResolveManualTimeRemaining_ClampsNegativeToZero()
    {
        var levels = Levels(600, 900, 600);

        var res = TimerMath.ResolveManualTimeRemaining(levels, currentOrder: 1, secondsRemaining: -42, Now);

        Assert.NotNull(res);
        Assert.Equal(0, res!.Value.RemainingSeconds);
        Assert.Equal(Now.AddSeconds(-600), res.Value.NewAnchorUtc); // elapsed == full duration
    }

    [Fact]
    public void ResolveManualTimeRemaining_UnknownLevel_ReturnsNull()
    {
        var levels = Levels(600, 900);
        Assert.Null(TimerMath.ResolveManualTimeRemaining(levels, currentOrder: 99, secondsRemaining: 100, Now));
    }
}
