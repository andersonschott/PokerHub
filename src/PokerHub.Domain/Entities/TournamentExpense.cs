using PokerHub.Domain.Enums;

namespace PokerHub.Domain.Entities;

public class TournamentExpense
{
    public Guid Id { get; set; }
    public Guid TournamentId { get; set; }
    public Guid PaidByPlayerId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public ExpenseSplitType SplitType { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Tournament Tournament { get; set; } = null!;
    public Player PaidByPlayer { get; set; } = null!;
    public ICollection<TournamentExpenseShare> Shares { get; set; } = new List<TournamentExpenseShare>();
}
