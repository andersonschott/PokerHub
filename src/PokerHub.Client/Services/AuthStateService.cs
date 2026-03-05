using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Components.Authorization;

namespace PokerHub.Client.Services;

/// <summary>
/// Gerencia o estado de autenticação JWT no WASM.
/// Armazena token em memória (pode ser expandido para localStorage via JS).
/// </summary>
public class AuthStateService : AuthenticationStateProvider
{
    private string? _token;
    private string? _refreshToken;
    private ClaimsPrincipal _anonymous = new(new ClaimsIdentity());

    public string? Token => _token;
    public string? RefreshToken => _refreshToken;
    public bool IsAuthenticated => !string.IsNullOrEmpty(_token);

    public void SetTokens(string token, string refreshToken)
    {
        _token = token;
        _refreshToken = refreshToken;
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    public void ClearTokens()
    {
        _token = null;
        _refreshToken = null;
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    public override Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        if (string.IsNullOrEmpty(_token))
            return Task.FromResult(new AuthenticationState(_anonymous));

        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(_token);

            if (jwt.ValidTo < DateTime.UtcNow)
            {
                _token = null;
                return Task.FromResult(new AuthenticationState(_anonymous));
            }

            var identity = new ClaimsIdentity(jwt.Claims, "jwt");
            var user = new ClaimsPrincipal(identity);
            return Task.FromResult(new AuthenticationState(user));
        }
        catch
        {
            return Task.FromResult(new AuthenticationState(_anonymous));
        }
    }

    public string? GetUserId() =>
        GetClaimValue(ClaimTypes.NameIdentifier) ?? GetClaimValue("sub");

    public string? GetUserEmail() =>
        GetClaimValue(ClaimTypes.Email) ?? GetClaimValue("email");

    public string? GetUserName() =>
        GetClaimValue(ClaimTypes.Name) ?? GetClaimValue("name");

    private string? GetClaimValue(string type)
    {
        if (string.IsNullOrEmpty(_token)) return null;
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(_token);
            return jwt.Claims.FirstOrDefault(c => c.Type == type)?.Value;
        }
        catch { return null; }
    }
}
