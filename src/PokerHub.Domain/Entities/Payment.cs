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
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    // Optional description for special payments (e.g., "Caixinha", "Jackpot")
    public string? Description { get; set; }

    // Navigation properties
    public Tournament Tournament { get; set; } = null!;
    public Player FromPlayer { get; set; } = null!;
    public Player? ToPlayer { get; set; }

    // Helper properties
    public bool IsJackpotContribution => ToPlayerId == null && !string.IsNullOrEmpty(Description);

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
