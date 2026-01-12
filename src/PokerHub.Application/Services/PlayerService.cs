using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.Payment;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Services;

public class PlayerService : IPlayerService
{
    private readonly PokerHubDbContext _context;

    public PlayerService(PokerHubDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<PlayerDto>> GetPlayersByLeagueAsync(Guid leagueId)
    {
        var players = await _context.Players
            .Where(p => p.LeagueId == leagueId && p.IsActive)
            .Include(p => p.Participations)
                .ThenInclude(tp => tp.Tournament)
            .ToListAsync();

        return players.Select(p => MapToDto(p)).ToList();
    }

    public async Task<PlayerDto?> GetPlayerByIdAsync(Guid playerId)
    {
        var player = await _context.Players
            .Include(p => p.Participations)
                .ThenInclude(tp => tp.Tournament)
            .FirstOrDefaultAsync(p => p.Id == playerId);

        return player != null ? MapToDto(player) : null;
    }

    public async Task<PlayerDto?> GetPlayerByUserIdAsync(string userId)
    {
        var player = await _context.Players
            .Where(p => p.UserId == userId && p.IsActive)
            .Include(p => p.Participations)
                .ThenInclude(tp => tp.Tournament)
            .FirstOrDefaultAsync();

        return player != null ? MapToDto(player) : null;
    }

    public async Task<IReadOnlyList<PlayerDto>> GetAllPlayersByUserAsync(string userId)
    {
        var players = await _context.Players
            .Where(p => p.UserId == userId && p.IsActive)
            .Include(p => p.Participations)
                .ThenInclude(tp => tp.Tournament)
            .ToListAsync();

        return players.Select(p => MapToDto(p)).ToList();
    }

    public async Task<PlayerStatsDto?> GetPlayerStatsAsync(Guid playerId)
    {
        var player = await _context.Players
            .Include(p => p.Participations)
                .ThenInclude(tp => tp.Tournament)
            .FirstOrDefaultAsync(p => p.Id == playerId);

        if (player == null) return null;

        var finishedParticipations = player.Participations
            .Where(tp => tp.Tournament.Status == TournamentStatus.Finished)
            .ToList();

        var results = finishedParticipations
            .Select(tp => new PlayerTournamentResultDto(
                tp.TournamentId,
                tp.Tournament.Name,
                tp.Tournament.ScheduledDateTime,
                tp.Position,
                tp.Tournament.Players.Count,
                tp.TotalInvestment(tp.Tournament),
                tp.Prize,
                tp.ProfitLoss(tp.Tournament)
            ))
            .OrderByDescending(r => r.Date)
            .Take(10)
            .ToList();

        var profits = finishedParticipations.Select(tp => tp.ProfitLoss(tp.Tournament)).ToList();
        var positions = finishedParticipations.Where(tp => tp.Position.HasValue).Select(tp => tp.Position!.Value).ToList();

        var wins = finishedParticipations.Count(tp => tp.Position == 1);
        var seconds = finishedParticipations.Count(tp => tp.Position == 2);
        var thirds = finishedParticipations.Count(tp => tp.Position == 3);

        return new PlayerStatsDto(
            player.Id,
            player.Name,
            player.Nickname,
            finishedParticipations.Count,
            wins,
            seconds,
            thirds,
            wins + seconds + thirds,
            finishedParticipations.Sum(tp => tp.TotalInvestment(tp.Tournament)),
            finishedParticipations.Sum(tp => tp.Prize),
            profits.Sum(),
            profits.Count > 0 ? profits.Max() : null,
            profits.Count > 0 ? profits.Min() : null,
            positions.Count > 0 ? (decimal)positions.Average() : 0,
            results
        );
    }

    public async Task<PlayerDto> CreatePlayerAsync(Guid leagueId, CreatePlayerDto dto)
    {
        var player = new Player
        {
            Id = Guid.NewGuid(),
            LeagueId = leagueId,
            Name = dto.Name,
            Nickname = dto.Nickname,
            Email = dto.Email,
            Phone = dto.Phone,
            PixKey = dto.PixKey,
            PixKeyType = dto.PixKeyType,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.Players.Add(player);
        await _context.SaveChangesAsync();

        return MapToDto(player);
    }

    public async Task<PlayerDto?> UpdatePlayerAsync(Guid playerId, UpdatePlayerDto dto)
    {
        var player = await _context.Players
            .Include(p => p.Participations)
                .ThenInclude(tp => tp.Tournament)
            .FirstOrDefaultAsync(p => p.Id == playerId);

        if (player == null) return null;

        player.Name = dto.Name;
        player.Nickname = dto.Nickname;
        player.Email = dto.Email;
        player.Phone = dto.Phone;
        player.PixKey = dto.PixKey;
        player.PixKeyType = dto.PixKeyType;

        await _context.SaveChangesAsync();

        return MapToDto(player);
    }

    public async Task<(bool Success, string Message)> DeletePlayerAsync(Guid playerId, bool checkDebts = true)
    {
        var player = await _context.Players
            .Include(p => p.Participations)
            .FirstOrDefaultAsync(p => p.Id == playerId);

        if (player == null)
            return (false, "Jogador não encontrado.");

        if (!player.IsActive)
            return (false, "Jogador já foi removido.");

        // Check for pending debts (both as debtor and creditor)
        if (checkDebts)
        {
            var hasPendingDebts = await _context.Payments
                .AnyAsync(p => p.FromPlayerId == playerId && p.Status == PaymentStatus.Pending);

            if (hasPendingDebts)
                return (false, "Não é possível remover o jogador. Existem débitos pendentes.");

            var hasPendingCredits = await _context.Payments
                .AnyAsync(p => p.ToPlayerId == playerId && p.Status == PaymentStatus.Pending);

            if (hasPendingCredits)
                return (false, "Não é possível remover o jogador. Existem créditos pendentes a receber.");
        }

        // Check if player has any tournament history
        var hasHistory = player.Participations.Any();

        if (hasHistory)
        {
            // Soft delete - keep the record for history/rankings
            player.IsActive = false;
            player.UserId = null; // Unlink from user account
            await _context.SaveChangesAsync();
            return (true, "Jogador removido. O histórico foi mantido nos rankings.");
        }
        else
        {
            // Hard delete - no history, remove completely
            _context.Players.Remove(player);
            await _context.SaveChangesAsync();
            return (true, "Jogador excluído com sucesso.");
        }
    }

    public async Task<bool> LinkPlayerToUserAsync(Guid playerId, string? userId)
    {
        var player = await _context.Players.FindAsync(playerId);
        if (player == null) return false;

        player.UserId = userId;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<PendingDebtDto>> GetPendingDebtsAsync(Guid playerId)
    {
        // Filter out jackpot payments (ToPlayerId == null) - those are not player-to-player debts
        var debts = await _context.Payments
            .Where(p => p.FromPlayerId == playerId && p.Status == PaymentStatus.Pending && p.ToPlayerId != null)
            .Include(p => p.Tournament)
            .Include(p => p.ToPlayer)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new PendingDebtDto(
                p.Id,
                p.TournamentId,
                p.Tournament.Name,
                p.Tournament.ScheduledDateTime,
                p.ToPlayerId!.Value,
                p.ToPlayer!.Name,
                p.ToPlayer!.PixKey,
                p.Amount,
                (DateTime.UtcNow - p.CreatedAt).Days
            ))
            .ToListAsync();

        return debts;
    }

    public async Task<bool> HasPendingDebtsAsync(Guid playerId)
    {
        return await _context.Payments
            .AnyAsync(p => p.FromPlayerId == playerId && p.Status == PaymentStatus.Pending);
    }

    public async Task<int> LinkPlayersByEmailAsync(string email, string userId)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(userId))
            return 0;

        var playersToLink = await _context.Players
            .Where(p => p.Email != null &&
                        p.Email.ToLower() == email.ToLower() &&
                        p.UserId == null &&
                        p.IsActive)
            .ToListAsync();

        foreach (var player in playersToLink)
        {
            player.UserId = userId;
        }

        if (playersToLink.Count > 0)
        {
            await _context.SaveChangesAsync();
        }

        return playersToLink.Count;
    }

    private static PlayerDto MapToDto(Player player)
    {
        var finishedParticipations = player.Participations
            .Where(tp => tp.Tournament.Status == TournamentStatus.Finished)
            .ToList();

        var totalBuyIns = finishedParticipations.Sum(tp => tp.TotalInvestment(tp.Tournament));
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
