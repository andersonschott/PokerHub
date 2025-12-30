namespace PokerHub.Domain.Entities;

public class LeaguePrizeTableEntry
{
    public Guid Id { get; set; }
    public Guid LeaguePrizeTableId { get; set; }
    public int Position { get; set; }
    public decimal PrizeAmount { get; set; }

    // Navigation properties
    public LeaguePrizeTable LeaguePrizeTable { get; set; } = null!;
}
