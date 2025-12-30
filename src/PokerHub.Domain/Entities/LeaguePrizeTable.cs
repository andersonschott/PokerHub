namespace PokerHub.Domain.Entities;

public class LeaguePrizeTable
{
    public Guid Id { get; set; }
    public Guid LeagueId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal PrizePoolTotal { get; set; }
    public decimal JackpotAmount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public League League { get; set; } = null!;
    public ICollection<LeaguePrizeTableEntry> Entries { get; set; } = new List<LeaguePrizeTableEntry>();
}
