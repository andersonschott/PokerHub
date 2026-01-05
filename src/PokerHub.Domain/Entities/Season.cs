namespace PokerHub.Domain.Entities;

public class Season
{
    public Guid Id { get; set; }
    public Guid LeagueId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public League League { get; set; } = null!;
    public ICollection<PlayerSeasonStats> PlayerStats { get; set; } = new List<PlayerSeasonStats>();

    public bool ContainsTournament(DateTime scheduledDateTime)
    {
        return scheduledDateTime.Date >= StartDate.Date && scheduledDateTime.Date <= EndDate.Date;
    }
}
