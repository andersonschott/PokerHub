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
        // Include inactive players to preserve history in rankings
        var players = await _context.Players
            .Where(p => p.LeagueId == leagueId)
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
                var profit = totalPrizes - totalBuyIns;
                var wins = finishedParticipations.Count(tp => tp.Position == 1);
                var secondPlaces = finishedParticipations.Count(tp => tp.Position == 2);
                var thirdPlaces = finishedParticipations.Count(tp => tp.Position == 3);
                var top3 = wins + secondPlaces + thirdPlaces;
                var tournamentsPlayed = finishedParticipations.Count;

                // ITM (In The Money) - posicoes que receberam premio
                var itmCount = finishedParticipations.Count(tp => tp.Prize > 0);
                var itmRate = tournamentsPlayed > 0 ? (decimal)itmCount / tournamentsPlayed * 100 : 0;

                // ROI (Return on Investment)
                var roi = totalBuyIns > 0 ? (profit / totalBuyIns) * 100 : 0;

                return new
                {
                    Player = p,
                    TournamentsPlayed = tournamentsPlayed,
                    Wins = wins,
                    SecondPlaces = secondPlaces,
                    ThirdPlaces = thirdPlaces,
                    Top3Finishes = top3,
                    TotalBuyIns = totalBuyIns,
                    TotalPrizes = totalPrizes,
                    Profit = profit,
                    ROI = roi,
                    ITMRate = itmRate
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
                r.SecondPlaces,
                r.ThirdPlaces,
                r.Top3Finishes,
                r.TotalBuyIns,
                r.TotalPrizes,
                r.Profit,
                r.ROI,
                r.ITMRate
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
