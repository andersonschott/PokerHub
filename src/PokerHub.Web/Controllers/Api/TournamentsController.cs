using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PokerHub.Application.DTOs.Tournament;
using PokerHub.Application.Interfaces;

namespace PokerHub.Web.Controllers.Api;

[Authorize(AuthenticationSchemes = "Bearer")]
[Route("api/tournaments")]
public class TournamentsController(ITournamentService tournamentService) : BaseApiController
{
    // ── Queries ──────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetMyTournaments()
    {
        var tournaments = await tournamentService.GetTournamentsByUserAsync(GetUserId());
        return Ok(tournaments);
    }

    [HttpGet("/api/leagues/{leagueId:guid}/tournaments")]
    public async Task<IActionResult> GetLeagueTournaments(Guid leagueId)
    {
        var tournaments = await tournamentService.GetTournamentsByLeagueAsync(leagueId);
        return Ok(tournaments);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTournament(Guid id)
    {
        var tournament = await tournamentService.GetTournamentByIdAsync(id);
        if (tournament is null) return NotFound();
        return Ok(tournament);
    }

    [HttpGet("{id:guid}/detail")]
    public async Task<IActionResult> GetTournamentDetail(Guid id)
    {
        var detail = await tournamentService.GetTournamentDetailAsync(id);
        if (detail is null) return NotFound();
        return Ok(detail);
    }

    [HttpGet("{id:guid}/timer-state")]
    public async Task<IActionResult> GetTimerState(Guid id)
    {
        var state = await tournamentService.GetTimerStateAsync(id);
        if (state is null) return NotFound();
        return Ok(state);
    }

    [HttpGet("invite/{code}")]
    public async Task<IActionResult> GetByInviteCode(string code)
    {
        var tournament = await tournamentService.GetTournamentByInviteCodeAsync(code);
        if (tournament is null) return NotFound();
        return Ok(tournament);
    }

    // ── Create / Update / Delete ──────────────────────────────────────────────

    [HttpPost("/api/leagues/{leagueId:guid}/tournaments")]
    public async Task<IActionResult> CreateTournament(Guid leagueId, [FromBody] CreateTournamentDto dto)
    {
        var tournament = await tournamentService.CreateTournamentAsync(leagueId, dto);
        return CreatedAtAction(nameof(GetTournament), new { id = tournament.Id }, tournament);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTournament(Guid id, [FromBody] CreateTournamentDto dto)
    {
        var updated = await tournamentService.UpdateTournamentAsync(id, dto);
        if (!updated) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTournament(Guid id)
    {
        var deleted = await tournamentService.DeleteTournamentAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:guid}/duplicate")]
    public async Task<IActionResult> DuplicateTournament(Guid id, [FromBody] DuplicateTournamentRequest body)
    {
        var tournament = await tournamentService.DuplicateTournamentAsync(id, body.LeagueId);
        if (tournament is null) return NotFound();
        return Ok(tournament);
    }

    // ── Status Management ─────────────────────────────────────────────────────

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> Start(Guid id)
    {
        var ok = await tournamentService.StartTournamentAsync(id);
        if (!ok) return BadRequest(new { message = "Não foi possível iniciar o torneio." });
        return NoContent();
    }

    [HttpPost("{id:guid}/pause")]
    public async Task<IActionResult> Pause(Guid id)
    {
        var ok = await tournamentService.PauseTournamentAsync(id);
        if (!ok) return BadRequest(new { message = "Não foi possível pausar o torneio." });
        return NoContent();
    }

    [HttpPost("{id:guid}/resume")]
    public async Task<IActionResult> Resume(Guid id)
    {
        var ok = await tournamentService.ResumeTournamentAsync(id);
        if (!ok) return BadRequest(new { message = "Não foi possível retomar o torneio." });
        return NoContent();
    }

    [HttpPost("{id:guid}/finish")]
    public async Task<IActionResult> Finish(Guid id, [FromBody] FinishTournamentRequest body)
    {
        var positions = body.Positions
            .Select(p => (p.PlayerId, p.Position))
            .ToList<(Guid playerId, int position)>();

        var (success, message) = await tournamentService.FinishTournamentAsync(id, positions);
        if (!success) return BadRequest(new { message });
        return NoContent();
    }

    [HttpPost("{id:guid}/finish-custom")]
    public async Task<IActionResult> FinishWithCustomPrizes(Guid id, [FromBody] ConfirmedPrizeDistributionDto distribution)
    {
        var (success, message) = await tournamentService.FinishTournamentWithCustomPrizesAsync(id, distribution);
        if (!success) return BadRequest(new { message });
        return NoContent();
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var ok = await tournamentService.CancelTournamentAsync(id);
        if (!ok) return BadRequest(new { message = "Não foi possível cancelar o torneio." });
        return NoContent();
    }

    // ── Level Navigation ──────────────────────────────────────────────────────

    [HttpPost("{id:guid}/advance-level")]
    public async Task<IActionResult> AdvanceLevel(Guid id)
    {
        var ok = await tournamentService.AdvanceToNextLevelAsync(id);
        if (!ok) return BadRequest(new { message = "Não foi possível avançar o nível." });
        return NoContent();
    }

    [HttpPost("{id:guid}/previous-level")]
    public async Task<IActionResult> PreviousLevel(Guid id)
    {
        var ok = await tournamentService.GoToPreviousLevelAsync(id);
        if (!ok) return BadRequest(new { message = "Não foi possível voltar o nível." });
        return NoContent();
    }

    // ── Player Management ─────────────────────────────────────────────────────

    [HttpPost("{id:guid}/players/{playerId:guid}")]
    public async Task<IActionResult> AddPlayer(Guid id, Guid playerId)
    {
        var ok = await tournamentService.AddPlayerToTournamentAsync(id, playerId);
        if (!ok) return BadRequest(new { message = "Não foi possível adicionar o jogador." });
        return NoContent();
    }

    [HttpDelete("{id:guid}/players/{playerId:guid}")]
    public async Task<IActionResult> RemovePlayer(Guid id, Guid playerId)
    {
        var ok = await tournamentService.RemovePlayerFromTournamentAsync(id, playerId);
        if (!ok) return BadRequest(new { message = "Não foi possível remover o jogador." });
        return NoContent();
    }

    [HttpPost("{id:guid}/check-in/{playerId:guid}")]
    public async Task<IActionResult> CheckIn(Guid id, Guid playerId)
    {
        var ok = await tournamentService.CheckInPlayerAsync(id, playerId);
        if (!ok) return BadRequest(new { message = "Check-in não foi possível." });
        return NoContent();
    }

    [HttpPost("{id:guid}/check-out/{playerId:guid}")]
    public async Task<IActionResult> CheckOut(Guid id, Guid playerId)
    {
        var ok = await tournamentService.CheckOutPlayerAsync(id, playerId);
        if (!ok) return BadRequest(new { message = "Check-out não foi possível." });
        return NoContent();
    }

    [HttpPost("{id:guid}/bulk-check-in")]
    public async Task<IActionResult> BulkCheckIn(Guid id, [FromBody] BulkPlayerRequest body)
    {
        var count = await tournamentService.BulkCheckInAsync(id, body.PlayerIds);
        return Ok(new { checkedIn = count });
    }

    // ── Rebuy / Addon ─────────────────────────────────────────────────────────

    [HttpPost("{id:guid}/rebuy/{playerId:guid}")]
    public async Task<IActionResult> AddRebuy(Guid id, Guid playerId)
    {
        var ok = await tournamentService.AddRebuyAsync(id, playerId);
        if (!ok) return BadRequest(new { message = "Rebuy não permitido." });
        return NoContent();
    }

    [HttpDelete("{id:guid}/rebuy/{playerId:guid}")]
    public async Task<IActionResult> RemoveRebuy(Guid id, Guid playerId)
    {
        var ok = await tournamentService.RemoveRebuyAsync(id, playerId);
        if (!ok) return BadRequest(new { message = "Não foi possível remover rebuy." });
        return NoContent();
    }

    [HttpPost("{id:guid}/addon/{playerId:guid}")]
    public async Task<IActionResult> SetAddon(Guid id, Guid playerId, [FromBody] SetAddonRequest body)
    {
        var ok = await tournamentService.SetAddonAsync(id, playerId, body.HasAddon);
        if (!ok) return BadRequest(new { message = "Addon não permitido." });
        return NoContent();
    }

    // ── Elimination ───────────────────────────────────────────────────────────

    [HttpPost("{id:guid}/eliminate/{playerId:guid}")]
    public async Task<IActionResult> EliminatePlayer(Guid id, Guid playerId, [FromBody] EliminatePlayerRequest? body)
    {
        var (success, message) = await tournamentService.EliminatePlayerAsync(
            id, playerId, body?.EliminatedByPlayerId, body?.Position);
        if (!success) return BadRequest(new { message });
        return NoContent();
    }

    [HttpPost("{id:guid}/restore/{playerId:guid}")]
    public async Task<IActionResult> RestorePlayer(Guid id, Guid playerId)
    {
        var ok = await tournamentService.RestoreEliminatedPlayerAsync(id, playerId);
        if (!ok) return BadRequest(new { message = "Não foi possível restaurar o jogador." });
        return NoContent();
    }

    // ── Self-Registration ─────────────────────────────────────────────────────

    [HttpPost("{id:guid}/self-register")]
    public async Task<IActionResult> SelfRegister(Guid id)
    {
        var (success, message) = await tournamentService.SelfRegisterPlayerAsync(id, GetUserId());
        if (!success) return BadRequest(new { message });
        return Ok(new { message });
    }

    [HttpDelete("{id:guid}/self-register")]
    public async Task<IActionResult> SelfUnregister(Guid id)
    {
        var ok = await tournamentService.SelfUnregisterPlayerAsync(id, GetUserId());
        if (!ok) return BadRequest(new { message = "Não foi possível remover inscrição." });
        return NoContent();
    }

    [HttpPost("{id:guid}/invite-code/regenerate")]
    public async Task<IActionResult> RegenerateInviteCode(Guid id)
    {
        var code = await tournamentService.RegenerateTournamentInviteCodeAsync(id);
        if (code is null) return NotFound();
        return Ok(new { inviteCode = code });
    }

    // ── Delegates ─────────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/delegates")]
    public async Task<IActionResult> GetDelegates(Guid id)
    {
        var delegates = await tournamentService.GetDelegatesAsync(id);
        return Ok(delegates);
    }

    [HttpPost("{id:guid}/delegates")]
    public async Task<IActionResult> AddDelegate(Guid id, [FromBody] AddDelegateRequest body)
    {
        var ok = await tournamentService.AddDelegateAsync(id, body.UserId, GetUserId(), body.Permissions);
        if (!ok) return Conflict(new { message = "Usuário já é delegado neste torneio." });
        return NoContent();
    }

    [HttpDelete("{id:guid}/delegates/{userId}")]
    public async Task<IActionResult> RemoveDelegate(Guid id, string userId)
    {
        var ok = await tournamentService.RemoveDelegateAsync(id, userId);
        if (!ok) return NotFound();
        return NoContent();
    }
}

// ── Request records ───────────────────────────────────────────────────────────

public record DuplicateTournamentRequest(Guid LeagueId);

public record FinishTournamentRequest(IList<PlayerPositionRequest> Positions);

public record PlayerPositionRequest(Guid PlayerId, int Position);

public record SetAddonRequest(bool HasAddon);

public record EliminatePlayerRequest(Guid? EliminatedByPlayerId, int? Position);

public record BulkPlayerRequest(IList<Guid> PlayerIds);

public record AddDelegateRequest(string UserId, PokerHub.Domain.Enums.DelegatePermissions Permissions);
