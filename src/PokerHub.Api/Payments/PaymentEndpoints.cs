using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Enums;

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
            ITournamentService tournaments,
            IPaymentService payments) =>
        {
            var tournament = await tournaments.GetTournamentByIdAsync(id);
            if (tournament is null) return Results.NotFound();

            // Mesmo flag do finish: quem pode encerrar o torneio pode gerar o acerto.
            if (!await tournaments.HasDelegatePermissionAsync(id, user.GetUserId(), DelegatePermissions.Finish))
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

        // GET /api/payments/my-debts  — logged-in user's pending debts across ALL leagues.
        // Uses GetAllPlayersByUserAsync so users linked to players in multiple leagues see
        // debts from every league (not just the first player record found).
        p.MapGet("/my-debts", async (
            ClaimsPrincipal user,
            IPlayerService players,
            IPaymentService payments) =>
        {
            var userPlayers = await players.GetAllPlayersByUserAsync(user.GetUserId());
            if (userPlayers.Count == 0)
                return Results.Ok(Array.Empty<object>());

            var allDebts = new List<object>();
            foreach (var player in userPlayers)
            {
                var debts = await payments.GetPendingDebtsByPlayerAsync(player.Id);
                allDebts.AddRange(debts.Cast<object>());
            }

            return Results.Ok(allDebts);
        });

        // GET /api/payments/my-credits  — logged-in user's pending credits across ALL leagues.
        p.MapGet("/my-credits", async (
            ClaimsPrincipal user,
            IPlayerService players,
            IPaymentService payments) =>
        {
            var userPlayers = await players.GetAllPlayersByUserAsync(user.GetUserId());
            if (userPlayers.Count == 0)
                return Results.Ok(Array.Empty<object>());

            var allCredits = new List<object>();
            foreach (var player in userPlayers)
            {
                var credits = await payments.GetPendingPaymentsToReceiveAsync(player.Id);
                allCredits.AddRange(credits.Cast<object>());
            }

            return Results.Ok(allCredits);
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
            IPaymentService payments,
            ITournamentService tournaments) =>
        {
            var userId = user.GetUserId();

            // Fetch all payments the caller is authorized to manage as organizer.
            var authorizedPayments = await payments.GetPaymentsForOrganizerAsync(userId);
            var authorizedIds = authorizedPayments.Select(p => p.Id).ToHashSet();

            // IDs fora do conjunto de organizador ainda podem pertencer a torneios em que o
            // caller é delegado — mesmo contrato do admin-confirm. Qualquer ID que não passe
            // em nenhum dos dois nega a requisição inteira.
            var delegateOkTournaments = new Dictionary<Guid, bool>();
            foreach (var paymentId in req.PaymentIds.Where(id => !authorizedIds.Contains(id)))
            {
                var payment = await payments.GetPaymentByIdAsync(paymentId);
                if (payment is null) return Results.Forbid();

                if (!delegateOkTournaments.TryGetValue(payment.TournamentId, out var allowed))
                {
                    allowed = await tournaments.IsUserOrganizerOrDelegateAsync(payment.TournamentId, userId);
                    delegateOkTournaments[payment.TournamentId] = allowed;
                }

                if (!allowed) return Results.Forbid();
            }

            var confirmed = await payments.BulkConfirmPaymentsAsync(req.PaymentIds, userId);
            return Results.Ok(new { Confirmed = confirmed });
        });

        // POST /api/payments/{paymentId}/mark-paid  — debtor self-marks payment as paid.
        // Iterates ALL players linked to the user (across leagues) and tries each until one
        // succeeds, so users with players in multiple leagues are never incorrectly denied.
        p.MapPost("/{paymentId:guid}/mark-paid", async (
            Guid paymentId,
            ClaimsPrincipal user,
            IPlayerService players,
            IPaymentService payments) =>
        {
            var userPlayers = await players.GetAllPlayersByUserAsync(user.GetUserId());
            if (userPlayers.Count == 0)
                return Results.NotFound();

            foreach (var player in userPlayers)
            {
                var ok = await payments.MarkAsPaidAsync(paymentId, player.Id);
                if (ok) return Results.Ok();
            }

            return Results.NotFound();
        });

        // POST /api/payments/{paymentId}/confirm  — creditor confirms receipt.
        // Iterates ALL players linked to the user (across leagues) and tries each until one
        // succeeds, so users with players in multiple leagues are never incorrectly denied.
        p.MapPost("/{paymentId:guid}/confirm", async (
            Guid paymentId,
            ClaimsPrincipal user,
            IPlayerService players,
            IPaymentService payments) =>
        {
            var userPlayers = await players.GetAllPlayersByUserAsync(user.GetUserId());
            if (userPlayers.Count == 0)
                return Results.NotFound();

            foreach (var player in userPlayers)
            {
                var ok = await payments.ConfirmPaymentAsync(paymentId, player.Id);
                if (ok) return Results.Ok();
            }

            return Results.NotFound();
        });

        // POST /api/payments/{paymentId}/admin-mark-paid  — organizer marks paid on behalf.
        // Uses a targeted GetPaymentByIdAsync + IsUserOrganizerAsync instead of loading the
        // full organizer payment list just for an existence/ownership check.
        p.MapPost("/{paymentId:guid}/admin-mark-paid", async (
            Guid paymentId,
            ClaimsPrincipal user,
            IPaymentService payments,
            ITournamentService tournaments) =>
        {
            var userId = user.GetUserId();

            var payment = await payments.GetPaymentByIdAsync(paymentId);
            if (payment is null) return Results.NotFound();

            var tournament = await tournaments.GetTournamentByIdAsync(payment.TournamentId);
            if (tournament is null) return Results.NotFound();

            // O service (HasPaymentManagementPermissionAsync) já aceita organizador OU delegado —
            // o guard do endpoint segue o mesmo contrato para não bloquear delegado com 403 antes.
            if (!await tournaments.IsUserOrganizerOrDelegateAsync(payment.TournamentId, userId))
                return Results.Forbid();

            var (success, message) = await payments.AdminMarkAsPaidAsync(paymentId, userId);
            return success
                ? Results.Ok(new { Message = message })
                : Results.BadRequest(new { Message = message });
        });

        // POST /api/payments/{paymentId}/admin-confirm  — organizer confirms on behalf.
        // Uses a targeted GetPaymentByIdAsync + IsUserOrganizerAsync instead of loading the
        // full organizer payment list just for an existence/ownership check.
        p.MapPost("/{paymentId:guid}/admin-confirm", async (
            Guid paymentId,
            ClaimsPrincipal user,
            IPaymentService payments,
            ITournamentService tournaments) =>
        {
            var userId = user.GetUserId();

            var payment = await payments.GetPaymentByIdAsync(paymentId);
            if (payment is null) return Results.NotFound();

            var tournament = await tournaments.GetTournamentByIdAsync(payment.TournamentId);
            if (tournament is null) return Results.NotFound();

            if (!await tournaments.IsUserOrganizerOrDelegateAsync(payment.TournamentId, userId))
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
