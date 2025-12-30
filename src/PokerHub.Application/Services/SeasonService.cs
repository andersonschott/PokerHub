using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.DTOs.Season;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Services;

public class SeasonService : ISeasonService
{
    private readonly PokerHubDbContext _context;

    public SeasonService(PokerHubDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<SeasonDto>> GetSeasonsByLeagueAsync(Guid leagueId)
    {
        var seasons = await _context.Seasons
            .Where(s => s.LeagueId == leagueId)
            .OrderByDescending(s => s.StartDate)
            .ToListAsync();

        var tournamentCounts = await _context.Tournaments
            .Where(t => t.LeagueId == leagueId)
            .GroupBy(t => t.ScheduledDateTime.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();

        return seasons.Select(s => new SeasonDto(
            s.Id,
            s.LeagueId,
            s.Name,
            s.StartDate,
            s.EndDate,
            s.IsActive,
            tournamentCounts.Where(tc => tc.Date >= s.StartDate.Date && tc.Date <= s.EndDate.Date).Sum(tc => tc.Count),
            s.CreatedAt
        )).ToList();
    }

    public async Task<SeasonDto?> GetSeasonByIdAsync(Guid seasonId)
    {
        var season = await _context.Seasons.FindAsync(seasonId);
        if (season == null) return null;

        var tournamentCount = await _context.Tournaments
            .CountAsync(t => t.LeagueId == season.LeagueId &&
                           t.ScheduledDateTime.Date >= season.StartDate.Date &&
                           t.ScheduledDateTime.Date <= season.EndDate.Date);

        return new SeasonDto(
            season.Id,
            season.LeagueId,
            season.Name,
            season.StartDate,
            season.EndDate,
            season.IsActive,
            tournamentCount,
            season.CreatedAt
        );
    }

    public async Task<SeasonDto?> GetActiveSeasonAsync(Guid leagueId)
    {
        var today = DateTime.UtcNow.Date;
        var season = await _context.Seasons
            .Where(s => s.LeagueId == leagueId && s.IsActive &&
                       s.StartDate.Date <= today && s.EndDate.Date >= today)
            .FirstOrDefaultAsync();

        if (season == null) return null;

        var tournamentCount = await _context.Tournaments
            .CountAsync(t => t.LeagueId == leagueId &&
                           t.ScheduledDateTime.Date >= season.StartDate.Date &&
                           t.ScheduledDateTime.Date <= season.EndDate.Date);

        return new SeasonDto(
            season.Id,
            season.LeagueId,
            season.Name,
            season.StartDate,
            season.EndDate,
            season.IsActive,
            tournamentCount,
            season.CreatedAt
        );
    }

    public async Task<SeasonDto?> GetSeasonForDateAsync(Guid leagueId, DateTime date)
    {
        var season = await _context.Seasons
            .Where(s => s.LeagueId == leagueId &&
                       s.StartDate.Date <= date.Date && s.EndDate.Date >= date.Date)
            .FirstOrDefaultAsync();

        if (season == null) return null;

        var tournamentCount = await _context.Tournaments
            .CountAsync(t => t.LeagueId == leagueId &&
                           t.ScheduledDateTime.Date >= season.StartDate.Date &&
                           t.ScheduledDateTime.Date <= season.EndDate.Date);

        return new SeasonDto(
            season.Id,
            season.LeagueId,
            season.Name,
            season.StartDate,
            season.EndDate,
            season.IsActive,
            tournamentCount,
            season.CreatedAt
        );
    }

    public async Task<SeasonDto> CreateSeasonAsync(Guid leagueId, CreateSeasonDto dto)
    {
        var hasOverlap = await HasOverlappingSeasonAsync(leagueId, dto.StartDate, dto.EndDate, null);
        if (hasOverlap)
            throw new InvalidOperationException("Já existe uma temporada que sobrepõe as datas informadas");

        var season = new Season
        {
            Id = Guid.NewGuid(),
            LeagueId = leagueId,
            Name = dto.Name,
            StartDate = dto.StartDate.Date,
            EndDate = dto.EndDate.Date,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Seasons.Add(season);
        await _context.SaveChangesAsync();

        var tournamentCount = await _context.Tournaments
            .CountAsync(t => t.LeagueId == leagueId &&
                           t.ScheduledDateTime.Date >= season.StartDate.Date &&
                           t.ScheduledDateTime.Date <= season.EndDate.Date);

        return new SeasonDto(
            season.Id,
            season.LeagueId,
            season.Name,
            season.StartDate,
            season.EndDate,
            season.IsActive,
            tournamentCount,
            season.CreatedAt
        );
    }

    public async Task<SeasonDto?> UpdateSeasonAsync(Guid seasonId, UpdateSeasonDto dto)
    {
        var season = await _context.Seasons.FindAsync(seasonId);
        if (season == null) return null;

        var hasOverlap = await HasOverlappingSeasonAsync(season.LeagueId, dto.StartDate, dto.EndDate, seasonId);
        if (hasOverlap)
            throw new InvalidOperationException("Já existe uma temporada que sobrepõe as datas informadas");

        season.Name = dto.Name;
        season.StartDate = dto.StartDate.Date;
        season.EndDate = dto.EndDate.Date;
        season.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        var tournamentCount = await _context.Tournaments
            .CountAsync(t => t.LeagueId == season.LeagueId &&
                           t.ScheduledDateTime.Date >= season.StartDate.Date &&
                           t.ScheduledDateTime.Date <= season.EndDate.Date);

        return new SeasonDto(
            season.Id,
            season.LeagueId,
            season.Name,
            season.StartDate,
            season.EndDate,
            season.IsActive,
            tournamentCount,
            season.CreatedAt
        );
    }

    public async Task<bool> DeleteSeasonAsync(Guid seasonId)
    {
        var season = await _context.Seasons.FindAsync(seasonId);
        if (season == null) return false;

        _context.Seasons.Remove(season);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<PlayerRankingDto>> GetSeasonRankingAsync(Guid seasonId)
    {
        var season = await _context.Seasons.FindAsync(seasonId);
        if (season == null) return [];

        var players = await _context.Players
            .Where(p => p.LeagueId == season.LeagueId && p.IsActive)
            .Include(p => p.Participations)
                .ThenInclude(tp => tp.Tournament)
            .ToListAsync();

        var rankings = players
            .Select(p =>
            {
                var seasonParticipations = p.Participations
                    .Where(tp => tp.Tournament != null &&
                                tp.Tournament.Status == TournamentStatus.Finished &&
                                tp.Tournament.ScheduledDateTime.Date >= season.StartDate.Date &&
                                tp.Tournament.ScheduledDateTime.Date <= season.EndDate.Date)
                    .ToList();

                if (seasonParticipations.Count == 0) return null;

                var totalBuyIns = seasonParticipations.Sum(tp => tp.TotalInvestment(tp.Tournament!));
                var totalPrizes = seasonParticipations.Sum(tp => tp.Prize);
                var profit = totalPrizes - totalBuyIns;
                var wins = seasonParticipations.Count(tp => tp.Position == 1);
                var secondPlaces = seasonParticipations.Count(tp => tp.Position == 2);
                var thirdPlaces = seasonParticipations.Count(tp => tp.Position == 3);
                var itmCount = seasonParticipations.Count(tp => tp.Prize > 0);

                return new
                {
                    Player = p,
                    TournamentsPlayed = seasonParticipations.Count,
                    Wins = wins,
                    SecondPlaces = secondPlaces,
                    ThirdPlaces = thirdPlaces,
                    TotalBuyIns = totalBuyIns,
                    TotalPrizes = totalPrizes,
                    Profit = profit,
                    ROI = totalBuyIns > 0 ? (profit / totalBuyIns) * 100 : 0,
                    ITMRate = seasonParticipations.Count > 0 ? ((decimal)itmCount / seasonParticipations.Count) * 100 : 0
                };
            })
            .Where(x => x != null)
            .OrderByDescending(x => x!.Profit)
            .Select((x, index) => new PlayerRankingDto(
                index + 1,
                x!.Player.Id,
                x.Player.Name,
                x.Player.Nickname,
                x.TournamentsPlayed,
                x.Wins,
                x.SecondPlaces,
                x.ThirdPlaces,
                x.Wins + x.SecondPlaces + x.ThirdPlaces,
                x.TotalBuyIns,
                x.TotalPrizes,
                x.Profit,
                x.ROI,
                x.ITMRate
            ))
            .ToList();

        return rankings;
    }

    public async Task<bool> ValidateSeasonDatesAsync(Guid leagueId, DateTime startDate, DateTime endDate, Guid? excludeSeasonId = null)
    {
        return !await HasOverlappingSeasonAsync(leagueId, startDate, endDate, excludeSeasonId);
    }

    public async Task<IReadOnlyList<SeasonSummaryDto>> GetSeasonSummariesAsync(Guid leagueId)
    {
        var today = DateTime.UtcNow.Date;
        var seasons = await _context.Seasons
            .Where(s => s.LeagueId == leagueId)
            .OrderByDescending(s => s.StartDate)
            .ToListAsync();

        var result = new List<SeasonSummaryDto>();
        foreach (var s in seasons)
        {
            var tournamentCount = await _context.Tournaments
                .CountAsync(t => t.LeagueId == leagueId &&
                                 t.ScheduledDateTime >= s.StartDate &&
                                 t.ScheduledDateTime <= s.EndDate);

            result.Add(new SeasonSummaryDto(
                s.Id,
                s.Name,
                s.StartDate,
                s.EndDate,
                s.IsActive,
                s.StartDate.Date <= today && s.EndDate.Date >= today,
                tournamentCount
            ));
        }

        return result;
    }

    private async Task<bool> HasOverlappingSeasonAsync(Guid leagueId, DateTime startDate, DateTime endDate, Guid? excludeSeasonId)
    {
        var query = _context.Seasons
            .Where(s => s.LeagueId == leagueId &&
                       s.StartDate.Date <= endDate.Date &&
                       s.EndDate.Date >= startDate.Date);

        if (excludeSeasonId.HasValue)
            query = query.Where(s => s.Id != excludeSeasonId.Value);

        return await query.AnyAsync();
    }
}
