using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.DTOs.Me;
using PokerHub.Application.Interfaces;

namespace PokerHub.Api.Me;

public static class MeEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/me").WithTags("Me").RequireAuthorization();

        group.MapGet("/contact", async (ClaimsPrincipal user, IPlayerService players) =>
        {
            var player = await players.GetPlayerByUserIdAsync(user.GetUserId());
            var contact = player is null
                ? new MyContactDto(null, null, null)
                : new MyContactDto(player.PixKey, player.PixKeyType, player.Phone);
            return Results.Ok(contact);
        });

        group.MapPut("/contact", async (UpdateMyContactDto dto, ClaimsPrincipal user, IPlayerService players) =>
        {
            await players.UpdateContactForUserAsync(user.GetUserId(), dto);
            return Results.Ok(new MyContactDto(dto.PixKey, dto.PixKeyType, dto.Phone));
        });
    }
}
