namespace PokerHub.Domain.Entities;

public class BlindLevel
{
    public Guid Id { get; set; }
    public Guid TournamentId { get; set; }
    public int Order { get; set; }
    public int SmallBlind { get; set; }
    public int BigBlind { get; set; }
    public int Ante { get; set; }
    public int DurationMinutes { get; set; }
    public bool IsBreak { get; set; }
    public string? BreakDescription { get; set; }

    // Navigation properties
    public Tournament Tournament { get; set; } = null!;
}
