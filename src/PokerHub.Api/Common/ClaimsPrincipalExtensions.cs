using System.Security.Claims;

namespace PokerHub.Api.Common;

public static class ClaimsPrincipalExtensions
{
    /// <summary>Lê o userId da claim "sub" (MapInboundClaims=false preserva o nome).</summary>
    public static string GetUserId(this ClaimsPrincipal principal)
        => principal.FindFirstValue("sub")
           ?? throw new InvalidOperationException("Authenticated principal without 'sub' claim.");

    public static string GetUserName(this ClaimsPrincipal principal)
        => principal.FindFirstValue("name") ?? string.Empty;

    public static string? GetUserEmail(this ClaimsPrincipal principal)
        => principal.FindFirstValue("email");
}
