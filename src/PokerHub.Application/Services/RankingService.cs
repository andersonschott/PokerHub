using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Services;

public class RankingService : IRankingService
{
    private readonly PokerHubDbContext _context;

    public RankingService(PokerHubDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<PlayerRankingDto>> GetLeagueRankingAsync(Guid leagueId)
    {
        var players = await _context.Players
            .Where(p => p.LeagueId == leagueId && p.IsActive)
            .Include(p => p.Participations)
                .ThenInclude(tp => tp.Tournament)
            .ToListAsync();

        var rankings = players
            .Select(p =>
            {
                var finishedParticipations = p.Participations
                    .Where(tp => tp.Tournament.Status == TournamentStatus.Finished)
                    .ToList();

                var totalBuyIns = finishedParticipations.Sum(tp => tp.TotalInvestment(tp.Tournament));
                var totalPrizes = finishedParticipations.Sum(tp => tp.Prize);

                return new
                {
                    Player = p,
                    TournamentsPlayed = finishedParticipations.Count,
                    Wins = finishedParticipations.Count(tp => tp.Position == 1),
                    Top3Finishes = finishedParticipations.Count(tp => tp.Position is >= 1 and <= 3),
                    TotalBuyIns = totalBuyIns,
                    TotalPrizes = totalPrizes,
                    Profit = totalPrizes - totalBuyIns
                };
            })
            .Where(r => r.TournamentsPlayed > 0)
            .OrderByDescending(r => r.Profit)
            .ToList();

        return rankings
            .Select((r, index) => new PlayerRankingDto(
                index + 1,
                r.Player.Id,
                r.Player.Name,
                r.Player.Nickname,
                r.TournamentsPlayed,
                r.Wins,
                r.Top3Finishes,
                r.TotalBuyIns,
                r.TotalPrizes,
                r.Profit
            ))
            .ToList();
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

        return new PlayerStatsDto(
            player.Id,
            player.Name,
            player.Nickname,
            finishedParticipations.Count,
            finishedParticipations.Count(tp => tp.Position == 1),
            finishedParticipations.Count(tp => tp.Position is >= 1 and <= 3),
            finishedParticipations.Sum(tp => tp.TotalInvestment(tp.Tournament)),
            finishedParticipations.Sum(tp => tp.Prize),
            profits.Sum(),
            profits.Count > 0 ? profits.Max() : null,
            profits.Count > 0 ? profits.Min() : null,
            positions.Count > 0 ? (decimal)positions.Average() : 0,
            results
        );
    }
}
