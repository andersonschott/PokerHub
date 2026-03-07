namespace PokerHub.Client.Services;

/// <summary>
/// Ação registrada offline para ser sincronizada quando a conexão for restaurada.
/// </summary>
public record OfflineAction(
    string Id,
    string ActionType,   // "REBUY", "ELIMINATE", "PAUSE", "RESUME", "CHECK_IN", etc.
    string PayloadJson,  // JSON do payload específico da ação
    long   Timestamp,
    int    Retries
)
{
    public static OfflineAction Create(string actionType, object payload) => new(
        Id:          Guid.NewGuid().ToString(),
        ActionType:  actionType,
        PayloadJson: System.Text.Json.JsonSerializer.Serialize(payload),
        Timestamp:   DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        Retries:     0
    );
}

/// <summary>Tipos de ação offline suportados.</summary>
public static class OfflineActionTypes
{
    public const string Rebuy        = "REBUY";
    public const string RemoveRebuy  = "REMOVE_REBUY";
    public const string SetAddon     = "SET_ADDON";
    public const string Eliminate    = "ELIMINATE";
    public const string Restore      = "RESTORE";
    public const string CheckIn      = "CHECK_IN";
    public const string CheckOut     = "CHECK_OUT";
    public const string Pause        = "PAUSE";
    public const string Resume       = "RESUME";
    public const string AdvanceLevel = "ADVANCE_LEVEL";
    public const string PrevLevel    = "PREV_LEVEL";
}
