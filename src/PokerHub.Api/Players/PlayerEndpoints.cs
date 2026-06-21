using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.Interfaces;

namespace PokerHub.Api.Players;

public static class PlayerEndpoints
{
    public static void Map(WebApplication app)
    {
        // -------------------------------------------------------------------------
        // League-scoped player routes: /api/leagues/{leagueId}/players-list
        // Note: /api/leagues/{leagueId}/players is already taken by LeagueEndpoints
        // (returns LeagueWithPlayersDto). This group exposes the PlayerService CRUD.
        // -------------------------------------------------------------------------
        var leagueGroup = app.MapGroup("/api/leagues/{leagueId:guid}/players-list")
            .WithTags("Players")
            .RequireAuthorization();

        // GET /api/leagues/{leagueId}/players-list
        leagueGroup.MapGet("/", async (
            Guid leagueId,
            bool? includeInactive,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players) =>
        {
            var uid = user.GetUserId();
            var inc = includeInactive == true;
            // includeInactive (telas de admin) exige organizador; lista normal exige acesso.
            if (inc)
            {
                if (!await leagues.IsUserOrganizerAsync(leagueId, uid))
                    return Results.Forbid();
            }
            else if (!await leagues.CanUserAccessLeagueAsync(leagueId, uid))
            {
                return Results.Forbid();
            }

            var list = await players.GetPlayersByLeagueAsync(leagueId, inc);
            return Results.Ok(list);
        });

        // POST /api/leagues/{leagueId}/players-list
        leagueGroup.MapPost("/", async (
            Guid leagueId,
            CreatePlayerDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players) =>
        {
            if (!await leagues.IsUserOrganizerAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var created = await players.CreatePlayerAsync(leagueId, dto);
            return Results.Created($"/api/players/{created.Id}", created);
        });

        // -------------------------------------------------------------------------
        // Player-scoped routes: /api/players/{playerId}
        // Authorization: we check that the player belongs to a league the user
        // can access (read) or is organizer of (write). Since PlayerDto carries
        // LeagueId we can perform the check after fetching.
        // -------------------------------------------------------------------------
        var playerGroup = app.MapGroup("/api/players")
            .WithTags("Players")
            .RequireAuthorization();

        // GET /api/players/{playerId}
        playerGroup.MapGet("/{playerId:guid}", async (
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players) =>
        {
            var player = await players.GetPlayerByIdAsync(playerId);
            if (player is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(player.LeagueId, user.GetUserId()))
                return Results.Forbid();

            return Results.Ok(player);
        });

        // GET /api/players/{playerId}/stats
        playerGroup.MapGet("/{playerId:guid}/stats", async (
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players) =>
        {
            var player = await players.GetPlayerByIdAsync(playerId);
            if (player is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(player.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var stats = await players.GetPlayerStatsAsync(playerId);
            return stats is null ? Results.NotFound() : Results.Ok(stats);
        });

        // PUT /api/players/{playerId}
        playerGroup.MapPut("/{playerId:guid}", async (
            Guid playerId,
            UpdatePlayerDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players) =>
        {
            var player = await players.GetPlayerByIdAsync(playerId);
            if (player is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(player.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var updated = await players.UpdatePlayerAsync(playerId, dto);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        // DELETE /api/players/{playerId}
        playerGroup.MapDelete("/{playerId:guid}", async (
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players) =>
        {
            var player = await players.GetPlayerByIdAsync(playerId);
            if (player is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(player.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var (success, _) = await players.DeletePlayerAsync(playerId);
            return success ? Results.NoContent() : Results.NotFound();
        });

        // POST /api/players/{playerId}/deactivate  (organizador) — inativa sem soft-delete
        playerGroup.MapPost("/{playerId:guid}/deactivate", async (
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players) =>
        {
            var player = await players.GetPlayerByIdAsync(playerId);
            if (player is null) return Results.NotFound();
            if (!await leagues.IsUserOrganizerAsync(player.LeagueId, user.GetUserId()))
                return Results.Forbid();
            var ok = await players.DeactivatePlayerAsync(playerId);
            return ok ? Results.NoContent() : Results.NotFound();
        });

        // POST /api/players/{playerId}/activate  (organizador)
        playerGroup.MapPost("/{playerId:guid}/activate", async (
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players) =>
        {
            var player = await players.GetPlayerByIdAsync(playerId);
            if (player is null) return Results.NotFound();
            if (!await leagues.IsUserOrganizerAsync(player.LeagueId, user.GetUserId()))
                return Results.Forbid();
            var ok = await players.ActivatePlayerAsync(playerId);
            return ok ? Results.NoContent() : Results.NotFound();
        });

        // POST /api/players/{playerId}/link-user
        playerGroup.MapPost("/{playerId:guid}/link-user", async (
            Guid playerId,
            LinkUserRequest req,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players) =>
        {
            var player = await players.GetPlayerByIdAsync(playerId);
            if (player is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(player.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var linked = await players.LinkPlayerToUserAsync(playerId, req.UserId);
            return linked ? Results.NoContent() : Results.NotFound();
        });
    }
}

/// <summary>Small request record for linking a user to a player.</summary>
public record LinkUserRequest(string? UserId);
