using PokerHub.Domain.Enums;

namespace PokerHub.Domain.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public Guid TournamentId { get; set; }
    public Guid FromPlayerId { get; set; }
    public Guid ToPlayerId { get; set; }
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    // Navigation properties
    public Tournament Tournament { get; set; } = null!;
    public Player FromPlayer { get; set; } = null!;
    public Player ToPlayer { get; set; } = null!;

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
