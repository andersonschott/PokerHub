namespace PokerHub.Domain.Entities;

public class League
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string InviteCode { get; set; } = string.Empty;
    public string OrganizerId { get; set; } = string.Empty;
    public bool BlockCheckInWithDebt { get; set; }
    public int? InactivityThresholdMonths { get; set; }  // null = não inativar jogadores automaticamente
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
        // Use base64url alphabet (no '+', '/', '=') so the code is safe as a URL
        // path segment. Standard base64 has ~11.6% chance of containing '/', which
        // breaks route matching on POST /api/leagues/join/{inviteCode}.
        var bytes = Guid.NewGuid().ToByteArray();
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_')[..8]
            .ToUpperInvariant();
    }

    public void RegenerateInviteCode()
    {
        InviteCode = GenerateInviteCode();
    }
}
