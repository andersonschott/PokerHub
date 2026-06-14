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
    public DateTime? LevelEndsAtUtc { get; set; }
    public int? PausedRemainingSeconds { get; set; }
    public DateTime ServerNowUtc { get; set; }
}
