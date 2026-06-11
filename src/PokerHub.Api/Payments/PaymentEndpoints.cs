using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.Interfaces;

namespace PokerHub.Api.Payments;

public static class PaymentEndpoints
{
    public static void Map(WebApplication app)
    {
        // -------------------------------------------------------------------------
        // Tournament-scoped payment routes
        // -------------------------------------------------------------------------
        var t = app.MapGroup("/api/tournaments")
            .WithTags("Payments")
            .RequireAuthorization();

        // GET /api/tournaments/{id}/payments
        t.MapGet("/{id:guid}/payments", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            IPaymentService payments) =>
        {
            var tournament = await tournaments.GetTournamentByIdAsync(id);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var list = await payments.GetPaymentsByTournamentAsync(id);
            return Results.Ok(list);
        });

        // POST /api/tournaments/{id}/payments/calculate
        t.MapPost("/{id:guid}/payments/calculate", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            IPaymentService payments) =>
        {
            var tournament = await tournaments.GetTournamentByIdAsync(id);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var list = await payments.CalculateAndCreatePaymentsAsync(id);
            return Results.Ok(list);
        });

        // GET /api/tournaments/{id}/payments/balances
        t.MapGet("/{id:guid}/payments/balances", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            IPaymentService payments) =>
        {
            var tournament = await tournaments.GetTournamentByIdAsync(id);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var balances = await payments.GetTournamentPlayerBalancesAsync(id);
            return Results.Ok(balances);
        });

        // GET /api/tournaments/{id}/payments/jackpot-contribution
        t.MapGet("/{id:guid}/payments/jackpot-contribution", async (
            Guid id,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            IPaymentService payments) =>
        {
            var tournament = await tournaments.GetTournamentByIdAsync(id);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var amount = await payments.GetJackpotContributionAsync(id);
            return Results.Ok(new { Amount = amount });
        });

        // -------------------------------------------------------------------------
        // Payment-id-scoped routes
        // -------------------------------------------------------------------------
        var p = app.MapGroup("/api/payments")
            .WithTags("Payments")
            .RequireAuthorization();

        // GET /api/payments/my-debts  — logged-in user's pending debts
        // Resolves the player across all leagues via GetPlayerByUserIdAsync.
        // If the user has no linked player, returns an empty list.
        p.MapGet("/my-debts", async (
            ClaimsPrincipal user,
            IPlayerService players,
            IPaymentService payments) =>
        {
            var player = await players.GetPlayerByUserIdAsync(user.GetUserId());
            if (player is null)
                return Results.Ok(Array.Empty<object>());

            var debts = await payments.GetPendingDebtsByPlayerAsync(player.Id);
            return Results.Ok(debts);
        });

        // GET /api/payments/organizer  — payments for leagues organized by current user
        p.MapGet("/organizer", async (
            ClaimsPrincipal user,
            IPaymentService payments) =>
        {
            var list = await payments.GetPaymentsForOrganizerAsync(user.GetUserId());
            return Results.Ok(list);
        });

        // POST /api/payments/bulk-confirm — organizer-only action.
        // Resolves authorization by cross-checking the requested payment IDs against the
        // set of payments belonging to leagues organized by the caller. Any ID not in that
        // authorized set means the caller lacks organizer rights for the target league(s).
        p.MapPost("/bulk-confirm", async (
            BulkConfirmRequest req,
            ClaimsPrincipal user,
            IPaymentService payments) =>
        {
            var userId = user.GetUserId();

            // Fetch all payments the caller is authorized to manage as organizer.
            var authorizedPayments = await payments.GetPaymentsForOrganizerAsync(userId);
            var authorizedIds = authorizedPayments.Select(p => p.Id).ToHashSet();

            // If any requested ID is outside the authorized set, the caller is not
            // an organizer for that payment's league — deny the whole request.
            if (req.PaymentIds.Any(id => !authorizedIds.Contains(id)))
                return Results.Forbid();

            var confirmed = await payments.BulkConfirmPaymentsAsync(req.PaymentIds, userId);
            return Results.Ok(new { Confirmed = confirmed });
        });

        // POST /api/payments/{paymentId}/mark-paid  — debtor self-marks payment as paid
        // Resolves the player via GetPlayerByUserIdAsync; returns 404 if payment not found
        // (service returns false when payment or player not found).
        p.MapPost("/{paymentId:guid}/mark-paid", async (
            Guid paymentId,
            ClaimsPrincipal user,
            IPlayerService players,
            IPaymentService payments) =>
        {
            var player = await players.GetPlayerByUserIdAsync(user.GetUserId());
            if (player is null)
                return Results.NotFound();

            var ok = await payments.MarkAsPaidAsync(paymentId, player.Id);
            return ok ? Results.Ok() : Results.NotFound();
        });

        // POST /api/payments/{paymentId}/confirm  — creditor confirms receipt
        p.MapPost("/{paymentId:guid}/confirm", async (
            Guid paymentId,
            ClaimsPrincipal user,
            IPlayerService players,
            IPaymentService payments) =>
        {
            var player = await players.GetPlayerByUserIdAsync(user.GetUserId());
            if (player is null)
                return Results.NotFound();

            var ok = await payments.ConfirmPaymentAsync(paymentId, player.Id);
            return ok ? Results.Ok() : Results.NotFound();
        });

        // POST /api/payments/{paymentId}/admin-mark-paid  — organizer marks paid on behalf
        p.MapPost("/{paymentId:guid}/admin-mark-paid", async (
            Guid paymentId,
            ClaimsPrincipal user,
            IPaymentService payments) =>
        {
            var userId = user.GetUserId();

            // Check that the caller is an organizer for the league that owns this payment
            // before delegating to the service, so non-organizers receive 403 not 400.
            var authorizedPayments = await payments.GetPaymentsForOrganizerAsync(userId);
            if (authorizedPayments.All(p => p.Id != paymentId))
                return Results.Forbid();

            var (success, message) = await payments.AdminMarkAsPaidAsync(paymentId, userId);
            return success
                ? Results.Ok(new { Message = message })
                : Results.BadRequest(new { Message = message });
        });

        // POST /api/payments/{paymentId}/admin-confirm  — organizer confirms on behalf
        p.MapPost("/{paymentId:guid}/admin-confirm", async (
            Guid paymentId,
            ClaimsPrincipal user,
            IPaymentService payments) =>
        {
            var userId = user.GetUserId();

            // Check that the caller is an organizer for the league that owns this payment
            // before delegating to the service, so non-organizers receive 403 not 400.
            var authorizedPayments = await payments.GetPaymentsForOrganizerAsync(userId);
            if (authorizedPayments.All(p => p.Id != paymentId))
                return Results.Forbid();

            var (success, message) = await payments.AdminConfirmPaymentAsync(paymentId, userId);
            return success
                ? Results.Ok(new { Message = message })
                : Results.BadRequest(new { Message = message });
        });

        // -------------------------------------------------------------------------
        // Player-scoped payment routes
        // -------------------------------------------------------------------------
        var pl = app.MapGroup("/api/players")
            .WithTags("Payments")
            .RequireAuthorization();

        // GET /api/players/{playerId}/payments
        pl.MapGet("/{playerId:guid}/payments", async (
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players,
            IPaymentService payments) =>
        {
            var player = await players.GetPlayerByIdAsync(playerId);
            if (player is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(player.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var list = await payments.GetPaymentsByPlayerAsync(playerId);
            return Results.Ok(list);
        });

        // GET /api/players/{playerId}/payments/pending-debts
        pl.MapGet("/{playerId:guid}/payments/pending-debts", async (
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players,
            IPaymentService payments) =>
        {
            var player = await players.GetPlayerByIdAsync(playerId);
            if (player is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(player.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var debts = await payments.GetPendingDebtsByPlayerAsync(playerId);
            return Results.Ok(debts);
        });

        // GET /api/players/{playerId}/payments/pending-to-receive
        pl.MapGet("/{playerId:guid}/payments/pending-to-receive", async (
            Guid playerId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            IPlayerService players,
            IPaymentService payments) =>
        {
            var player = await players.GetPlayerByIdAsync(playerId);
            if (player is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(player.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var pending = await payments.GetPendingPaymentsToReceiveAsync(playerId);
            return Results.Ok(pending);
        });
    }
}

// -------------------------------------------------------------------------
// Small request records
// -------------------------------------------------------------------------

internal record BulkConfirmRequest(IList<Guid> PaymentIds);
