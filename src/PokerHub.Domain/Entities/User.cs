using Microsoft.AspNetCore.Identity;

namespace PokerHub.Domain.Entities;

public class User : IdentityUser
{
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<League> OrganizedLeagues { get; set; } = new List<League>();
    public ICollection<Player> PlayerProfiles { get; set; } = new List<Player>();
}
