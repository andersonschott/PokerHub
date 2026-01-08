using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.Tournament;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Services;

public class TournamentService : ITournamentService
{
    private readonly PokerHubDbContext _context;
    private readonly IJackpotService _jackpotService;

    public TournamentService(PokerHubDbContext context, IJackpotService jackpotService)
    {
        _context = context;
        _jackpotService = jackpotService;
    }

    public async Task<IReadOnlyList<TournamentDto>> GetTournamentsByLeagueAsync(Guid leagueId)
    {
        return await _context.Tournaments
            .Where(t => t.LeagueId == leagueId)
            .Include(t => t.League)
            .Include(t => t.Players)
            .OrderByDescending(t => t.ScheduledDateTime)
            .Select(t => MapToDto(t))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<TournamentDto>> GetTournamentsByUserAsync(string userId)
    {
        return await _context.Tournaments
            .Where(t => t.League.OrganizerId == userId)
            .Include(t => t.League)
            .Include(t => t.Players)
            .OrderByDescending(t => t.ScheduledDateTime)
            .Select(t => MapToDto(t))
            .ToListAsync();
    }

    public async Task<TournamentDto?> GetTournamentByIdAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.League)
            .Include(t => t.Players)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        return tournament != null ? MapToDto(tournament) : null;
    }

    public async Task<TournamentDetailDto?> GetTournamentDetailAsync(Guid tournamentId)
    {
        // Use AsNoTracking to ensure fresh data is fetched (important for SignalR updates)
        var tournament = await _context.Tournaments
            .AsNoTracking()
            .Include(t => t.League)
            .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
            .Include(t => t.Players)
                .ThenInclude(tp => tp.Player)
            .Include(t => t.Players)
                .ThenInclude(tp => tp.EliminatedByPlayer)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null) return null;

        var blindLevels = tournament.BlindLevels
            .Select(bl => new BlindLevelDto(
                bl.Id,
                bl.Order,
                bl.SmallBlind,
                bl.BigBlind,
                bl.Ante,
                bl.DurationMinutes,
                bl.IsBreak,
                bl.BreakDescription
            ))
            .ToList();

        var players = tournament.Players
            .OrderBy(tp => tp.Position.HasValue ? 0 : 1)           // Posicoes definidas primeiro
            .ThenBy(tp => tp.Position ?? int.MaxValue)              // Por posicao (1o, 2o, 3o...)
            .ThenByDescending(tp => tp.EliminatedAt.HasValue ? 1 : 0) // Eliminados depois
            .ThenByDescending(tp => tp.CheckedInAt.HasValue ? 1 : 0)  // Check-in antes
            .ThenBy(tp => tp.Player.Name)                            // Alfabetico por nome
            .Select(tp => new TournamentPlayerDto(
                tp.Id,
                tp.TournamentId,
                tp.PlayerId,
                tp.Player.Name,
                tp.Player.Nickname,
                tp.IsCheckedIn,
                tp.CheckedInAt,
                tp.RebuyCount,
                tp.HasAddon,
                tp.Position,
                tp.Prize,
                tp.EliminatedByPlayerId,
                tp.EliminatedByPlayer?.Name,
                tp.EliminatedAt,
                tp.TotalInvestment(tournament),
                tp.ProfitLoss(tournament)
            ))
            .ToList();

        return new TournamentDetailDto(
            tournament.Id,
            tournament.LeagueId,
            tournament.League.Name,
            tournament.Name,
            tournament.ScheduledDateTime,
            tournament.Location,
            tournament.BuyIn,
            tournament.StartingStack,
            tournament.RebuyValue,
            tournament.RebuyStack,
            tournament.RebuyLimitLevel,
            tournament.RebuyLimitMinutes,
            tournament.RebuyLimitType,
            tournament.AddonValue,
            tournament.AddonStack,
            tournament.PrizeStructure,
            tournament.InviteCode,
            tournament.AllowCheckInUntilLevel,
            tournament.Status,
            tournament.CurrentLevel,
            tournament.TimeRemainingSeconds,
            tournament.CurrentLevelStartedAt,
            tournament.CreatedAt,
            tournament.StartedAt,
            tournament.FinishedAt,
            CalculatePrizePool(tournament),
            blindLevels,
            players
        );
    }

    public async Task<TournamentDto> CreateTournamentAsync(Guid leagueId, CreateTournamentDto dto)
    {
        var tournament = new Tournament
        {
            Id = Guid.NewGuid(),
            LeagueId = leagueId,
            Name = dto.Name,
            ScheduledDateTime = dto.ScheduledDateTime,
            Location = dto.Location,
            BuyIn = dto.BuyIn,
            StartingStack = dto.StartingStack,
            RebuyValue = dto.RebuyValue,
            RebuyStack = dto.RebuyStack,
            RebuyLimitLevel = dto.RebuyLimitLevel,
            RebuyLimitMinutes = dto.RebuyLimitMinutes,
            RebuyLimitType = dto.RebuyLimitType,
            AddonValue = dto.AddonValue,
            AddonStack = dto.AddonStack,
            PrizeStructure = dto.PrizeStructure,
            PrizeDistributionType = dto.PrizeDistributionType,
            UsePrizeTable = dto.UsePrizeTable,
            PrizeTableId = dto.PrizeTableId,
            AllowCheckInUntilLevel = dto.AllowCheckInUntilLevel,
            Status = TournamentStatus.Scheduled,
            CurrentLevel = 1,
            CreatedAt = DateTime.UtcNow
        };

        // Add blind levels
        foreach (var bl in dto.BlindLevels)
        {
            tournament.BlindLevels.Add(new BlindLevel
            {
                Id = Guid.NewGuid(),
                TournamentId = tournament.Id,
                Order = bl.Order,
                SmallBlind = bl.SmallBlind,
                BigBlind = bl.BigBlind,
                Ante = bl.Ante,
                DurationMinutes = bl.DurationMinutes,
                IsBreak = bl.IsBreak,
                BreakDescription = bl.BreakDescription
            });
        }

        _context.Tournaments.Add(tournament);
        await _context.SaveChangesAsync();

        var league = await _context.Leagues.FindAsync(leagueId);
        tournament.League = league!;

        return MapToDto(tournament);
    }

    public async Task<bool> UpdateTournamentAsync(Guid tournamentId, CreateTournamentDto dto)
    {
        var tournament = await _context.Tournaments
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null || tournament.Status != TournamentStatus.Scheduled)
            return false;

        tournament.Name = dto.Name;
        tournament.ScheduledDateTime = dto.ScheduledDateTime;
        tournament.Location = dto.Location;
        tournament.BuyIn = dto.BuyIn;
        tournament.StartingStack = dto.StartingStack;
        tournament.RebuyValue = dto.RebuyValue;
        tournament.RebuyStack = dto.RebuyStack;
        tournament.RebuyLimitLevel = dto.RebuyLimitLevel;
        tournament.RebuyLimitMinutes = dto.RebuyLimitMinutes;
        tournament.RebuyLimitType = dto.RebuyLimitType;
        tournament.AddonValue = dto.AddonValue;
        tournament.AddonStack = dto.AddonStack;
        tournament.PrizeStructure = dto.PrizeStructure;
        tournament.PrizeDistributionType = dto.PrizeDistributionType;
        tournament.UsePrizeTable = dto.UsePrizeTable;
        tournament.PrizeTableId = dto.PrizeTableId;
        tournament.AllowCheckInUntilLevel = dto.AllowCheckInUntilLevel;

        // Remove existing blind levels directly from database
        var existingBlindLevels = await _context.BlindLevels
            .Where(bl => bl.TournamentId == tournamentId)
            .ToListAsync();
        _context.BlindLevels.RemoveRange(existingBlindLevels);

        // Add new blind levels
        var newBlindLevels = dto.BlindLevels.Select(bl => new BlindLevel
        {
            Id = Guid.NewGuid(),
            TournamentId = tournament.Id,
            Order = bl.Order,
            SmallBlind = bl.SmallBlind,
            BigBlind = bl.BigBlind,
            Ante = bl.Ante,
            DurationMinutes = bl.DurationMinutes,
            IsBreak = bl.IsBreak,
            BreakDescription = bl.BreakDescription
        }).ToList();

        await _context.BlindLevels.AddRangeAsync(newBlindLevels);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteTournamentAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament == null || tournament.Status != TournamentStatus.Scheduled)
            return false;

        _context.Tournaments.Remove(tournament);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> StartTournamentAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null || tournament.Status != TournamentStatus.Scheduled)
            return false;

        var firstLevel = tournament.BlindLevels.FirstOrDefault();
        if (firstLevel == null) return false;

        tournament.Status = TournamentStatus.InProgress;
        tournament.StartedAt = DateTime.UtcNow;
        tournament.CurrentLevel = 1;
        tournament.TimeRemainingSeconds = firstLevel.DurationMinutes * 60;
        tournament.CurrentLevelStartedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> PauseTournamentAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament == null || tournament.Status != TournamentStatus.InProgress)
            return false;

        tournament.Status = TournamentStatus.Paused;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ResumeTournamentAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament == null || tournament.Status != TournamentStatus.Paused)
            return false;

        tournament.Status = TournamentStatus.InProgress;
        tournament.CurrentLevelStartedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> FinishTournamentAsync(Guid tournamentId, IList<(Guid playerId, int position)> positions)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.Players)
            .Include(t => t.League)
            .Include(t => t.PrizeTable)
                .ThenInclude(pt => pt!.Entries)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null ||
            (tournament.Status != TournamentStatus.InProgress && tournament.Status != TournamentStatus.Paused))
            return false;

        var prizePool = CalculatePrizePool(tournament);
        decimal jackpotContribution = 0;
        bool usedPrizeTable = false;

        // Try to use prize table if enabled
        if (tournament.UsePrizeTable)
        {
            LeaguePrizeTable? prizeTable = null;

            // First, try to use the specific prize table if set
            if (tournament.PrizeTableId.HasValue && tournament.PrizeTable != null)
            {
                prizeTable = tournament.PrizeTable;
            }
            else
            {
                // Try to find a matching prize table by prize pool total
                prizeTable = await _context.LeaguePrizeTables
                    .Include(pt => pt.Entries)
                    .FirstOrDefaultAsync(pt => pt.LeagueId == tournament.LeagueId &&
                                               pt.PrizePoolTotal == prizePool);
            }

            if (prizeTable != null)
            {
                // Use fixed values from prize table
                var prizeEntries = prizeTable.Entries.ToDictionary(e => e.Position, e => e.PrizeAmount);
                jackpotContribution = prizeTable.JackpotAmount;
                usedPrizeTable = true;

                foreach (var (playerId, position) in positions)
                {
                    var tp = tournament.Players.FirstOrDefault(p => p.PlayerId == playerId);
                    if (tp != null)
                    {
                        tp.Position = position;
                        if (prizeEntries.TryGetValue(position, out var prizeAmount))
                        {
                            tp.Prize = prizeAmount;
                        }
                    }
                }
            }
        }

        // If not using prize table or no matching table found, use tournament's prize structure
        if (!usedPrizeTable)
        {
            var prizeValues = ParsePrizeStructure(tournament.PrizeStructure);

            // Calculate jackpot from league percentage if configured (arredondado para inteiro)
            if (tournament.League.JackpotPercentage > 0)
            {
                jackpotContribution = Math.Round(prizePool * tournament.League.JackpotPercentage / 100, MidpointRounding.AwayFromZero);
                if (tournament.PrizeDistributionType == PrizeDistributionType.Percentage)
                {
                    prizePool -= jackpotContribution; // Only reduce prize pool for percentage-based
                }
            }

            foreach (var (playerId, position) in positions)
            {
                var tp = tournament.Players.FirstOrDefault(p => p.PlayerId == playerId);
                if (tp != null)
                {
                    tp.Position = position;
                    if (position <= prizeValues.Count)
                    {
                        if (tournament.PrizeDistributionType == PrizeDistributionType.Percentage)
                        {
                            // Calculate prize as percentage of prize pool (arredondado para inteiro)
                            tp.Prize = Math.Round(prizePool * prizeValues[position - 1] / 100, MidpointRounding.AwayFromZero);
                        }
                        else
                        {
                            // Use fixed value directly
                            tp.Prize = prizeValues[position - 1];
                        }
                    }
                }
            }

            // Ajustar diferença de arredondamento no 1º colocado (apenas para distribuição por porcentagem)
            if (tournament.PrizeDistributionType == PrizeDistributionType.Percentage)
            {
                var originalPrizePool = CalculatePrizePool(tournament);
                var totalDistributed = tournament.Players.Sum(p => p.Prize) + jackpotContribution;
                var roundingDiff = originalPrizePool - totalDistributed;

                if (roundingDiff != 0)
                {
                    var firstPlace = tournament.Players.FirstOrDefault(p => p.Position == 1);
                    if (firstPlace != null)
                    {
                        firstPlace.Prize += roundingDiff;
                    }
                }
            }
        }

        tournament.Status = TournamentStatus.Finished;
        tournament.FinishedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Record jackpot contribution if any
        if (jackpotContribution > 0)
        {
            await _jackpotService.RecordContributionAsync(tournamentId, jackpotContribution);
        }

        return true;
    }

    public async Task<bool> CancelTournamentAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament == null) return false;

        tournament.Status = TournamentStatus.Cancelled;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AddPlayerToTournamentAsync(Guid tournamentId, Guid playerId)
    {
        var exists = await _context.TournamentPlayers
            .AnyAsync(tp => tp.TournamentId == tournamentId && tp.PlayerId == playerId);
        if (exists) return false;

        var tp = new TournamentPlayer
        {
            Id = Guid.NewGuid(),
            TournamentId = tournamentId,
            PlayerId = playerId
        };

        _context.TournamentPlayers.Add(tp);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemovePlayerFromTournamentAsync(Guid tournamentId, Guid playerId)
    {
        var tp = await _context.TournamentPlayers
            .FirstOrDefaultAsync(tp => tp.TournamentId == tournamentId && tp.PlayerId == playerId);
        if (tp == null) return false;

        _context.TournamentPlayers.Remove(tp);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CheckInPlayerAsync(Guid tournamentId, Guid playerId)
    {
        var tp = await _context.TournamentPlayers
            .FirstOrDefaultAsync(tp => tp.TournamentId == tournamentId && tp.PlayerId == playerId);
        if (tp == null) return false;

        tp.IsCheckedIn = true;
        tp.CheckedInAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CheckOutPlayerAsync(Guid tournamentId, Guid playerId)
    {
        var tp = await _context.TournamentPlayers
            .FirstOrDefaultAsync(tp => tp.TournamentId == tournamentId && tp.PlayerId == playerId);
        if (tp == null) return false;

        tp.IsCheckedIn = false;
        tp.CheckedInAt = null;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AddRebuyAsync(Guid tournamentId, Guid playerId)
    {
        var tp = await _context.TournamentPlayers
            .FirstOrDefaultAsync(tp => tp.TournamentId == tournamentId && tp.PlayerId == playerId);
        if (tp == null) return false;

        tp.RebuyCount++;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveRebuyAsync(Guid tournamentId, Guid playerId)
    {
        var tp = await _context.TournamentPlayers
            .FirstOrDefaultAsync(tp => tp.TournamentId == tournamentId && tp.PlayerId == playerId);
        if (tp == null || tp.RebuyCount <= 0) return false;

        tp.RebuyCount--;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetAddonAsync(Guid tournamentId, Guid playerId, bool hasAddon)
    {
        var tp = await _context.TournamentPlayers
            .FirstOrDefaultAsync(tp => tp.TournamentId == tournamentId && tp.PlayerId == playerId);
        if (tp == null) return false;

        tp.HasAddon = hasAddon;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> IsRebuyAllowedAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament == null) return false;

        var minutesElapsed = tournament.StartedAt.HasValue
            ? (int)(DateTime.UtcNow - tournament.StartedAt.Value).TotalMinutes
            : 0;

        return tournament.IsRebuyAllowed(tournament.CurrentLevel, minutesElapsed);
    }

    public async Task<bool> EliminatePlayerAsync(Guid tournamentId, Guid playerId, Guid? eliminatedByPlayerId, int? position = null)
    {
        var tp = await _context.TournamentPlayers
            .FirstOrDefaultAsync(tp => tp.TournamentId == tournamentId && tp.PlayerId == playerId);
        if (tp == null) return false;

        tp.EliminatedByPlayerId = eliminatedByPlayerId;
        tp.EliminatedAt = DateTime.UtcNow;
        tp.Position = position;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<TimerStateDto?> GetTimerStateAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
            .Include(t => t.Players)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null) return null;

        var currentBlindLevel = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == tournament.CurrentLevel);
        var nextBlindLevel = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == tournament.CurrentLevel + 1);

        if (currentBlindLevel == null) return null;

        var activePlayers = tournament.Players.Count(tp => tp.IsCheckedIn && !tp.EliminatedAt.HasValue);

        return new TimerStateDto(
            tournament.Id,
            tournament.Name,
            tournament.Status,
            tournament.CurrentLevel,
            tournament.TimeRemainingSeconds ?? 0,
            new BlindLevelDto(
                currentBlindLevel.Id,
                currentBlindLevel.Order,
                currentBlindLevel.SmallBlind,
                currentBlindLevel.BigBlind,
                currentBlindLevel.Ante,
                currentBlindLevel.DurationMinutes,
                currentBlindLevel.IsBreak,
                currentBlindLevel.BreakDescription
            ),
            nextBlindLevel != null ? new BlindLevelDto(
                nextBlindLevel.Id,
                nextBlindLevel.Order,
                nextBlindLevel.SmallBlind,
                nextBlindLevel.BigBlind,
                nextBlindLevel.Ante,
                nextBlindLevel.DurationMinutes,
                nextBlindLevel.IsBreak,
                nextBlindLevel.BreakDescription
            ) : null,
            activePlayers,
            tournament.Players.Count(tp => tp.IsCheckedIn),
            CalculatePrizePool(tournament),
            tournament.Players.Sum(tp => tp.RebuyCount),
            tournament.Players.Count(tp => tp.HasAddon)
        );
    }

    public async Task<bool> AdvanceToNextLevelAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null) return false;

        var nextLevel = tournament.BlindLevels.FirstOrDefault(bl => bl.Order == tournament.CurrentLevel + 1);
        if (nextLevel == null) return false;

        tournament.CurrentLevel++;
        tournament.TimeRemainingSeconds = nextLevel.DurationMinutes * 60;
        tournament.CurrentLevelStartedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateTimeRemainingAsync(Guid tournamentId, int secondsRemaining)
    {
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament == null) return false;

        tournament.TimeRemainingSeconds = secondsRemaining;
        await _context.SaveChangesAsync();
        return true;
    }

    public IReadOnlyList<CreateBlindLevelDto> GetTurboBlindTemplate()
    {
        return new List<CreateBlindLevelDto>
        {
            new(1, 25, 50, 0, 10, false, null),
            new(2, 50, 100, 0, 10, false, null),
            new(3, 75, 150, 0, 10, false, null),
            new(4, 100, 200, 25, 10, false, null),
            new(5, 0, 0, 0, 10, true, "Intervalo"),
            new(6, 150, 300, 50, 10, false, null),
            new(7, 200, 400, 50, 10, false, null),
            new(8, 300, 600, 75, 10, false, null),
            new(9, 400, 800, 100, 10, false, null),
            new(10, 500, 1000, 100, 10, false, null),
            new(11, 600, 1200, 200, 10, false, null)
        };
    }

    public IReadOnlyList<CreateBlindLevelDto> GetRegularBlindTemplate()
    {
        return new List<CreateBlindLevelDto>
        {
            new(1, 25, 50, 0, 15, false, null),
            new(2, 50, 100, 0, 15, false, null),
            new(3, 75, 150, 0, 15, false, null),
            new(4, 100, 200, 25, 15, false, null),
            new(5, 0, 0, 0, 15, true, "Intervalo"),
            new(6, 150, 300, 25, 15, false, null),
            new(7, 200, 400, 50, 15, false, null),
            new(8, 300, 600, 75, 15, false, null),
            new(9, 0, 0, 0, 10, true, "Intervalo"),
            new(10, 400, 800, 100, 15, false, null),
            new(11, 500, 1000, 100, 15, false, null),
            new(12, 600, 1200, 200, 15, false, null)
        };
    }

    public IReadOnlyList<CreateBlindLevelDto> GetDeepStackBlindTemplate()
    {
        return new List<CreateBlindLevelDto>
        {
            new(1, 25, 50, 0, 20, false, null),
            new(2, 50, 100, 0, 20, false, null),
            new(3, 75, 150, 0, 20, false, null),
            new(4, 100, 200, 0, 20, false, null),
            new(5, 0, 0, 0, 15, true, "Intervalo"),
            new(6, 125, 250, 25, 20, false, null),
            new(7, 150, 300, 25, 20, false, null),
            new(8, 200, 400, 50, 20, false, null),
            new(9, 250, 500, 50, 20, false, null),
            new(10, 0, 0, 0, 15, true, "Intervalo"),
            new(11, 300, 600, 75, 20, false, null),
            new(12, 400, 800, 100, 20, false, null),
            new(13, 500, 1000, 100, 20, false, null),
            new(14, 600, 1200, 200, 20, false, null)
        };
    }

    public async Task<bool> CanUserManageTournamentAsync(Guid tournamentId, string userId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.League)
            .Include(t => t.Players)
                .ThenInclude(tp => tp.Player)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null)
            return false;

        // League organizer can always manage
        if (tournament.League.OrganizerId == userId)
            return true;

        // Checked-in player can manage
        var isCheckedInPlayer = tournament.Players
            .Any(tp => tp.Player.UserId == userId && tp.CheckedInAt != null);

        return isCheckedInPlayer;
    }

    private static TournamentDto MapToDto(Tournament t)
    {
        return new TournamentDto(
            t.Id,
            t.LeagueId,
            t.League?.Name ?? "",
            t.Name,
            t.ScheduledDateTime,
            t.Location,
            t.BuyIn,
            t.RebuyValue,
            t.AddonValue,
            t.StartingStack,
            t.Status,
            t.CurrentLevel,
            t.Players.Count,
            t.Players.Count(p => p.IsCheckedIn),
            CalculatePrizePool(t),
            t.InviteCode,
            t.AllowCheckInUntilLevel,
            t.CreatedAt
        );
    }

    private static decimal CalculatePrizePool(Tournament tournament)
    {
        var buyIns = tournament.Players.Count(p => p.IsCheckedIn) * tournament.BuyIn;
        var rebuys = tournament.Players.Sum(p => p.RebuyCount) * (tournament.RebuyValue ?? 0);
        var addons = tournament.Players.Count(p => p.HasAddon) * (tournament.AddonValue ?? 0);
        return buyIns + rebuys + addons;
    }

    private static List<decimal> ParsePrizeStructure(string? prizeStructure)
    {
        if (string.IsNullOrEmpty(prizeStructure))
            return new List<decimal> { 100 }; // Default: winner takes all

        return prizeStructure
            .Split(',')
            .Select(s => decimal.TryParse(s.Trim(), out var val) ? val : 0)
            .Where(v => v > 0)
            .ToList();
    }

    public async Task<TournamentDto?> DuplicateTournamentAsync(Guid sourceTournamentId, Guid leagueId)
    {
        var source = await _context.Tournaments
            .AsNoTracking()
            .Include(t => t.BlindLevels.OrderBy(bl => bl.Order))
            .FirstOrDefaultAsync(t => t.Id == sourceTournamentId);

        if (source == null) return null;

        var newTournamentId = Guid.NewGuid();
        var newTournament = new Tournament
        {
            Id = newTournamentId,
            LeagueId = leagueId,
            Name = $"{source.Name} - Copia",
            ScheduledDateTime = DateTime.UtcNow.AddDays(7), // Uma semana no futuro
            Location = source.Location,
            BuyIn = source.BuyIn,
            StartingStack = source.StartingStack,
            RebuyValue = source.RebuyValue,
            RebuyStack = source.RebuyStack,
            RebuyLimitLevel = source.RebuyLimitLevel,
            RebuyLimitMinutes = source.RebuyLimitMinutes,
            RebuyLimitType = source.RebuyLimitType,
            AddonValue = source.AddonValue,
            AddonStack = source.AddonStack,
            PrizeStructure = source.PrizeStructure,
            PrizeDistributionType = source.PrizeDistributionType,
            UsePrizeTable = source.UsePrizeTable,
            PrizeTableId = source.PrizeTableId,
            AllowCheckInUntilLevel = source.AllowCheckInUntilLevel,
            Status = TournamentStatus.Scheduled,
            CurrentLevel = 1,
            CreatedAt = DateTime.UtcNow
        };

        _context.Tournaments.Add(newTournament);

        // Copiar blind levels diretamente para o contexto
        var newBlindLevels = source.BlindLevels.OrderBy(b => b.Order).Select(bl => new BlindLevel
        {
            Id = Guid.NewGuid(),
            TournamentId = newTournamentId,
            Order = bl.Order,
            SmallBlind = bl.SmallBlind,
            BigBlind = bl.BigBlind,
            Ante = bl.Ante,
            DurationMinutes = bl.DurationMinutes,
            IsBreak = bl.IsBreak,
            BreakDescription = bl.BreakDescription
        }).ToList();

        await _context.BlindLevels.AddRangeAsync(newBlindLevels);
        await _context.SaveChangesAsync();

        var league = await _context.Leagues.FindAsync(leagueId);

        return new TournamentDto(
            newTournament.Id,
            newTournament.LeagueId,
            league?.Name ?? "",
            newTournament.Name,
            newTournament.ScheduledDateTime,
            newTournament.Location,
            newTournament.BuyIn,
            newTournament.RebuyValue,
            newTournament.AddonValue,
            newTournament.StartingStack,
            newTournament.Status,
            newTournament.CurrentLevel,
            0, // PlayerCount
            0, // CheckedInCount
            0, // PrizePool
            newTournament.InviteCode,
            newTournament.AllowCheckInUntilLevel,
            newTournament.CreatedAt
        );
    }

    public async Task<TournamentDto?> GetTournamentByInviteCodeAsync(string inviteCode)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.League)
            .Include(t => t.Players)
            .FirstOrDefaultAsync(t => t.InviteCode == inviteCode.ToUpper());

        return tournament == null ? null : MapToDto(tournament);
    }

    public async Task<bool> SelfRegisterPlayerAsync(Guid tournamentId, string userId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.League)
                .ThenInclude(l => l.Players)
            .Include(t => t.Players)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null) return false;

        // Tournament must allow check-in (scheduled or early check-in period)
        if (!tournament.IsCheckInAllowed()) return false;

        // Find the player linked to this user in the league
        var player = tournament.League.Players
            .FirstOrDefault(p => p.UserId == userId && p.IsActive);

        if (player == null) return false;

        // Check if already registered
        if (tournament.Players.Any(tp => tp.PlayerId == player.Id)) return false;

        // Add player to tournament and auto-checkin if tournament already started
        var tournamentPlayer = new TournamentPlayer
        {
            Id = Guid.NewGuid(),
            TournamentId = tournamentId,
            PlayerId = player.Id,
            IsCheckedIn = tournament.Status != TournamentStatus.Scheduled,
            CheckedInAt = tournament.Status != TournamentStatus.Scheduled ? DateTime.UtcNow : null
        };

        _context.TournamentPlayers.Add(tournamentPlayer);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> SelfUnregisterPlayerAsync(Guid tournamentId, string userId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.League)
                .ThenInclude(l => l.Players)
            .Include(t => t.Players)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null) return false;

        // Tournament must be scheduled
        if (tournament.Status != TournamentStatus.Scheduled) return false;

        // Find the player linked to this user in the league
        var player = tournament.League.Players
            .FirstOrDefault(p => p.UserId == userId && p.IsActive);

        if (player == null) return false;

        // Find tournament player record
        var tournamentPlayer = tournament.Players.FirstOrDefault(tp => tp.PlayerId == player.Id);
        if (tournamentPlayer == null) return false;

        // Cannot unregister if already checked in
        if (tournamentPlayer.IsCheckedIn) return false;

        _context.TournamentPlayers.Remove(tournamentPlayer);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<string?> RegenerateTournamentInviteCodeAsync(Guid tournamentId)
    {
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament == null) return null;

        tournament.RegenerateInviteCode();
        await _context.SaveChangesAsync();

        return tournament.InviteCode;
    }

    public async Task<bool> IsUserRegisteredInTournamentAsync(Guid tournamentId, string userId)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.League)
                .ThenInclude(l => l.Players)
            .Include(t => t.Players)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null) return false;

        var player = tournament.League.Players
            .FirstOrDefault(p => p.UserId == userId && p.IsActive);

        if (player == null) return false;

        return tournament.Players.Any(tp => tp.PlayerId == player.Id);
    }
}
