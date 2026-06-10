using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using PokerHub.Domain.Entities;

namespace PokerHub.Api.Auth;

public sealed class RefreshTokenService
{
    private readonly JwtOptions _opts;

    public RefreshTokenService(IOptions<JwtOptions> opts) => _opts = opts.Value;

    /// <summary>
    /// Gera token bruto (64 bytes aleatórios, base64url — sem +/= que quebram URLs)
    /// e a entidade correspondente já com hash. O bruto vai só para o cliente.
    /// </summary>
    public (string RawToken, RefreshToken Entity) Issue(string userId, DateTime utcNow)
    {
        Span<byte> bytes = stackalloc byte[64];
        RandomNumberGenerator.Fill(bytes);
        var raw = Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        var entity = RefreshToken.Issue(
            userId, raw, TimeSpan.FromDays(_opts.RefreshTokenLifetimeDays), utcNow);

        return (raw, entity);
    }
}
