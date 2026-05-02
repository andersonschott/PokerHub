using PokerHub.Domain.Entities;

namespace PokerHub.Application.Services;

/// <summary>
/// Pure helper: assigns missing Position to checked-in players with Prize &gt; 0.
/// Stateless — fully unit-testable without EF.
/// </summary>
internal static class FinishTournamentPositionSafetyNet
{
    /// <summary>
    /// Mutates <paramref name="players"/> in place: for each checked-in player with
    /// Prize &gt; 0 and Position == null, assigns the next free Position (lowest unused
    /// integer starting from 1). Returns the PlayerIds that were assigned.
    /// </summary>
    internal static List<Guid> AssignMissingPositions(IEnumerable<TournamentPlayer> players)
    {
        var all = players.ToList();

        var prized = all
            .Where(p => p.IsCheckedIn && p.Prize > 0 && p.Position == null)
            .ToList();

        if (prized.Count == 0) return [];

        var used = all
            .Where(p => p.Position.HasValue)
            .Select(p => p.Position!.Value)
            .ToHashSet();

        var next = 1;
        var fixedIds = new List<Guid>(prized.Count);
        foreach (var p in prized)
        {
            while (used.Contains(next)) next++;
            p.Position = next;
            used.Add(next);
            fixedIds.Add(p.PlayerId);
        }

        return fixedIds;
    }
}
