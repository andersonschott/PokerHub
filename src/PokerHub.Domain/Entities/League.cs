namespace PokerHub.Domain.Entities;

public class League
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string InviteCode { get; set; } = string.Empty;
    public string OrganizerId { get; set; } = string.Empty;
    public bool BlockCheckInWithDebt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Jackpot configuration
    public decimal JackpotPercentage { get; set; } = 0;
    public decimal AccumulatedPrizePool { get; set; } = 0;

    // Navigation properties
    public User Organizer { get; set; } = null!;
    public ICollection<Player> Players { get; set; } = new List<Player>();
    public ICollection<Tournament> Tournaments { get; set; } = new List<Tournament>();
    public ICollection<Season> Seasons { get; set; } = new List<Season>();
    public ICollection<JackpotContribution> JackpotContributions { get; set; } = new List<JackpotContribution>();
    public ICollection<JackpotUsage> JackpotUsages { get; set; } = new List<JackpotUsage>();
    public ICollection<LeaguePrizeTable> PrizeTables { get; set; } = new List<LeaguePrizeTable>();

    public static string GenerateInviteCode()
    {
        return Convert.ToBase64String(Guid.NewGuid().ToByteArray())[..8].ToUpperInvariant();
    }

    public void RegenerateInviteCode()
    {
        InviteCode = GenerateInviteCode();
    }
}
