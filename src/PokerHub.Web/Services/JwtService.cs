using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using PokerHub.Domain.Entities;

namespace PokerHub.Web.Services;

public class JwtService
{
    private readonly IConfiguration _config;

    // In-memory store: refreshToken → (userId, expiry)
    // For production this should be persisted in the database.
    private readonly ConcurrentDictionary<string, (string UserId, DateTime Expiry)> _refreshTokens = new();

    public JwtService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiration = DateTime.UtcNow.AddMinutes(
            _config.GetValue<int>("Jwt:ExpirationMinutes", 480));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Name, user.Name),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            // Mirror the standard ClaimTypes so BaseApiController.GetUserId() works
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expiration,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken(string userId)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var expiry = DateTime.UtcNow.AddDays(
            _config.GetValue<int>("Jwt:RefreshTokenExpirationDays", 30));

        _refreshTokens[token] = (userId, expiry);
        return token;
    }

    /// <summary>Returns the userId if the refresh token is valid and not expired.</summary>
    public string? GetUserIdFromRefreshToken(string refreshToken)
    {
        if (!_refreshTokens.TryGetValue(refreshToken, out var entry)) return null;
        if (entry.Expiry < DateTime.UtcNow)
        {
            _refreshTokens.TryRemove(refreshToken, out _);
            return null;
        }
        return entry.UserId;
    }

    public void RevokeRefreshToken(string refreshToken) =>
        _refreshTokens.TryRemove(refreshToken, out _);
}
