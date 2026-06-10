using System.Security.Cryptography;
using System.Text;

namespace PokerHub.Domain.Entities;

/// <summary>
/// Refresh token persistido para renovar access tokens sem repetir credenciais.
/// O valor bruto vive apenas no cliente; o banco guarda somente o hash SHA-256,
/// então um vazamento de banco não permite forjar sessões.
/// Rotação: cada refresh revoga o token atual e emite um novo, encadeado via
/// ReplacedByTokenId para análise forense.
/// </summary>
public class RefreshToken
{
    public Guid Id { get; private set; }

    /// <summary>FK para AspNetUsers (IdentityUser usa chave string).</summary>
    public string UserId { get; private set; } = string.Empty;

    /// <summary>Hash SHA-256 (hex) do token bruto. Nunca armazenar o valor bruto.</summary>
    public string TokenHash { get; private set; } = string.Empty;

    public DateTime CreatedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }
    public Guid? ReplacedByTokenId { get; private set; }

    public bool IsRevoked => RevokedAt is not null;
    public bool IsExpired(DateTime utcNow) => utcNow >= ExpiresAt;
    public bool IsActive(DateTime utcNow) => !IsRevoked && !IsExpired(utcNow);

    private RefreshToken() { } // EF Core

    public static RefreshToken Issue(string userId, string rawToken, TimeSpan ttl, DateTime utcNow)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (string.IsNullOrWhiteSpace(rawToken))
            throw new ArgumentException("Raw token is required.", nameof(rawToken));
        if (ttl <= TimeSpan.Zero)
            throw new ArgumentException("TTL must be positive.", nameof(ttl));

        return new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = HashToken(rawToken),
            CreatedAt = utcNow,
            ExpiresAt = utcNow.Add(ttl)
        };
    }

    public void Revoke(Guid? replacedByTokenId, DateTime utcNow)
    {
        if (RevokedAt is not null) return; // idempotente
        RevokedAt = utcNow;
        ReplacedByTokenId = replacedByTokenId;
    }

    public static string HashToken(string raw)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
    }
}
