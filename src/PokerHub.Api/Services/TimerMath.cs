namespace PokerHub.Api.Services;

/// <summary>
/// Result of resolving the real current blind level from an absolute time anchor.
/// </summary>
/// <param name="ResolvedOrder">The blind level <c>Order</c> that is actually current at <c>nowUtc</c>.</param>
/// <param name="RemainingSeconds">Seconds left in the resolved level (0 when the tournament has run past its last level).</param>
/// <param name="NewAnchorUtc">The re-anchored <c>LevelStartedAt</c> that preserves the overflow (never simply <c>nowUtc</c> on a catch-up).</param>
/// <param name="ReachedEnd">True when elapsed time has consumed the last level.</param>
public readonly record struct TimerResolution(
    int ResolvedOrder,
    int RemainingSeconds,
    DateTime NewAnchorUtc,
    bool ReachedEnd);

/// <summary>
/// Pure timer math: time is ALWAYS derived from an absolute anchor (now - levelStartedAt),
/// never decremented. This makes the resolution survive restart / scale-to-zero without drift
/// and keeps it testable with no DbContext / SignalR dependency.
/// </summary>
public static class TimerMath
{
    /// <summary>
    /// Walks the level durations starting at <paramref name="currentOrder"/> and finds the level that
    /// is actually current given how much wall-clock time elapsed since the anchor. When more than one
    /// level has expired (e.g. the host slept across several levels) it performs a multi-level catch-up,
    /// re-anchoring so the overflow into the resolved level is preserved (never collapsing to "now").
    /// </summary>
    public static TimerResolution Resolve(
        IReadOnlyList<(int Order, int DurationSeconds)> levels,
        int currentOrder,
        DateTime anchorStartUtc,
        DateTime nowUtc)
    {
        if (levels is null || levels.Count == 0)
            return new TimerResolution(currentOrder, 0, nowUtc, ReachedEnd: true);

        var index = IndexOfOrder(levels, currentOrder);
        if (index < 0)
            return new TimerResolution(currentOrder, 0, nowUtc, ReachedEnd: true);

        // Elapsed seconds since the current level's anchor. Clamp negatives (clock skew / future anchor).
        var elapsed = (long)Math.Floor((nowUtc - anchorStartUtc).TotalSeconds);
        if (elapsed < 0) elapsed = 0;

        long consumed = 0; // sum of the durations of the levels fully completed before the resolved one
        for (var i = index; i < levels.Count; i++)
        {
            var duration = levels[i].DurationSeconds;
            var into = elapsed - consumed; // seconds already spent inside level i

            if (into < duration)
            {
                var remaining = (int)(duration - into);
                // Re-anchor preserving the overflow: anchor = now - (elapsed - consumed). NOT now.
                var newAnchor = nowUtc.AddSeconds(-(double)into);
                return new TimerResolution(levels[i].Order, remaining, newAnchor, ReachedEnd: false);
            }

            if (i == levels.Count - 1)
            {
                // Ran past the last level: stay on it, remaining 0, no exception.
                var newAnchor = nowUtc.AddSeconds(-(double)duration);
                return new TimerResolution(levels[i].Order, 0, newAnchor, ReachedEnd: true);
            }

            consumed += duration;
        }

        // Unreachable (loop always returns), kept for the compiler.
        var last = levels[^1];
        return new TimerResolution(last.Order, 0, nowUtc.AddSeconds(-(double)last.DurationSeconds), ReachedEnd: true);
    }

    /// <summary>
    /// Re-anchors a paused level on resume so the remaining time is preserved:
    /// anchor = now - (levelDuration - remaining). Pure, used by the resume / manual time controls.
    /// </summary>
    public static DateTime AnchorForRemaining(int levelDurationSeconds, int remainingSeconds, DateTime nowUtc)
    {
        var elapsed = levelDurationSeconds - remainingSeconds;
        if (elapsed < 0) elapsed = 0;
        return nowUtc.AddSeconds(-(double)elapsed);
    }

    /// <summary>
    /// Re-anchors the timer for a MANUAL "next level" jump. Returns <c>null</c> when there is no next
    /// level. The new anchor is exactly <paramref name="nowUtc"/>, so a subsequent <see cref="Resolve"/>
    /// at this instant stays on the chosen level with its full duration — i.e. the manual change is NOT
    /// clobbered by the automatic catch-up.
    /// </summary>
    public static TimerResolution? ResolveManualNext(
        IReadOnlyList<(int Order, int DurationSeconds)> levels,
        int currentOrder,
        DateTime nowUtc)
    {
        if (levels is null || levels.Count == 0) return null;

        var index = IndexOfOrder(levels, currentOrder);
        if (index < 0 || index + 1 >= levels.Count) return null;

        var next = levels[index + 1];
        return new TimerResolution(next.Order, next.DurationSeconds, nowUtc, ReachedEnd: false);
    }

    /// <summary>
    /// Re-anchors the timer for a MANUAL "previous level" jump. Returns <c>null</c> when already on the
    /// first level. The new anchor is exactly <paramref name="nowUtc"/> so the chosen level restarts with
    /// its full duration and the manual change survives the next <see cref="Resolve"/>.
    /// </summary>
    public static TimerResolution? ResolveManualPrevious(
        IReadOnlyList<(int Order, int DurationSeconds)> levels,
        int currentOrder,
        DateTime nowUtc)
    {
        if (levels is null || levels.Count == 0) return null;

        var index = IndexOfOrder(levels, currentOrder);
        if (index <= 0) return null;

        var prev = levels[index - 1];
        return new TimerResolution(prev.Order, prev.DurationSeconds, nowUtc, ReachedEnd: false);
    }

    /// <summary>
    /// Re-anchors the timer for a MANUAL time-remaining adjustment on the current level.
    /// <paramref name="secondsRemaining"/> is clamped to <c>[0, levelDuration]</c> and the anchor is
    /// computed (via <see cref="AnchorForRemaining"/>) so the next <see cref="Resolve"/> yields exactly
    /// that remaining instead of reverting to the previous automatic value. Returns <c>null</c> when the
    /// current level is unknown.
    /// </summary>
    public static TimerResolution? ResolveManualTimeRemaining(
        IReadOnlyList<(int Order, int DurationSeconds)> levels,
        int currentOrder,
        int secondsRemaining,
        DateTime nowUtc)
    {
        if (levels is null || levels.Count == 0) return null;

        var index = IndexOfOrder(levels, currentOrder);
        if (index < 0) return null;

        var duration = levels[index].DurationSeconds;
        var clamped = secondsRemaining;
        if (clamped < 0) clamped = 0;
        if (clamped > duration) clamped = duration;

        var anchor = AnchorForRemaining(duration, clamped, nowUtc);
        return new TimerResolution(currentOrder, clamped, anchor, ReachedEnd: false);
    }

    private static int IndexOfOrder(IReadOnlyList<(int Order, int DurationSeconds)> levels, int order)
    {
        for (var i = 0; i < levels.Count; i++)
            if (levels[i].Order == order)
                return i;
        return -1;
    }
}
