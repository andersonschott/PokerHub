namespace PokerHub.Domain.Entities;

public class JackpotUsage
{
    public Guid Id { get; set; }
    public Guid LeagueId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public League League { get; set; } = null!;
}
