using System.Security.Claims;
using PokerHub.Api.Common;
using PokerHub.Application.DTOs.Expense;
using PokerHub.Application.Interfaces;

namespace PokerHub.Api.Expenses;

public static class ExpenseEndpoints
{
    public static void Map(WebApplication app)
    {
        // -------------------------------------------------------------------------
        // Tournament-scoped expense routes: /api/tournaments/{id}/expenses
        // Authorization: derive leagueId from the tournament entity.
        // -------------------------------------------------------------------------
        var tournamentGroup = app.MapGroup("/api/tournaments/{tournamentId:guid}/expenses")
            .WithTags("Expenses")
            .RequireAuthorization();

        // GET /api/tournaments/{tournamentId}/expenses
        tournamentGroup.MapGet("/", async (
            Guid tournamentId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            ITournamentExpenseService expenses) =>
        {
            var tournament = await tournaments.GetTournamentByIdAsync(tournamentId);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var list = await expenses.GetExpensesByTournamentAsync(tournamentId);
            return Results.Ok(list);
        });

        // GET /api/tournaments/{tournamentId}/expenses/summary
        tournamentGroup.MapGet("/summary", async (
            Guid tournamentId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            ITournamentExpenseService expenses) =>
        {
            var tournament = await tournaments.GetTournamentByIdAsync(tournamentId);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var summary = await expenses.GetExpenseSummaryByTournamentAsync(tournamentId);
            return Results.Ok(summary);
        });

        // GET /api/tournaments/{tournamentId}/expenses/eligible-players
        tournamentGroup.MapGet("/eligible-players", async (
            Guid tournamentId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            ITournamentExpenseService expenses) =>
        {
            var tournament = await tournaments.GetTournamentByIdAsync(tournamentId);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var players = await expenses.GetEligiblePlayersForShareAsync(tournamentId);
            return Results.Ok(players);
        });

        // GET /api/tournaments/{tournamentId}/expenses/league-players
        tournamentGroup.MapGet("/league-players", async (
            Guid tournamentId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            ITournamentExpenseService expenses) =>
        {
            var tournament = await tournaments.GetTournamentByIdAsync(tournamentId);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var players = await expenses.GetLeaguePlayersAsync(tournamentId);
            return Results.Ok(players);
        });

        // POST /api/tournaments/{tournamentId}/expenses  — organizer creates expense
        tournamentGroup.MapPost("/", async (
            Guid tournamentId,
            CreateExpenseDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            ITournamentExpenseService expenses) =>
        {
            var tournament = await tournaments.GetTournamentByIdAsync(tournamentId);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var created = await expenses.CreateExpenseAsync(tournamentId, dto);
            return Results.Created($"/api/expenses/{created.Id}", created);
        });

        // -------------------------------------------------------------------------
        // Expense-scoped routes: /api/expenses/{expenseId}
        // Authorization: derive leagueId via tournament.
        // -------------------------------------------------------------------------
        var expenseGroup = app.MapGroup("/api/expenses")
            .WithTags("Expenses")
            .RequireAuthorization();

        // GET /api/expenses/{expenseId}
        expenseGroup.MapGet("/{expenseId:guid}", async (
            Guid expenseId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            ITournamentExpenseService expenses) =>
        {
            var expense = await expenses.GetExpenseByIdAsync(expenseId);
            if (expense is null) return Results.NotFound();

            var tournament = await tournaments.GetTournamentByIdAsync(expense.TournamentId);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.CanUserAccessLeagueAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            return Results.Ok(expense);
        });

        // PUT /api/expenses/{expenseId}
        expenseGroup.MapPut("/{expenseId:guid}", async (
            Guid expenseId,
            CreateExpenseDto dto,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            ITournamentExpenseService expenses) =>
        {
            var expense = await expenses.GetExpenseByIdAsync(expenseId);
            if (expense is null) return Results.NotFound();

            var tournament = await tournaments.GetTournamentByIdAsync(expense.TournamentId);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await expenses.UpdateExpenseAsync(expenseId, dto);
            return ok ? Results.Ok() : Results.NotFound();
        });

        // DELETE /api/expenses/{expenseId}
        expenseGroup.MapDelete("/{expenseId:guid}", async (
            Guid expenseId,
            ClaimsPrincipal user,
            ILeagueService leagues,
            ITournamentService tournaments,
            ITournamentExpenseService expenses) =>
        {
            var expense = await expenses.GetExpenseByIdAsync(expenseId);
            if (expense is null) return Results.NotFound();

            var tournament = await tournaments.GetTournamentByIdAsync(expense.TournamentId);
            if (tournament is null) return Results.NotFound();

            if (!await leagues.IsUserOrganizerAsync(tournament.LeagueId, user.GetUserId()))
                return Results.Forbid();

            var ok = await expenses.DeleteExpenseAsync(expenseId);
            return ok ? Results.NoContent() : Results.NotFound();
        });
    }
}
