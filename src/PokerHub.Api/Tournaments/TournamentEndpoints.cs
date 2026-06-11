using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.DTOs.Tournament;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Enums;

namespace PokerHub.Api.Tournaments;

public static class TournamentEndpoints
{
    public static void Map(WebApplication app)
    {
        // -------------------------------------------------------------------------
        // League-scoped tournament routes
        // -------------------------------------------------------------------------
        var league = app.MapGroup("/api/leagues/{leagueId:guid}/tournaments")
            .WithTags("Tournaments")
            .RequireAuthorization();

        // GET /api/leagues/{leagueId}/tournaments[?status=...]
        league.MapGet("/", async (
            Guid leagueId,
            TournamentStatus? status,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            if (!await leagues.CanUserAccessLeagueAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var all = await tournaments.GetTournamentsByLeagueAsync(leagueId);
            var result = status.HasValue
                ? all.Where(t => t.Status == status.Value).ToList()
                : (IReadOnlyList<TournamentDto>)all;

            return Results.Ok(result);
        });

        // POST /api/leagues/{leagueId}/tournaments
        league.MapPost("/", async (
            Guid leagueId,
            CreateTournamentDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            if (!await leagues.IsUserOrganizerAsync(leagueId, user.GetUserId()))
                return Results.Forbid();

            var created = await tournaments.CreateTournamentAsync(leagueId, dto);
            return Results.Created($"/api/tournaments/{created.Id}", created);
        });

        // -------------------------------------------------------------------------
        // Tournament-id-scoped routes
        // -------------------------------------------------------------------------
        var t = app.MapGroup("/api/tournaments")
            .WithTags("Tournaments")
            .RequireAuthorization();

        // GET /api/tournaments/by-invite/{inviteCode}  — no membership check, publicly accessible with token
        t.MapGet("/by-invite/{inviteCode}", async (
            string inviteCode,
            ITournamentService tournaments) =>
        {
            var tournament = await tournaments.GetTournamentByInviteCodeAsync(inviteCode);
            return tournament is null ? Results.NotFound() : Results.Ok(tournament);
        });

        // GET /api/tournaments/{id}
        t.MapGet("/{id:guid}", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var detail = await tournaments.GetTournamentDetailAsync(id);
            if (detail is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(detail.LeagueId, user.GetUserId()))
                return Results.Forbid();

            return Results.Ok(detail);
        });

        // PUT /api/tournaments/{id}
        t.MapPut("/{id:guid}", async (
            Guid id,
            CreateTournamentDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var updated = await tournaments.UpdateTournamentAsync(id, dto);
            return updated ? Results.Ok() : Results.NotFound();
        });

        // DELETE /api/tournaments/{id}
        t.MapDelete("/{id:guid}", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var deleted = await tournaments.DeleteTournamentAsync(id);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        // POST /api/tournaments/{id}/duplicate
        t.MapPost("/{id:guid}/duplicate", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var copy = await tournaments.DuplicateTournamentAsync(id, existing.LeagueId);
            return copy is null
                ? Results.NotFound()
                : Results.Created($"/api/tournaments/{copy.Id}", copy);
        });

        // POST /api/tournaments/{id}/regenerate-invite
        t.MapPost("/{id:guid}/regenerate-invite", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var code = await tournaments.RegenerateTournamentInviteCodeAsync(id);
            return Results.Ok(new { InviteCode = code });
        });

        // -------------------------------------------------------------------------
        // Status transitions
        // -------------------------------------------------------------------------

        // POST /api/tournaments/{id}/start
        t.MapPost("/{id:guid}/start", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.StartTournamentAsync(id);
            return ok ? Results.Ok() : Results.BadRequest();
        });

        // POST /api/tournaments/{id}/pause
        t.MapPost("/{id:guid}/pause", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.PauseTournamentAsync(id);
            return ok ? Results.Ok() : Results.BadRequest();
        });

        // POST /api/tournaments/{id}/resume
        t.MapPost("/{id:guid}/resume", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.ResumeTournamentAsync(id);
            return ok ? Results.Ok() : Results.BadRequest();
        });

        // POST /api/tournaments/{id}/cancel
        t.MapPost("/{id:guid}/cancel", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.CancelTournamentAsync(id);
            return ok ? Results.NoContent() : Results.BadRequest();
        });

        // POST /api/tournaments/{id}/finish  (positions mode)
        t.MapPost("/{id:guid}/finish", async (
            Guid id,
            FinishTournamentRequest req,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var positions = req.Positions
                .Select(p => (p.PlayerId, p.Position))
                .ToList<(Guid, int)>();

            var (success, message) = await tournaments.FinishTournamentAsync(id, positions);
            return success ? Results.Ok(new { Message = message }) : Results.BadRequest(new { Message = message });
        });

        // POST /api/tournaments/{id}/finish-custom  (custom prizes mode)
        t.MapPost("/{id:guid}/finish-custom", async (
            Guid id,
            ConfirmedPrizeDistributionDto distribution,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var (success, message) = await tournaments.FinishTournamentWithCustomPrizesAsync(
                id, distribution, user.GetUserId());
            return success ? Results.Ok(new { Message = message }) : Results.BadRequest(new { Message = message });
        });

        // -------------------------------------------------------------------------
        // Player management
        // -------------------------------------------------------------------------

        // POST /api/tournaments/{id}/players  (admin add)
        t.MapPost("/{id:guid}/players", async (
            Guid id,
            AddPlayerRequest req,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.AddPlayerToTournamentAsync(id, req.PlayerId);
            return ok ? Results.Ok() : Results.BadRequest();
        });

        // DELETE /api/tournaments/{id}/players/{playerId}
        t.MapDelete("/{id:guid}/players/{playerId:guid}", async (
            Guid id,
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.RemovePlayerFromTournamentAsync(id, playerId);
            return ok ? Results.Ok() : Results.NotFound();
        });

        // POST /api/tournaments/{id}/players/{playerId}/checkin
        t.MapPost("/{id:guid}/players/{playerId:guid}/checkin", async (
            Guid id,
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await tournaments.HasDelegatePermissionAsync(id, user.GetUserId(), DelegatePermissions.CheckIn))
                return Results.Forbid();

            var ok = await tournaments.CheckInPlayerAsync(id, playerId);
            return ok ? Results.Ok() : Results.NotFound();
        });

        // POST /api/tournaments/{id}/players/{playerId}/checkout
        t.MapPost("/{id:guid}/players/{playerId:guid}/checkout", async (
            Guid id,
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await tournaments.HasDelegatePermissionAsync(id, user.GetUserId(), DelegatePermissions.CheckIn))
                return Results.Forbid();

            var ok = await tournaments.CheckOutPlayerAsync(id, playerId);
            return ok ? Results.Ok() : Results.NotFound();
        });

        // POST /api/tournaments/{id}/players/bulk-checkin
        t.MapPost("/{id:guid}/players/bulk-checkin", async (
            Guid id,
            BulkCheckInRequest req,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await tournaments.HasDelegatePermissionAsync(id, user.GetUserId(), DelegatePermissions.CheckIn))
                return Results.Forbid();

            var count = await tournaments.BulkCheckInAsync(id, req.PlayerIds);
            return Results.Ok(new { CheckedIn = count });
        });

        // -------------------------------------------------------------------------
        // Rebuy / Add-on
        // -------------------------------------------------------------------------

        // POST /api/tournaments/{id}/players/{playerId}/rebuy
        t.MapPost("/{id:guid}/players/{playerId:guid}/rebuy", async (
            Guid id,
            Guid playerId,
            ClaimsPrincipal user,
            ITournamentService tournaments) =>
        {
            if (!await tournaments.HasDelegatePermissionAsync(id, user.GetUserId(), DelegatePermissions.ManageRebuys))
                return Results.Forbid();

            var ok = await tournaments.AddRebuyAsync(id, playerId);
            return ok ? Results.Ok() : Results.BadRequest();
        });

        // DELETE /api/tournaments/{id}/players/{playerId}/rebuy
        t.MapDelete("/{id:guid}/players/{playerId:guid}/rebuy", async (
            Guid id,
            Guid playerId,
            ClaimsPrincipal user,
            ITournamentService tournaments) =>
        {
            if (!await tournaments.HasDelegatePermissionAsync(id, user.GetUserId(), DelegatePermissions.ManageRebuys))
                return Results.Forbid();

            var ok = await tournaments.RemoveRebuyAsync(id, playerId);
            return ok ? Results.Ok() : Results.BadRequest();
        });

        // POST /api/tournaments/{id}/players/{playerId}/addon
        t.MapPost("/{id:guid}/players/{playerId:guid}/addon", async (
            Guid id,
            Guid playerId,
            SetAddonRequest req,
            ClaimsPrincipal user,
            ITournamentService tournaments) =>
        {
            if (!await tournaments.HasDelegatePermissionAsync(id, user.GetUserId(), DelegatePermissions.ManageRebuys))
                return Results.Forbid();

            var ok = await tournaments.SetAddonAsync(id, playerId, req.HasAddon);
            return ok ? Results.Ok() : Results.BadRequest();
        });

        // -------------------------------------------------------------------------
        // Elimination
        // -------------------------------------------------------------------------

        // POST /api/tournaments/{id}/players/{playerId}/eliminate
        t.MapPost("/{id:guid}/players/{playerId:guid}/eliminate", async (
            Guid id,
            Guid playerId,
            EliminatePlayerRequest req,
            ClaimsPrincipal user,
            ITournamentService tournaments) =>
        {
            if (!await tournaments.HasDelegatePermissionAsync(id, user.GetUserId(), DelegatePermissions.Eliminate))
                return Results.Forbid();

            var (success, message) = await tournaments.EliminatePlayerAsync(
                id, playerId, req.EliminatedByPlayerId, user.GetUserId(), req.Position);
            return success
                ? Results.Ok(new { Message = message })
                : Results.BadRequest(new { Message = message });
        });

        // POST /api/tournaments/{id}/players/{playerId}/restore
        t.MapPost("/{id:guid}/players/{playerId:guid}/restore", async (
            Guid id,
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.RestoreEliminatedPlayerAsync(id, playerId);
            return ok ? Results.Ok() : Results.NotFound();
        });

        // -------------------------------------------------------------------------
        // Self-registration
        // -------------------------------------------------------------------------

        // POST /api/tournaments/{id}/self-register
        t.MapPost("/{id:guid}/self-register", async (
            Guid id,
            ClaimsPrincipal user,
            ITournamentService tournaments) =>
        {
            var (success, message) = await tournaments.SelfRegisterPlayerAsync(id, user.GetUserId());
            return success
                ? Results.Ok(new { Message = message })
                : Results.Conflict(new { Message = message });
        });

        // POST /api/tournaments/{id}/self-unregister
        t.MapPost("/{id:guid}/self-unregister", async (
            Guid id,
            ClaimsPrincipal user,
            ITournamentService tournaments) =>
        {
            var ok = await tournaments.SelfUnregisterPlayerAsync(id, user.GetUserId());
            return ok ? Results.Ok() : Results.BadRequest();
        });

        // GET /api/tournaments/{id}/is-registered
        t.MapGet("/{id:guid}/is-registered", async (
            Guid id,
            ClaimsPrincipal user,
            ITournamentService tournaments) =>
        {
            var registered = await tournaments.IsUserRegisteredInTournamentAsync(id, user.GetUserId());
            return Results.Ok(new { IsRegistered = registered });
        });

        // -------------------------------------------------------------------------
        // Timer state
        // -------------------------------------------------------------------------

        // GET /api/tournaments/{id}/timer-state
        t.MapGet("/{id:guid}/timer-state", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var state = await tournaments.GetTimerStateAsync(id);
            return state is null ? Results.NotFound() : Results.Ok(state);
        });

        // POST /api/tournaments/{id}/timer/next-level
        t.MapPost("/{id:guid}/timer/next-level", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.AdvanceToNextLevelAsync(id);
            return ok ? Results.Ok() : Results.BadRequest();
        });

        // POST /api/tournaments/{id}/timer/prev-level
        t.MapPost("/{id:guid}/timer/prev-level", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.GoToPreviousLevelAsync(id);
            return ok ? Results.Ok() : Results.BadRequest();
        });

        // PATCH /api/tournaments/{id}/timer/time-remaining
        t.MapPatch("/{id:guid}/timer/time-remaining", async (
            Guid id,
            UpdateTimeRequest req,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.UpdateTimeRemainingAsync(id, req.SecondsRemaining);
            return ok ? Results.Ok() : Results.BadRequest();
        });

        // -------------------------------------------------------------------------
        // Delegates
        // -------------------------------------------------------------------------

        // GET /api/tournaments/{id}/delegates
        t.MapGet("/{id:guid}/delegates", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var delegates = await tournaments.GetDelegatesAsync(id);
            return Results.Ok(delegates);
        });

        // POST /api/tournaments/{id}/delegates
        t.MapPost("/{id:guid}/delegates", async (
            Guid id,
            AddDelegateRequest req,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.AddDelegateAsync(id, req.UserId, user.GetUserId(), req.Permissions);
            return ok ? Results.Ok() : Results.Conflict();
        });

        // DELETE /api/tournaments/{id}/delegates/{userId}
        t.MapDelete("/{id:guid}/delegates/{userId}", async (
            Guid id,
            string userId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments) =>
        {
            var existing = await tournaments.GetTournamentByIdAsync(id);
            if (existing is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(existing.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await tournaments.RemoveDelegateAsync(id, userId);
            return ok ? Results.NoContent() : Results.NotFound();
        });
    }
}

// -------------------------------------------------------------------------
// Small request records (parameters too loose to reuse a service DTO)
// -------------------------------------------------------------------------

internal record FinishPlayerPositionRequest(Guid PlayerId, int Position);
internal record FinishTournamentRequest(IReadOnlyList<FinishPlayerPositionRequest> Positions);
internal record AddPlayerRequest(Guid PlayerId);
internal record BulkCheckInRequest(IList<Guid> PlayerIds);
internal record EliminatePlayerRequest(Guid? EliminatedByPlayerId, int? Position);
internal record SetAddonRequest(bool HasAddon);
internal record AddDelegateRequest(string UserId, DelegatePermissions Permissions);
internal record UpdateTimeRequest(int SecondsRemaining);
