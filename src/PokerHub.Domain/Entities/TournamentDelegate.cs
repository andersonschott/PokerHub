using PokerHub.Domain.Enums;

namespace PokerHub.Domain.Entities;

public class TournamentDelegate
{
    public Guid Id { get; set; }
    public Guid TournamentId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DelegatePermissions Permissions { get; set; } = DelegatePermissions.All;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public string AssignedBy { get; set; } = string.Empty;

    // Navigation properties
    public Tournament Tournament { get; set; } = null!;
    public User User { get; set; } = null!;
}
