using PokerHub.Domain.Enums;

namespace PokerHub.Domain.Entities;

public class Player
{
    public Guid Id { get; set; }
    public Guid LeagueId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? PixKey { get; set; }
    public PixKeyType? PixKeyType { get; set; }
    public string? UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public League League { get; set; } = null!;
    public User? User { get; set; }
    public ICollection<TournamentPlayer> Participations { get; set; } = new List<TournamentPlayer>();
    public ICollection<Payment> PaymentsMade { get; set; } = new List<Payment>();
    public ICollection<Payment> PaymentsReceived { get; set; } = new List<Payment>();
    public ICollection<TournamentExpense> ExpensesPaid { get; set; } = new List<TournamentExpense>();
    public ICollection<TournamentExpenseShare> ExpenseShares { get; set; } = new List<TournamentExpenseShare>();
}
