namespace PokerHub.Domain.Entities;

public class TournamentPlayer
{
    public Guid Id { get; set; }
    public Guid TournamentId { get; set; }
    public Guid PlayerId { get; set; }

    // Check-in
    public bool IsCheckedIn { get; set; }
    public DateTime? CheckedInAt { get; set; }

    // Rebuys and Add-on
    public int RebuyCount { get; set; }
    public bool HasAddon { get; set; }

    // Tournament result
    public int? Position { get; set; }
    public decimal Prize { get; set; }
    public Guid? EliminatedByPlayerId { get; set; }
    public DateTime? EliminatedAt { get; set; }

    // Navigation properties
    public Tournament Tournament { get; set; } = null!;
    public Player Player { get; set; } = null!;
    public Player? EliminatedByPlayer { get; set; }

    public decimal TotalInvestment(Tournament tournament)
    {
        var total = tournament.BuyIn;
        total += RebuyCount * (tournament.RebuyValue ?? 0);
        if (HasAddon) total += tournament.AddonValue ?? 0;
        return total;
    }

    public decimal ProfitLoss(Tournament tournament)
    {
        return Prize - TotalInvestment(tournament);
    }
}
