using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PokerHub.Application.Interfaces;

namespace PokerHub.Web.Controllers.Api;

[Authorize(AuthenticationSchemes = "Bearer")]
[Route("api/payments")]
public class PaymentsController(IPaymentService paymentService) : BaseApiController
{
    [HttpGet("/api/tournaments/{tournamentId:guid}/payments")]
    public async Task<IActionResult> GetTournamentPayments(Guid tournamentId)
    {
        var payments = await paymentService.GetPaymentsByTournamentAsync(tournamentId);
        return Ok(payments);
    }

    [HttpPost("/api/tournaments/{tournamentId:guid}/payments/calculate")]
    public async Task<IActionResult> CalculatePayments(Guid tournamentId)
    {
        var payments = await paymentService.CalculateAndCreatePaymentsAsync(tournamentId);
        return Ok(payments);
    }

    [HttpGet("/api/players/{playerId:guid}/payments")]
    public async Task<IActionResult> GetPlayerPayments(Guid playerId)
    {
        var payments = await paymentService.GetPaymentsByPlayerAsync(playerId);
        return Ok(payments);
    }

    [HttpGet("/api/players/{playerId:guid}/debts")]
    public async Task<IActionResult> GetPlayerDebts(Guid playerId)
    {
        var debts = await paymentService.GetPendingDebtsByPlayerAsync(playerId);
        return Ok(debts);
    }

    [HttpGet("/api/players/{playerId:guid}/credits")]
    public async Task<IActionResult> GetPlayerCredits(Guid playerId)
    {
        var credits = await paymentService.GetPendingPaymentsToReceiveAsync(playerId);
        return Ok(credits);
    }

    [HttpGet("/api/tournaments/{tournamentId:guid}/payments/balances")]
    public async Task<IActionResult> GetTournamentBalances(Guid tournamentId)
    {
        var balances = await paymentService.GetTournamentPlayerBalancesAsync(tournamentId);
        return Ok(balances);
    }

    [HttpPost("{paymentId:guid}/mark-paid")]
    public async Task<IActionResult> MarkAsPaid(Guid paymentId, [FromBody] MarkPaidRequest body)
    {
        var ok = await paymentService.MarkAsPaidAsync(paymentId, body.FromPlayerId);
        if (!ok) return BadRequest(new { message = "Não foi possível marcar como pago." });
        return NoContent();
    }

    [HttpPost("{paymentId:guid}/confirm")]
    public async Task<IActionResult> ConfirmPayment(Guid paymentId, [FromBody] ConfirmPaymentRequest body)
    {
        var ok = await paymentService.ConfirmPaymentAsync(paymentId, body.ToPlayerId);
        if (!ok) return BadRequest(new { message = "Não foi possível confirmar o pagamento." });
        return NoContent();
    }

    [HttpPost("{paymentId:guid}/admin-mark-paid")]
    public async Task<IActionResult> AdminMarkAsPaid(Guid paymentId)
    {
        var (success, message) = await paymentService.AdminMarkAsPaidAsync(paymentId, GetUserId());
        if (!success) return BadRequest(new { message });
        return NoContent();
    }

    [HttpPost("{paymentId:guid}/admin-confirm")]
    public async Task<IActionResult> AdminConfirmPayment(Guid paymentId)
    {
        var (success, message) = await paymentService.AdminConfirmPaymentAsync(paymentId, GetUserId());
        if (!success) return BadRequest(new { message });
        return NoContent();
    }

    [HttpPost("bulk-confirm")]
    public async Task<IActionResult> BulkConfirm([FromBody] BulkConfirmRequest body)
    {
        var count = await paymentService.BulkConfirmPaymentsAsync(body.PaymentIds, GetUserId());
        return Ok(new { confirmed = count });
    }

    [HttpGet("organizer")]
    public async Task<IActionResult> GetOrganizerPayments()
    {
        var payments = await paymentService.GetPaymentsForOrganizerAsync(GetUserId());
        return Ok(payments);
    }
}

public record MarkPaidRequest(Guid FromPlayerId);
public record ConfirmPaymentRequest(Guid ToPlayerId);
public record BulkConfirmRequest(IList<Guid> PaymentIds);
