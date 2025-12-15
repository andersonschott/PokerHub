using PokerHub.Domain.Enums;

namespace PokerHub.Domain.Entities;

public class Tournament
{
    public Guid Id { get; set; }
    public Guid LeagueId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime ScheduledDateTime { get; set; }
    public string? Location { get; set; }

    // Buy-in configuration
    public decimal BuyIn { get; set; }
    public int StartingStack { get; set; }

    // Rebuy configuration
    public decimal? RebuyValue { get; set; }
    public int? RebuyStack { get; set; }
    public int? RebuyLimitLevel { get; set; }
    public int? RebuyLimitMinutes { get; set; }
    public RebuyLimitType RebuyLimitType { get; set; }

    // Add-on configuration
    public decimal? AddonValue { get; set; }
    public int? AddonStack { get; set; }

    // Prize structure (JSON array of percentages, e.g., "50,30,20")
    public string? PrizeStructure { get; set; }

    // Tournament state
    public TournamentStatus Status { get; set; } = TournamentStatus.Scheduled;
    public int CurrentLevel { get; set; }
    public int? TimeRemainingSeconds { get; set; }
    public DateTime? CurrentLevelStartedAt { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }

    // Navigation properties
    public League League { get; set; } = null!;
    public ICollection<BlindLevel> BlindLevels { get; set; } = new List<BlindLevel>();
    public ICollection<TournamentPlayer> Players { get; set; } = new List<TournamentPlayer>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<TournamentExpense> Expenses { get; set; } = new List<TournamentExpense>();

    public bool IsRebuyAllowed(int currentLevel, int minutesElapsed)
    {
        if (RebuyValue == null || RebuyValue <= 0) return false;

        return RebuyLimitType switch
        {
            Enums.RebuyLimitType.Level => currentLevel <= (RebuyLimitLevel ?? 0),
            Enums.RebuyLimitType.Time => minutesElapsed <= (RebuyLimitMinutes ?? 0),
            Enums.RebuyLimitType.Both => currentLevel <= (RebuyLimitLevel ?? 0) && minutesElapsed <= (RebuyLimitMinutes ?? 0),
            _ => true
        };
    }
}
