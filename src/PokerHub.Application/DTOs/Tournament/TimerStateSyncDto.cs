using System;

namespace PokerHub.Application.DTOs.Tournament;

public class TimerStateSyncDto
{
    public long Seq { get; set; }
    public Guid TournamentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int CurrentLevel { get; set; }
    public int? CurrentBlindLevel { get; set; }
    public int? NextBlindLevel { get; set; }

    /// <summary>
    /// Display level number for the live timer, derived by counting only non-break levels up to and
    /// including the current physical position (Order). Breaks do not increment this number, so the
    /// game numbering goes 1, 2, 3, 4, BREAK, 5, 6... instead of being inflated by intervals.
    /// </summary>
    public int CurrentLevelDisplay { get; set; }

    /// <summary>True when the current step is an interval/break (display should show "Intervalo").</summary>
    public bool IsBreak { get; set; }

    /// <summary>Real blind values for the current level (null when no matching BlindLevel exists).</summary>
    public TimerBlindInfoDto? CurrentBlind { get; set; }

    /// <summary>Real blind values for the next level (null when on the last level).</summary>
    public TimerBlindInfoDto? NextBlind { get; set; }

    public DateTime? LevelEndsAtUtc { get; set; }
    public int? PausedRemainingSeconds { get; set; }
    public DateTime ServerNowUtc { get; set; }
}

/// <summary>Projection of a <see cref="Domain.Entities.BlindLevel"/> carried by the timer sync.</summary>
public class TimerBlindInfoDto
{
    public int Sb { get; set; }
    public int Bb { get; set; }
    public int Ante { get; set; }
    public int DurationMinutes { get; set; }
    public bool IsBreak { get; set; }
}
