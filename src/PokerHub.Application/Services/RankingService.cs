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
        // Buscar dados legados (PlayerSeasonStats)
        var legacyStats = await _context.PlayerSeasonStats
            .Where(pss => pss.Player.LeagueId == leagueId)
            .Include(pss => pss.Player)
            .ToListAsync();

        // Buscar dados de torneios (sempre)
        var tournamentStats = await GetTournamentStatsRawAsync(leagueId);

        // Se não há dados legados, usar apenas torneios
        if (!legacyStats.Any())
        {
            return tournamentStats
                .OrderByDescending(r => r.Profit)
                .Select((r, index) => new PlayerRankingDto(
                    index + 1,
                    r.PlayerId,
                    r.PlayerName,
                    r.Nickname,
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

        // Combinar dados legados + torneios por jogador
        var legacyByPlayer = legacyStats
            .GroupBy(pss => pss.Player)
            .ToDictionary(
                g => g.Key.Id,
                g => new
                {
                    Player = g.Key,
                    TotalGames = g.Sum(x => x.GamesPlayed),
                    TotalFirsts = g.Sum(x => x.FirstPlaces),
                    TotalSeconds = g.Sum(x => x.SecondPlaces),
                    TotalThirds = g.Sum(x => x.ThirdPlaces),
                    TotalCost = g.Sum(x => x.TotalCost),
                    TotalPrize = g.Sum(x => x.TotalPrize),
                    TotalBalance = g.Sum(x => x.Balance)
                });

        var tournamentByPlayer = tournamentStats.ToDictionary(t => t.PlayerId);

        // Unir todos os jogadores (legado + torneios)
        var allPlayerIds = legacyByPlayer.Keys.Union(tournamentByPlayer.Keys).ToList();

        var combined = allPlayerIds.Select(playerId =>
        {
            var hasLegacy = legacyByPlayer.TryGetValue(playerId, out var legacy);
            var hasTournament = tournamentByPlayer.TryGetValue(playerId, out var tournament);

            var playerName = hasLegacy ? legacy!.Player.Name : tournament!.PlayerName;
            var nickname = hasLegacy ? legacy!.Player.Nickname : tournament!.Nickname;

            var totalGames = (hasLegacy ? legacy!.TotalGames : 0) + (hasTournament ? tournament!.TournamentsPlayed : 0);
            var wins = (hasLegacy ? legacy!.TotalFirsts : 0) + (hasTournament ? tournament!.Wins : 0);
            var seconds = (hasLegacy ? legacy!.TotalSeconds : 0) + (hasTournament ? tournament!.SecondPlaces : 0);
            var thirds = (hasLegacy ? legacy!.TotalThirds : 0) + (hasTournament ? tournament!.ThirdPlaces : 0);
            var totalCost = (hasLegacy ? legacy!.TotalCost : 0) + (hasTournament ? tournament!.TotalBuyIns : 0);
            var totalPrize = (hasLegacy ? legacy!.TotalPrize : 0) + (hasTournament ? tournament!.TotalPrizes : 0);
            var profit = (hasLegacy ? legacy!.TotalBalance : 0) + (hasTournament ? tournament!.Profit : 0);

            var itmCount = wins + seconds + thirds;
            var itmRate = totalGames > 0 ? ((decimal)itmCount / totalGames) * 100 : 0;
            var roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

            return new
            {
                PlayerId = playerId,
                PlayerName = playerName,
                Nickname = nickname,
                TournamentsPlayed = totalGames,
                Wins = wins,
                SecondPlaces = seconds,
                ThirdPlaces = thirds,
                Top3Finishes = wins + seconds + thirds,
                TotalBuyIns = totalCost,
                TotalPrizes = totalPrize,
                Profit = profit,
                ROI = roi,
                ITMRate = itmRate
            };
        })
        .Where(p => p.TournamentsPlayed > 0)
        .OrderByDescending(p => p.Profit)
        .ToList();

        return combined
            .Select((p, index) => new PlayerRankingDto(
                index + 1,
                p.PlayerId,
                p.PlayerName,
                p.Nickname,
                p.TournamentsPlayed,
                p.Wins,
                p.SecondPlaces,
                p.ThirdPlaces,
                p.Top3Finishes,
                p.TotalBuyIns,
                p.TotalPrizes,
                p.Profit,
                p.ROI,
                p.ITMRate
            ))
            .ToList();
    }

    private record TournamentStatsRaw(
        Guid PlayerId,
        string PlayerName,
        string? Nickname,
        int TournamentsPlayed,
        int Wins,
        int SecondPlaces,
        int ThirdPlaces,
        int Top3Finishes,
        decimal TotalBuyIns,
        decimal TotalPrizes,
        decimal Profit,
        decimal ROI,
        decimal ITMRate
    );

    private async Task<List<TournamentStatsRaw>> GetTournamentStatsRawAsync(Guid leagueId)
    {
        var players = await _context.Players
            .Where(p => p.LeagueId == leagueId)
            .Include(p => p.Participations)
                .ThenInclude(tp => tp.Tournament)
            .ToListAsync();

        return players
            .Select(p =>
            {
                var finishedParticipations = p.Participations
                    .Where(tp => tp.Tournament.Status == TournamentStatus.Finished)
                    .ToList();

                if (finishedParticipations.Count == 0) return null;

                var totalBuyIns = finishedParticipations.Sum(tp => tp.TotalInvestment(tp.Tournament));
                var totalPrizes = finishedParticipations.Sum(tp => tp.Prize);
                var profit = totalPrizes - totalBuyIns;
                var wins = finishedParticipations.Count(tp => tp.Position == 1);
                var secondPlaces = finishedParticipations.Count(tp => tp.Position == 2);
                var thirdPlaces = finishedParticipations.Count(tp => tp.Position == 3);
                var top3 = wins + secondPlaces + thirdPlaces;
                var tournamentsPlayed = finishedParticipations.Count;
                var itmCount = finishedParticipations.Count(tp => tp.Prize > 0);
                var itmRate = tournamentsPlayed > 0 ? (decimal)itmCount / tournamentsPlayed * 100 : 0;
                var roi = totalBuyIns > 0 ? (profit / totalBuyIns) * 100 : 0;

                return new TournamentStatsRaw(
                    p.Id,
                    p.Name,
                    p.Nickname,
                    tournamentsPlayed,
                    wins,
                    secondPlaces,
                    thirdPlaces,
                    top3,
                    totalBuyIns,
                    totalPrizes,
                    profit,
                    roi,
                    itmRate
                );
            })
            .Where(r => r != null)
            .ToList()!;
    }

    private async Task<IReadOnlyList<PlayerRankingDto>> GetLeagueRankingFromLegacyDataAsync(Guid leagueId)
    {
        // Agregar dados de todas as temporadas por jogador
        var legacyStats = await _context.PlayerSeasonStats
            .Where(pss => pss.Player.LeagueId == leagueId)
            .Include(pss => pss.Player)
            .ToListAsync();

        var playerStats = legacyStats
            .GroupBy(pss => pss.Player)
            .Select(g => new
            {
                Player = g.Key,
                TotalGames = g.Sum(x => x.GamesPlayed),
                TotalFirsts = g.Sum(x => x.FirstPlaces),
                TotalSeconds = g.Sum(x => x.SecondPlaces),
                TotalThirds = g.Sum(x => x.ThirdPlaces),
                TotalCost = g.Sum(x => x.TotalCost),
                TotalPrize = g.Sum(x => x.TotalPrize),
                TotalBalance = g.Sum(x => x.Balance)
            })
            .OrderByDescending(p => p.TotalBalance)
            .ToList();

        return playerStats
            .Select((p, index) =>
            {
                // Para dados legados: ITM = soma de posicoes premiadas (1o+2o+3o)
                var itmCount = p.TotalFirsts + p.TotalSeconds + p.TotalThirds;
                var itmRate = p.TotalGames > 0 ? ((decimal)itmCount / p.TotalGames) * 100 : 0;
                var roi = p.TotalCost > 0 ? (p.TotalBalance / p.TotalCost) * 100 : 0;

                return new PlayerRankingDto(
                    index + 1,
                    p.Player.Id,
                    p.Player.Name,
                    p.Player.Nickname,
                    p.TotalGames,
                    p.TotalFirsts,
                    p.TotalSeconds,
                    p.TotalThirds,
                    p.TotalFirsts + p.TotalSeconds + p.TotalThirds,
                    p.TotalCost,
                    p.TotalPrize,
                    p.TotalBalance,
                    roi,
                    itmRate
                );
            })
            .ToList();
    }

    private async Task<IReadOnlyList<PlayerRankingDto>> GetLeagueRankingFromTournamentDataAsync(Guid leagueId)
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
