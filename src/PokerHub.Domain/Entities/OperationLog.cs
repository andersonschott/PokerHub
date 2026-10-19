namespace PokerHub.Domain.Entities;

public class OperationLog
{
    public Guid Id { get; set; }
    public Guid ScopeId { get; set; }
    public string ScopeType { get; set; } = "Tournament";
    public string Action { get; set; } = string.Empty;
    public string? ActorId { get; set; }
    public DateTime CreatedAt { get; set; }
}
