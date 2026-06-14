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
    /// anchor = now - (levelDuration - remaining). Pure, used by ResumeTournament.
    /// </summary>
    public static DateTime AnchorForRemaining(int levelDurationSeconds, int remainingSeconds, DateTime nowUtc)
    {
        var elapsed = levelDurationSeconds - remainingSeconds;
        if (elapsed < 0) elapsed = 0;
        return nowUtc.AddSeconds(-(double)elapsed);
    }

    private static int IndexOfOrder(IReadOnlyList<(int Order, int DurationSeconds)> levels, int order)
    {
        for (var i = 0; i < levels.Count; i++)
            if (levels[i].Order == order)
                return i;
        return -1;
    }
}
