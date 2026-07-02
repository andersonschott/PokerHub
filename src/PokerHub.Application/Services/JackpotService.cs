using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.Jackpot;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Entities;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Services;

public class JackpotService : IJackpotService
{
    private readonly PokerHubDbContext _context;

    public JackpotService(PokerHubDbContext context)
    {
        _context = context;
    }

    public async Task<JackpotStatusDto> GetJackpotStatusAsync(Guid leagueId)
    {
        var league = await _context.Leagues.FindAsync(leagueId);
        if (league == null)
            throw new InvalidOperationException("Liga não encontrada");

        var contributions = await _context.JackpotContributions
            .Where(jc => jc.LeagueId == leagueId)
            .Include(jc => jc.Tournament)
            .OrderByDescending(jc => jc.CreatedAt)
            .Take(10)
            .Select(jc => new JackpotContributionDto(
                jc.Id,
                jc.TournamentId,
                jc.Tournament.Name,
                jc.Tournament.ScheduledDateTime,
                jc.TournamentPrizePool,
                jc.PercentageApplied,
                jc.Amount,
                jc.CreatedAt
            ))
            .ToListAsync();

        var totalContributions = await _context.JackpotContributions
            .CountAsync(jc => jc.LeagueId == leagueId);

        var derivedBalance = await GetDerivedBalanceAsync(leagueId);

        return new JackpotStatusDto(
            leagueId,
            derivedBalance,
            league.JackpotPercentage,
            totalContributions,
            contributions,
            league.JackpotPixKey,
            league.JackpotPixKeyType
        );
    }

    private async Task<decimal> GetDerivedBalanceAsync(Guid leagueId)
    {
        var totalContribs = await _context.JackpotContributions
            .Where(jc => jc.LeagueId == leagueId)
            .SumAsync(jc => (decimal?)jc.Amount) ?? 0m;

        var totalUsages = await _context.JackpotUsages
            .Where(ju => ju.LeagueId == leagueId)
            .SumAsync(ju => (decimal?)ju.Amount) ?? 0m;

        return totalContribs - totalUsages;
    }

    public async Task<IReadOnlyList<JackpotContributionDto>> GetContributionHistoryAsync(Guid leagueId)
    {
        return await _context.JackpotContributions
            .Where(jc => jc.LeagueId == leagueId)
            .Include(jc => jc.Tournament)
            .OrderByDescending(jc => jc.CreatedAt)
            .Select(jc => new JackpotContributionDto(
                jc.Id,
                jc.TournamentId,
                jc.Tournament.Name,
                jc.Tournament.ScheduledDateTime,
                jc.TournamentPrizePool,
                jc.PercentageApplied,
                jc.Amount,
                jc.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<bool> UpdateJackpotSettingsAsync(Guid leagueId, UpdateJackpotSettingsDto dto)
    {
        var league = await _context.Leagues.FindAsync(leagueId);
        if (league == null) return false;

        league.JackpotPercentage = dto.JackpotPercentage;

        // null = "não alterar" (clientes antigos mandam só o percentual e não podem apagar a
        // chave); string vazia/whitespace = limpar explicitamente.
        if (dto.JackpotPixKey != null)
        {
            league.JackpotPixKey = string.IsNullOrWhiteSpace(dto.JackpotPixKey) ? null : dto.JackpotPixKey.Trim();
            league.JackpotPixKeyType = league.JackpotPixKey == null ? null : dto.JackpotPixKeyType;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<JackpotContributionDto?> RecordContributionAsync(Guid tournamentId, decimal amount)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.League)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null) return null;
        if (amount <= 0) return null;

        var prizePool = await CalculatePrizePoolAsync(tournament);

        var existing = await _context.JackpotContributions
            .FirstOrDefaultAsync(jc => jc.TournamentId == tournamentId);

        JackpotContribution contribution;
        if (existing != null)
        {
            existing.Amount = amount;
            existing.TournamentPrizePool = prizePool;
            existing.PercentageApplied = prizePool > 0 ? (amount / prizePool) * 100 : 0;
            contribution = existing;
        }
        else
        {
            contribution = new JackpotContribution
            {
                Id = Guid.NewGuid(),
                LeagueId = tournament.LeagueId,
                TournamentId = tournamentId,
                Amount = amount,
                TournamentPrizePool = prizePool,
                PercentageApplied = prizePool > 0 ? (amount / prizePool) * 100 : 0,
                CreatedAt = DateTime.UtcNow
            };
            _context.JackpotContributions.Add(contribution);
        }

        await _context.SaveChangesAsync();

        return new JackpotContributionDto(
            contribution.Id,
            contribution.TournamentId,
            tournament.Name,
            tournament.ScheduledDateTime,
            contribution.TournamentPrizePool,
            contribution.PercentageApplied,
            contribution.Amount,
            contribution.CreatedAt
        );
    }

    public async Task<bool> UseJackpotAsync(Guid leagueId, UseJackpotDto dto)
    {
        var league = await _context.Leagues.FindAsync(leagueId);
        if (league == null) return false;

        var balanceBefore = await GetDerivedBalanceAsync(leagueId);

        if (dto.Amount <= 0 || dto.Amount > balanceBefore)
            throw new InvalidOperationException("Valor inválido para uso do jackpot");

        var balanceAfter = balanceBefore - dto.Amount;

        var usage = new JackpotUsage
        {
            Id = Guid.NewGuid(),
            LeagueId = leagueId,
            Amount = dto.Amount,
            Description = dto.Description ?? "Uso da caixinha",
            BalanceBefore = balanceBefore,
            BalanceAfter = balanceAfter,
            CreatedAt = DateTime.UtcNow
        };

        _context.JackpotUsages.Add(usage);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<JackpotUsageDto>> GetUsageHistoryAsync(Guid leagueId)
    {
        return await _context.JackpotUsages
            .Where(ju => ju.LeagueId == leagueId)
            .OrderByDescending(ju => ju.CreatedAt)
            .Select(ju => new JackpotUsageDto(
                ju.Id,
                ju.Amount,
                ju.Description,
                ju.BalanceBefore,
                ju.BalanceAfter,
                ju.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<decimal> CalculateJackpotContributionAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.League)
            .Include(t => t.Players)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null) return 0;

        var league = tournament.League;
        if (league.JackpotPercentage <= 0) return 0;

        var prizePool = await CalculatePrizePoolAsync(tournament);
        return prizePool * league.JackpotPercentage / 100;
    }

    private async Task<decimal> CalculatePrizePoolAsync(Tournament tournament)
    {
        var players = await _context.TournamentPlayers
            .Where(tp => tp.TournamentId == tournament.Id && tp.IsCheckedIn)
            .ToListAsync();

        var buyIns = players.Count * tournament.BuyIn;
        var rebuys = players.Sum(p => p.RebuyCount) * (tournament.RebuyValue ?? 0);
        var addons = players.Count(p => p.HasAddon) * (tournament.AddonValue ?? 0);

        return buyIns + rebuys + addons;
    }
}
