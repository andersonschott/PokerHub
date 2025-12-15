namespace PokerHub.Domain.Entities;

public class TournamentExpenseShare
{
    public Guid Id { get; set; }
    public Guid ExpenseId { get; set; }
    public Guid PlayerId { get; set; }
    public decimal Amount { get; set; }

    // Navigation properties
    public TournamentExpense Expense { get; set; } = null!;
    public Player Player { get; set; } = null!;
}
