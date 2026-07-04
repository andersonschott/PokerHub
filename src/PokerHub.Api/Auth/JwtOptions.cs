namespace PokerHub.Api.Auth;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = null!;
    public string Audience { get; set; } = null!;
    public string SigningKey { get; set; } = null!;

    /// <summary>Vida do access token. Curta — renovada de forma transparente pelo refresh.</summary>
    public int AccessTokenLifetimeMinutes { get; set; } = 15;

    public int RefreshTokenLifetimeDays { get; set; } = 30;
}
