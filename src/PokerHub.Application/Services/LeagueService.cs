using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.League;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Services;

public class LeagueService : ILeagueService
{
    private readonly PokerHubDbContext _context;

    public LeagueService(PokerHubDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<LeagueDto>> GetLeaguesByUserAsync(string userId)
    {
        return await _context.Leagues
            .Where(l => l.OrganizerId == userId && l.IsActive)
            .Include(l => l.Organizer)
            .Select(l => new LeagueDto(
                l.Id,
                l.Name,
                l.Description,
                l.InviteCode,
                l.OrganizerId,
                l.Organizer.Name,
                l.BlockCheckInWithDebt,
                l.Players.Count(p => p.IsActive),
                l.Tournaments.Count,
                l.JackpotPercentage,
                l.AccumulatedPrizePool,
                l.CreatedAt,
                l.IsActive
            ))
            .ToListAsync();
    }

    public async Task<LeagueDto?> GetLeagueByIdAsync(Guid leagueId)
    {
        return await _context.Leagues
            .Where(l => l.Id == leagueId)
            .Include(l => l.Organizer)
            .Select(l => new LeagueDto(
                l.Id,
                l.Name,
                l.Description,
                l.InviteCode,
                l.OrganizerId,
                l.Organizer.Name,
                l.BlockCheckInWithDebt,
                l.Players.Count(p => p.IsActive),
                l.Tournaments.Count,
                l.JackpotPercentage,
                l.AccumulatedPrizePool,
                l.CreatedAt,
                l.IsActive
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<LeagueWithPlayersDto?> GetLeagueWithPlayersAsync(Guid leagueId)
    {
        var league = await _context.Leagues
            .Where(l => l.Id == leagueId)
            .Include(l => l.Organizer)
            .Include(l => l.Players.Where(p => p.IsActive))
                .ThenInclude(p => p.Participations)
                    .ThenInclude(tp => tp.Tournament)
            .FirstOrDefaultAsync();

        if (league == null) return null;

        var players = league.Players.Select(p =>
        {
            var finishedParticipations = p.Participations
                .Where(tp => tp.Tournament != null && tp.Tournament.Status == TournamentStatus.Finished)
                .ToList();
            var totalBuyIns = finishedParticipations.Sum(tp => tp.TotalInvestment(tp.Tournament!));
            var totalPrizes = finishedParticipations.Sum(tp => tp.Prize);

            return new PlayerDto(
                p.Id,
                p.LeagueId,
                p.Name,
                p.Nickname,
                p.Email,
                p.Phone,
                p.PixKey,
                p.PixKeyType,
                p.UserId,
                p.CreatedAt,
                p.IsActive,
                totalPrizes - totalBuyIns,
                finishedParticipations.Count,
                finishedParticipations.Count(tp => tp.Position == 1),
                finishedParticipations.Count(tp => tp.Position == 2),
                finishedParticipations.Count(tp => tp.Position == 3),
                totalBuyIns,
                totalPrizes,
                finishedParticipations.Count(tp => tp.Prize > 0)
            );
        }).ToList();

        return new LeagueWithPlayersDto(
            league.Id,
            league.Name,
            league.Description,
            league.InviteCode,
            league.OrganizerId,
            league.Organizer.Name,
            league.BlockCheckInWithDebt,
            league.CreatedAt,
            league.IsActive,
            players
        );
    }

    public async Task<LeagueDto?> GetLeagueByInviteCodeAsync(string inviteCode)
    {
        return await _context.Leagues
            .Where(l => l.InviteCode == inviteCode && l.IsActive)
            .Include(l => l.Organizer)
            .Select(l => new LeagueDto(
                l.Id,
                l.Name,
                l.Description,
                l.InviteCode,
                l.OrganizerId,
                l.Organizer.Name,
                l.BlockCheckInWithDebt,
                l.Players.Count(p => p.IsActive),
                l.Tournaments.Count,
                l.JackpotPercentage,
                l.AccumulatedPrizePool,
                l.CreatedAt,
                l.IsActive
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<LeagueDto> CreateLeagueAsync(string organizerId, CreateLeagueDto dto)
    {
        var user = await _context.Users.FindAsync(organizerId);
        if (user == null)
            throw new InvalidOperationException("Usuário não encontrado");

        var league = new League
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            InviteCode = League.GenerateInviteCode(),
            OrganizerId = organizerId,
            BlockCheckInWithDebt = dto.BlockCheckInWithDebt,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.Leagues.Add(league);
        await _context.SaveChangesAsync();

        return new LeagueDto(
            league.Id,
            league.Name,
            league.Description,
            league.InviteCode,
            league.OrganizerId,
            user.Name,
            league.BlockCheckInWithDebt,
            0,
            0,
            league.JackpotPercentage,
            league.AccumulatedPrizePool,
            league.CreatedAt,
            league.IsActive
        );
    }

    public async Task<LeagueDto?> UpdateLeagueAsync(Guid leagueId, UpdateLeagueDto dto)
    {
        var league = await _context.Leagues
            .Include(l => l.Organizer)
            .FirstOrDefaultAsync(l => l.Id == leagueId);

        if (league == null) return null;

        league.Name = dto.Name;
        league.Description = dto.Description;
        league.BlockCheckInWithDebt = dto.BlockCheckInWithDebt;
        league.JackpotPercentage = dto.JackpotPercentage;

        await _context.SaveChangesAsync();

        var playerCount = await _context.Players.CountAsync(p => p.LeagueId == leagueId && p.IsActive);
        var tournamentCount = await _context.Tournaments.CountAsync(t => t.LeagueId == leagueId);

        return new LeagueDto(
            league.Id,
            league.Name,
            league.Description,
            league.InviteCode,
            league.OrganizerId,
            league.Organizer.Name,
            league.BlockCheckInWithDebt,
            playerCount,
            tournamentCount,
            league.JackpotPercentage,
            league.AccumulatedPrizePool,
            league.CreatedAt,
            league.IsActive
        );
    }

    public async Task<string> RegenerateInviteCodeAsync(Guid leagueId)
    {
        var league = await _context.Leagues.FindAsync(leagueId);
        if (league == null)
            throw new InvalidOperationException("Liga não encontrada");

        league.RegenerateInviteCode();
        await _context.SaveChangesAsync();

        return league.InviteCode;
    }

    public async Task<bool> DeleteLeagueAsync(Guid leagueId)
    {
        var league = await _context.Leagues.FindAsync(leagueId);
        if (league == null) return false;

        league.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> IsUserOrganizerAsync(Guid leagueId, string userId)
    {
        return await _context.Leagues
            .AnyAsync(l => l.Id == leagueId && l.OrganizerId == userId);
    }

    public async Task<IReadOnlyList<LeagueDto>> GetLeaguesAsPlayerAsync(string userId)
    {
        // Get league IDs where the user is a linked player
        var leagueIds = await _context.Players
            .Where(p => p.UserId == userId && p.IsActive)
            .Select(p => p.LeagueId)
            .Distinct()
            .ToListAsync();

        // Exclude leagues where user is organizer (those are returned by GetLeaguesByUserAsync)
        return await _context.Leagues
            .Where(l => leagueIds.Contains(l.Id) && l.IsActive && l.OrganizerId != userId)
            .Include(l => l.Organizer)
            .Select(l => new LeagueDto(
                l.Id,
                l.Name,
                l.Description,
                l.InviteCode,
                l.OrganizerId,
                l.Organizer.Name,
                l.BlockCheckInWithDebt,
                l.Players.Count(p => p.IsActive),
                l.Tournaments.Count,
                l.JackpotPercentage,
                l.AccumulatedPrizePool,
                l.CreatedAt,
                l.IsActive
            ))
            .ToListAsync();
    }

    public async Task<bool> CanUserAccessLeagueAsync(Guid leagueId, string userId)
    {
        var league = await _context.Leagues
            .Include(l => l.Players)
            .FirstOrDefaultAsync(l => l.Id == leagueId && l.IsActive);

        if (league == null)
            return false;

        // Organizer can always access
        if (league.OrganizerId == userId)
            return true;

        // Linked player can access
        return league.Players.Any(p => p.UserId == userId && p.IsActive);
    }

    public async Task<(bool Success, string Message)> JoinLeagueAsync(
        Guid leagueId,
        string userId,
        string userName,
        string? userEmail,
        string? nickname = null,
        string? phone = null,
        string? pixKey = null,
        PixKeyType? pixKeyType = null)
    {
        var league = await _context.Leagues
            .Include(l => l.Players)
            .FirstOrDefaultAsync(l => l.Id == leagueId && l.IsActive);

        if (league == null)
            return (false, "Liga não encontrada.");

        // Check if user is already the organizer
        if (league.OrganizerId == userId)
            return (false, "Você é o organizador desta liga.");

        // Check if user is already linked to a player in this league
        var existingLinkedPlayer = league.Players.FirstOrDefault(p => p.UserId == userId && p.IsActive);
        if (existingLinkedPlayer != null)
            return (false, "Você já é membro desta liga.");

        // Try to find an existing player by email (case-insensitive)
        Player? playerToLink = null;
        if (!string.IsNullOrEmpty(userEmail))
        {
            playerToLink = league.Players.FirstOrDefault(p =>
                p.IsActive &&
                p.UserId == null &&
                !string.IsNullOrEmpty(p.Email) &&
                p.Email.Equals(userEmail, StringComparison.OrdinalIgnoreCase));
        }

        if (playerToLink != null)
        {
            // Link existing player to user and update info if provided
            playerToLink.UserId = userId;
            if (!string.IsNullOrEmpty(nickname)) playerToLink.Nickname = nickname;
            if (!string.IsNullOrEmpty(phone)) playerToLink.Phone = phone;
            if (!string.IsNullOrEmpty(pixKey))
            {
                playerToLink.PixKey = pixKey;
                playerToLink.PixKeyType = pixKeyType;
            }
            await _context.SaveChangesAsync();
            return (true, $"Você foi vinculado ao jogador '{playerToLink.Name}' nesta liga.");
        }

        // Create a new player for the user
        var newPlayer = new Player
        {
            Id = Guid.NewGuid(),
            LeagueId = leagueId,
            Name = userName,
            Nickname = nickname,
            Email = userEmail,
            Phone = phone,
            PixKey = pixKey,
            PixKeyType = pixKeyType,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.Players.Add(newPlayer);
        await _context.SaveChangesAsync();

        return (true, "Você entrou na liga com sucesso!");
    }

    public async Task<(bool Success, string Message)> LeaveLeagueAsync(Guid leagueId, string userId)
    {
        var league = await _context.Leagues
            .Include(l => l.Players)
            .FirstOrDefaultAsync(l => l.Id == leagueId && l.IsActive);

        if (league == null)
            return (false, "Liga não encontrada.");

        // Check if user is the organizer
        if (league.OrganizerId == userId)
            return (false, "O organizador não pode sair da liga.");

        // Find the player linked to this user in this league
        var player = league.Players.FirstOrDefault(p => p.UserId == userId && p.IsActive);
        if (player == null)
            return (false, "Você não é membro desta liga.");

        // Check for pending debts (as debtor)
        var hasPendingDebts = await _context.Payments
            .AnyAsync(p => p.FromPlayerId == player.Id && p.Status == PaymentStatus.Pending);

        if (hasPendingDebts)
            return (false, "Não é possível sair da liga. Você possui débitos pendentes.");

        // Check for pending credits (as creditor)
        var hasPendingCredits = await _context.Payments
            .AnyAsync(p => p.ToPlayerId == player.Id && p.Status == PaymentStatus.Pending);

        if (hasPendingCredits)
            return (false, "Não é possível sair da liga. Você possui créditos pendentes a receber.");

        // Soft delete - keep the record for history/rankings
        player.IsActive = false;
        player.UserId = null; // Unlink from user account
        await _context.SaveChangesAsync();

        return (true, "Você saiu da liga com sucesso. Seu histórico permanece nos rankings.");
    }
}
