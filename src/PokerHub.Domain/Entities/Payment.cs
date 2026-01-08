using PokerHub.Domain.Enums;

namespace PokerHub.Domain.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public Guid TournamentId { get; set; }
    public Guid FromPlayerId { get; set; }
    public Guid? ToPlayerId { get; set; } // Nullable for jackpot payments (no specific recipient)
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public PaymentType Type { get; set; } = PaymentType.Poker;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    // Optional description for special payments (e.g., "Caixinha", "Pizza")
    public string? Description { get; set; }

    // Reference to expense (when Type = Expense)
    public Guid? ExpenseId { get; set; }

    // Navigation properties
    public Tournament Tournament { get; set; } = null!;
    public Player FromPlayer { get; set; } = null!;
    public Player? ToPlayer { get; set; }
    public TournamentExpense? Expense { get; set; }

    // Helper properties
    public bool IsJackpotContribution => Type == PaymentType.Jackpot;

    public void MarkAsPaid()
    {
        Status = PaymentStatus.Paid;
        PaidAt = DateTime.UtcNow;
    }

    public void Confirm()
    {
        Status = PaymentStatus.Confirmed;
        ConfirmedAt = DateTime.UtcNow;
    }
}
