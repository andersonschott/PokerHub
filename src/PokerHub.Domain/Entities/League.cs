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

    // Navigation properties
    public User Organizer { get; set; } = null!;
    public ICollection<Player> Players { get; set; } = new List<Player>();
    public ICollection<Tournament> Tournaments { get; set; } = new List<Tournament>();

    public static string GenerateInviteCode()
    {
        return Convert.ToBase64String(Guid.NewGuid().ToByteArray())[..8].ToUpperInvariant();
    }

    public void RegenerateInviteCode()
    {
        InviteCode = GenerateInviteCode();
    }
}
