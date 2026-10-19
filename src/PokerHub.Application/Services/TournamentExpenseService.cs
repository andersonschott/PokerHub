using PokerHub.Application.Exceptions;
using PokerHub.Application.Helpers;
using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.Expense;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Services;

public class TournamentExpenseService : ITournamentExpenseService
{
    private readonly PokerHubDbContext _context;

    public TournamentExpenseService(PokerHubDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<TournamentExpenseDto>> GetExpensesByTournamentAsync(Guid tournamentId)
    {
        var expenses = await _context.TournamentExpenses
            .Where(e => e.TournamentId == tournamentId)
            .Include(e => e.PaidByPlayer)
            .Include(e => e.Shares)
                .ThenInclude(s => s.Player)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        return expenses.Select(MapToDto).ToList();
    }

    public async Task<TournamentExpenseDto?> GetExpenseByIdAsync(Guid expenseId)
    {
        var expense = await _context.TournamentExpenses
            .Include(e => e.PaidByPlayer)
            .Include(e => e.Shares)
                .ThenInclude(s => s.Player)
            .FirstOrDefaultAsync(e => e.Id == expenseId);

        return expense != null ? MapToDto(expense) : null;
    }

    public Task<TournamentExpenseDto> CreateExpenseAsync(Guid tournamentId, CreateExpenseDto dto)
        => MutationScope.RunAsync(_context, tournamentId, "Despesa criada", () => CreateExpenseCoreAsync(tournamentId, dto));

    private async Task<TournamentExpenseDto> CreateExpenseCoreAsync(Guid tournamentId, CreateExpenseDto dto)
    {
        // Validate tournament exists
        var tournament = await _context.Tournaments
            .Include(t => t.Players)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null)
            throw new InvalidOperationException("Torneio nao encontrado");

        await EnsureExpensesEditableAsync(tournamentId);
        _ = BuildShares(Guid.Empty, dto);
        // Validate payer is from the league
        var payer = await _context.Players
            .FirstOrDefaultAsync(p => p.Id == dto.PaidByPlayerId && p.LeagueId == tournament.LeagueId && p.IsActive);

        if (payer == null)
            throw new InvalidOperationException("Jogador pagador nao encontrado ou nao pertence a liga");

        // Validate all share players are checked-in tournament participants
        var checkedInPlayerIds = tournament.Players
            .Where(tp => tp.IsCheckedIn)
            .Select(tp => tp.PlayerId)
            .ToHashSet();

        var sharePlayerIds = dto.Shares.Select(s => s.PlayerId).ToList();
        if (sharePlayerIds.Any(id => !checkedInPlayerIds.Contains(id)))
            throw new InvalidOperationException("Todos os jogadores da divisao devem estar com check-in no torneio");

        if (!sharePlayerIds.Any())
            throw new InvalidOperationException("Selecione pelo menos um jogador para dividir a despesa");

        var expense = new TournamentExpense
        {
            Id = Guid.NewGuid(),
            TournamentId = tournamentId,
            PaidByPlayerId = dto.PaidByPlayerId,
            Description = dto.Description,
            TotalAmount = dto.TotalAmount,
            SplitType = dto.SplitType,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var share in BuildShares(expense.Id, dto)) expense.Shares.Add(share);

        _context.TournamentExpenses.Add(expense);
        await _context.SaveChangesAsync();

        return await GetExpenseByIdAsync(expense.Id)
            ?? throw new InvalidOperationException("Falha ao recarregar despesa criada");
    }

    public async Task<bool> UpdateExpenseAsync(Guid expenseId, CreateExpenseDto dto)
    {
        var tournamentId = await _context.TournamentExpenses.AsNoTracking().Where(e => e.Id == expenseId).Select(e => (Guid?)e.TournamentId).FirstOrDefaultAsync();
        if (tournamentId == null) return false;
        return await MutationScope.RunAsync(_context, tournamentId.Value, "Despesa atualizada", () => UpdateExpenseCoreAsync(expenseId, dto));
    }

    private async Task<bool> UpdateExpenseCoreAsync(Guid expenseId, CreateExpenseDto dto)
    {
        var expense = await _context.TournamentExpenses
            .Include(e => e.Shares)
            .FirstOrDefaultAsync(e => e.Id == expenseId);

        if (expense == null) return false;

        // Get tournament for validation
        var tournament = await _context.Tournaments
            .Include(t => t.Players)
            .FirstOrDefaultAsync(t => t.Id == expense.TournamentId);

        if (tournament == null) return false;
        await EnsureExpensesEditableAsync(expense.TournamentId);
        _ = BuildShares(Guid.Empty, dto);

        // Validate payer
        var payer = await _context.Players
            .FirstOrDefaultAsync(p => p.Id == dto.PaidByPlayerId && p.LeagueId == tournament.LeagueId && p.IsActive);

        if (payer == null)
            throw new InvalidOperationException("Jogador pagador nao encontrado ou nao pertence a liga");

        // Validate share players
        var checkedInPlayerIds = tournament.Players
            .Where(tp => tp.IsCheckedIn)
            .Select(tp => tp.PlayerId)
            .ToHashSet();

        var sharePlayerIds = dto.Shares.Select(s => s.PlayerId).ToList();
        if (sharePlayerIds.Any(id => !checkedInPlayerIds.Contains(id)))
            throw new InvalidOperationException("Todos os jogadores da divisao devem estar com check-in no torneio");

        var newShares = BuildShares(expenseId, dto);
        expense.PaidByPlayerId = dto.PaidByPlayerId;
        expense.Description = dto.Description;
        expense.TotalAmount = dto.TotalAmount;
        expense.SplitType = dto.SplitType;
        _context.TournamentExpenseShares.RemoveRange(expense.Shares);
        _context.TournamentExpenseShares.AddRange(newShares);

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteExpenseAsync(Guid expenseId)
    {
        var tournamentId = await _context.TournamentExpenses.AsNoTracking().Where(e => e.Id == expenseId).Select(e => (Guid?)e.TournamentId).FirstOrDefaultAsync();
        if (tournamentId == null) return false;
        return await MutationScope.RunAsync(_context, tournamentId.Value, "Despesa removida", () => DeleteExpenseCoreAsync(expenseId));
    }

    private async Task<bool> DeleteExpenseCoreAsync(Guid expenseId)
    {
        var expense = await _context.TournamentExpenses.FindAsync(expenseId);
        if (expense == null) return false;

        await EnsureExpensesEditableAsync(expense.TournamentId);
        _context.TournamentExpenses.Remove(expense);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<ExpenseSummaryDto>> GetExpenseSummaryByTournamentAsync(Guid tournamentId)
    {
        var expenses = await _context.TournamentExpenses
            .Where(e => e.TournamentId == tournamentId)
            .Include(e => e.PaidByPlayer)
            .Include(e => e.Shares)
                .ThenInclude(s => s.Player)
            .ToListAsync();

        var playerSummaries = new Dictionary<Guid, (string Name, decimal Paid, decimal Owed)>();

        foreach (var expense in expenses)
        {
            // Track who paid
            if (!playerSummaries.ContainsKey(expense.PaidByPlayerId))
                playerSummaries[expense.PaidByPlayerId] = (expense.PaidByPlayer.Name, 0, 0);

            var current = playerSummaries[expense.PaidByPlayerId];
            playerSummaries[expense.PaidByPlayerId] = (current.Name, current.Paid + expense.TotalAmount, current.Owed);

            // Track who owes
            foreach (var share in expense.Shares)
            {
                if (!playerSummaries.ContainsKey(share.PlayerId))
                    playerSummaries[share.PlayerId] = (share.Player.Name, 0, 0);

                current = playerSummaries[share.PlayerId];
                playerSummaries[share.PlayerId] = (current.Name, current.Paid, current.Owed + share.Amount);
            }
        }

        return playerSummaries
            .Select(kvp => new ExpenseSummaryDto(
                kvp.Key,
                kvp.Value.Name,
                kvp.Value.Paid,
                kvp.Value.Owed,
                kvp.Value.Paid - kvp.Value.Owed
            ))
            .OrderByDescending(s => Math.Abs(s.ExpenseBalance))
            .ToList();
    }

    public async Task<IReadOnlyList<PlayerDto>> GetEligiblePlayersForShareAsync(Guid tournamentId)
    {
        var players = await _context.TournamentPlayers
            .Where(tp => tp.TournamentId == tournamentId && tp.IsCheckedIn)
            .Include(tp => tp.Player)
                .ThenInclude(p => p.Participations)
                    .ThenInclude(part => part.Tournament)
            .Select(tp => tp.Player)
            .ToListAsync();

        return players.Select(p => MapToPlayerDto(p)).ToList();
    }

    public async Task<IReadOnlyList<PlayerDto>> GetLeaguePlayersAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament == null) return new List<PlayerDto>();

        var players = await _context.Players
            .Where(p => p.LeagueId == tournament.LeagueId && p.IsActive && p.MembershipStatus == PlayerMembershipStatus.Active)
            .Include(p => p.Participations)
                .ThenInclude(part => part.Tournament)
            .ToListAsync();

        return players.Select(p => MapToPlayerDto(p)).ToList();
    }

    private async Task EnsureExpensesEditableAsync(Guid tournamentId)
    {
        if (await _context.Payments.AnyAsync(p => p.TournamentId == tournamentId))
            throw new BusinessRuleException("O acerto já foi gerado. As despesas estão protegidas para manter os pagamentos corretos.");
    }

    private static List<TournamentExpenseShare> BuildShares(Guid expenseId, CreateExpenseDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Description) || dto.TotalAmount <= 0 || FinancialMath.RoundCents(dto.TotalAmount) != dto.TotalAmount
            || !Enum.IsDefined(dto.SplitType) || dto.Shares.Count == 0
            || dto.Shares.Select(s => s.PlayerId).Distinct().Count() != dto.Shares.Count)
            throw new BusinessRuleException("Informe uma descrição, valor positivo com até duas casas decimais e participantes sem repetições.");
        if (dto.SplitType == ExpenseSplitType.Custom && (dto.Shares.Any(s => s.Amount < 0 || FinancialMath.RoundCents(s.Amount) != s.Amount) || dto.Shares.Sum(s => s.Amount) != dto.TotalAmount))
            throw new BusinessRuleException("As cotas devem ser não negativas e somar exatamente o valor da despesa.");
        var cents = dto.TotalAmount * 100;
        var baseCents = Math.Floor(cents / dto.Shares.Count);
        var remainder = cents - baseCents * dto.Shares.Count;
        return dto.Shares.Select((share, index) => new TournamentExpenseShare
        {
            Id = Guid.NewGuid(), ExpenseId = expenseId, PlayerId = share.PlayerId,
            Amount = dto.SplitType == ExpenseSplitType.Equal ? (baseCents + (index < remainder ? 1 : 0)) / 100 : share.Amount
        }).ToList();
    }

    private static TournamentExpenseDto MapToDto(TournamentExpense e) => new(
        e.Id,
        e.TournamentId,
        e.PaidByPlayerId,
        e.PaidByPlayer.Name,
        e.Description,
        e.TotalAmount,
        e.SplitType,
        e.CreatedAt,
        e.Shares.Select(s => new ExpenseShareDto(s.Id, s.PlayerId, s.Player.Name, s.Amount)).ToList()
    );

    private static PlayerDto MapToPlayerDto(Domain.Entities.Player player)
    {
        var finishedParticipations = player.Participations?
            .Where(tp => tp.IsCheckedIn && tp.Tournament?.Status == TournamentStatus.Finished)
            .ToList() ?? new List<TournamentPlayer>();

        var totalBuyIns = finishedParticipations.Sum(tp => tp.TotalInvestment(tp.Tournament!));
        var totalPrizes = finishedParticipations.Sum(tp => tp.Prize);

        return new PlayerDto(
            player.Id,
            player.LeagueId,
            player.Name,
            player.Nickname,
            player.Email,
            player.Phone,
            player.PixKey,
            player.PixKeyType,
            player.UserId,
            player.CreatedAt,
            player.IsActive,
            player.MembershipStatus,
            totalPrizes - totalBuyIns,
            finishedParticipations.Count,
            finishedParticipations.Count(tp => tp.Position == 1),
            finishedParticipations.Count(tp => tp.Position == 2),
            finishedParticipations.Count(tp => tp.Position == 3),
            totalBuyIns,
            totalPrizes,
            finishedParticipations.Count(tp => tp.Prize > 0)
        );
    }
}
