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
