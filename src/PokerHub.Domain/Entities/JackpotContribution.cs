namespace PokerHub.Domain.Entities;

public class JackpotContribution
{
    public Guid Id { get; set; }
    public Guid LeagueId { get; set; }
    public Guid TournamentId { get; set; }
    public decimal Amount { get; set; }
    public decimal TournamentPrizePool { get; set; }
    public decimal PercentageApplied { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public League League { get; set; } = null!;
    public Tournament Tournament { get; set; } = null!;
}
