using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.JSInterop;

namespace PokerHub.Client.Services;

/// <summary>
/// Gerencia o estado de autenticação JWT no WASM.
/// Persiste tokens no localStorage para sobreviver a reloads.
/// </summary>
public class AuthStateService : AuthenticationStateProvider
{
    private readonly IJSRuntime _js;
    private string? _token;
    private string? _refreshToken;
    private const string TokenKey = "pokerhub_token";
    private const string RefreshKey = "pokerhub_refresh";

    public AuthStateService(IJSRuntime js)
    {
        _js = js;
    }

    public string? Token => _token;
    public string? RefreshToken => _refreshToken;
    public bool IsAuthenticated => !string.IsNullOrEmpty(_token) && !IsTokenExpired(_token);

    /// <summary>
    /// Carrega tokens do localStorage ao iniciar o app.
    /// Deve ser chamado no startup (App.razor).
    /// </summary>
    public async Task InitializeAsync()
    {
        try
        {
            var token = await _js.InvokeAsync<string?>("localStorage.getItem", TokenKey);
            var refresh = await _js.InvokeAsync<string?>("localStorage.getItem", RefreshKey);

            if (!string.IsNullOrEmpty(token) && !IsTokenExpired(token))
            {
                _token = token;
                _refreshToken = refresh;
                NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
            }
            else if (!string.IsNullOrEmpty(token))
            {
                // Token expirado — limpa storage
                await ClearStorageAsync();
            }
        }
        catch { /* localStorage pode falhar em SSR ou modo privado */ }
    }

    public void SetTokens(string token, string? refreshToken)
    {
        _token = token;
        _refreshToken = refreshToken;
        _ = SaveToStorageAsync(token, refreshToken);
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    public void ClearTokens()
    {
        _token = null;
        _refreshToken = null;
        _ = ClearStorageAsync();
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    public override Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        if (string.IsNullOrEmpty(_token))
            return Task.FromResult(new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity())));

        try
        {
            if (IsTokenExpired(_token))
            {
                _token = null;
                return Task.FromResult(new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity())));
            }

            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(_token);
            var identity = new ClaimsIdentity(jwt.Claims, "jwt");
            return Task.FromResult(new AuthenticationState(new ClaimsPrincipal(identity)));
        }
        catch
        {
            return Task.FromResult(new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity())));
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

    private static bool IsTokenExpired(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);
            return jwt.ValidTo < DateTime.UtcNow.AddMinutes(-1);
        }
        catch { return true; }
    }

    private async Task SaveToStorageAsync(string token, string? refreshToken)
    {
        try
        {
            await _js.InvokeVoidAsync("localStorage.setItem", TokenKey, token);
            if (!string.IsNullOrEmpty(refreshToken))
                await _js.InvokeVoidAsync("localStorage.setItem", RefreshKey, refreshToken);
        }
        catch { }
    }

    private async Task ClearStorageAsync()
    {
        try
        {
            await _js.InvokeVoidAsync("localStorage.removeItem", TokenKey);
            await _js.InvokeVoidAsync("localStorage.removeItem", RefreshKey);
        }
        catch { }
    }
}
