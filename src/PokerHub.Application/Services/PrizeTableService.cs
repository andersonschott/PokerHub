using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.PrizeTable;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Entities;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Services;

public class PrizeTableService : IPrizeTableService
{
    private readonly PokerHubDbContext _context;

    public PrizeTableService(PokerHubDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<LeaguePrizeTableDto>> GetPrizeTablesByLeagueAsync(Guid leagueId)
    {
        return await _context.LeaguePrizeTables
            .Where(pt => pt.LeagueId == leagueId)
            .Include(pt => pt.Entries)
            .OrderBy(pt => pt.PrizePoolTotal)
            .Select(pt => new LeaguePrizeTableDto(
                pt.Id,
                pt.LeagueId,
                pt.Name,
                pt.PrizePoolTotal,
                pt.JackpotAmount,
                pt.Entries
                    .OrderBy(e => e.Position)
                    .Select(e => new PrizeTableEntryDto(e.Position, e.PrizeAmount))
                    .ToList(),
                pt.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<LeaguePrizeTableDto?> GetPrizeTableByIdAsync(Guid prizeTableId)
    {
        var pt = await _context.LeaguePrizeTables
            .Include(p => p.Entries)
            .FirstOrDefaultAsync(p => p.Id == prizeTableId);

        if (pt == null) return null;

        return new LeaguePrizeTableDto(
            pt.Id,
            pt.LeagueId,
            pt.Name,
            pt.PrizePoolTotal,
            pt.JackpotAmount,
            pt.Entries
                .OrderBy(e => e.Position)
                .Select(e => new PrizeTableEntryDto(e.Position, e.PrizeAmount))
                .ToList(),
            pt.CreatedAt
        );
    }

    public async Task<LeaguePrizeTableDto?> FindMatchingPrizeTableAsync(Guid leagueId, decimal prizePoolTotal)
    {
        var pt = await _context.LeaguePrizeTables
            .Include(p => p.Entries)
            .FirstOrDefaultAsync(p => p.LeagueId == leagueId && p.PrizePoolTotal == prizePoolTotal);

        if (pt == null) return null;

        return new LeaguePrizeTableDto(
            pt.Id,
            pt.LeagueId,
            pt.Name,
            pt.PrizePoolTotal,
            pt.JackpotAmount,
            pt.Entries
                .OrderBy(e => e.Position)
                .Select(e => new PrizeTableEntryDto(e.Position, e.PrizeAmount))
                .ToList(),
            pt.CreatedAt
        );
    }

    public async Task<LeaguePrizeTableDto> CreatePrizeTableAsync(Guid leagueId, CreatePrizeTableDto dto)
    {
        var existingTable = await _context.LeaguePrizeTables
            .AnyAsync(pt => pt.LeagueId == leagueId && pt.PrizePoolTotal == dto.PrizePoolTotal);

        if (existingTable)
            throw new InvalidOperationException($"Já existe uma tabela de premiação para o prize pool de {dto.PrizePoolTotal:C}");

        // Auto-generate name if empty
        var name = string.IsNullOrWhiteSpace(dto.Name)
            ? $"Pote {dto.PrizePoolTotal:N0}"
            : dto.Name;

        var prizeTable = new LeaguePrizeTable
        {
            Id = Guid.NewGuid(),
            LeagueId = leagueId,
            Name = name,
            PrizePoolTotal = dto.PrizePoolTotal,
            JackpotAmount = dto.JackpotAmount,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var entry in dto.Entries)
        {
            prizeTable.Entries.Add(new LeaguePrizeTableEntry
            {
                Id = Guid.NewGuid(),
                LeaguePrizeTableId = prizeTable.Id,
                Position = entry.Position,
                PrizeAmount = entry.PrizeAmount
            });
        }

        _context.LeaguePrizeTables.Add(prizeTable);
        await _context.SaveChangesAsync();

        return new LeaguePrizeTableDto(
            prizeTable.Id,
            prizeTable.LeagueId,
            prizeTable.Name,
            prizeTable.PrizePoolTotal,
            prizeTable.JackpotAmount,
            prizeTable.Entries
                .OrderBy(e => e.Position)
                .Select(e => new PrizeTableEntryDto(e.Position, e.PrizeAmount))
                .ToList(),
            prizeTable.CreatedAt
        );
    }

    public async Task<LeaguePrizeTableDto?> UpdatePrizeTableAsync(Guid prizeTableId, UpdatePrizeTableDto dto)
    {
        var prizeTable = await _context.LeaguePrizeTables
            .FirstOrDefaultAsync(pt => pt.Id == prizeTableId);

        if (prizeTable == null) return null;

        // Check if another table has the same prize pool total
        var existingTable = await _context.LeaguePrizeTables
            .AnyAsync(pt => pt.LeagueId == prizeTable.LeagueId &&
                          pt.PrizePoolTotal == dto.PrizePoolTotal &&
                          pt.Id != prizeTableId);

        if (existingTable)
            throw new InvalidOperationException($"Já existe uma tabela de premiação para o prize pool de {dto.PrizePoolTotal:C}");

        // Auto-generate name if empty
        prizeTable.Name = string.IsNullOrWhiteSpace(dto.Name)
            ? $"Pote {dto.PrizePoolTotal:N0}"
            : dto.Name;
        prizeTable.PrizePoolTotal = dto.PrizePoolTotal;
        prizeTable.JackpotAmount = dto.JackpotAmount;

        // Remove existing entries - query separately to ensure proper tracking
        var existingEntries = await _context.LeaguePrizeTableEntries
            .Where(e => e.LeaguePrizeTableId == prizeTableId)
            .ToListAsync();
        _context.LeaguePrizeTableEntries.RemoveRange(existingEntries);

        // Add new entries directly to the DbSet (not via navigation property)
        var newEntries = dto.Entries.Select(entry => new LeaguePrizeTableEntry
        {
            Id = Guid.NewGuid(),
            LeaguePrizeTableId = prizeTable.Id,
            Position = entry.Position,
            PrizeAmount = entry.PrizeAmount
        }).ToList();

        await _context.LeaguePrizeTableEntries.AddRangeAsync(newEntries);
        await _context.SaveChangesAsync();

        return new LeaguePrizeTableDto(
            prizeTable.Id,
            prizeTable.LeagueId,
            prizeTable.Name,
            prizeTable.PrizePoolTotal,
            prizeTable.JackpotAmount,
            newEntries
                .OrderBy(e => e.Position)
                .Select(e => new PrizeTableEntryDto(e.Position, e.PrizeAmount))
                .ToList(),
            prizeTable.CreatedAt
        );
    }

    public async Task<bool> DeletePrizeTableAsync(Guid prizeTableId)
    {
        var prizeTable = await _context.LeaguePrizeTables.FindAsync(prizeTableId);
        if (prizeTable == null) return false;

        _context.LeaguePrizeTables.Remove(prizeTable);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PrizeDistributionResultDto> CalculatePrizeDistributionAsync(
        Guid leagueId,
        decimal prizePoolTotal,
        string? fallbackPercentages)
    {
        // Try to find an exact match in prize tables
        var prizeTable = await FindMatchingPrizeTableAsync(leagueId, prizePoolTotal);

        if (prizeTable != null)
        {
            // Use pre-defined prize table
            var allocations = prizeTable.Entries
                .Select(e => new PrizeAllocationDto(e.Position, e.PrizeAmount, true))
                .ToList();

            return new PrizeDistributionResultDto(
                true,
                prizeTable.Name,
                prizeTable.JackpotAmount,
                allocations
            );
        }

        // Fallback to percentage-based calculation
        var percentages = ParsePrizeStructure(fallbackPercentages);
        var league = await _context.Leagues.FindAsync(leagueId);
        var jackpotPercentage = league?.JackpotPercentage ?? 0;
        var jackpotContribution = prizePoolTotal * jackpotPercentage / 100;
        var distributablePool = prizePoolTotal - jackpotContribution;

        var allocations2 = percentages
            .Select((percentage, index) => new PrizeAllocationDto(
                index + 1,
                distributablePool * percentage / 100,
                false
            ))
            .ToList();

        return new PrizeDistributionResultDto(
            false,
            null,
            jackpotContribution,
            allocations2
        );
    }

    private static List<decimal> ParsePrizeStructure(string? prizeStructure)
    {
        if (string.IsNullOrEmpty(prizeStructure))
            return [100]; // Default: winner takes all

        return prizeStructure
            .Split(',')
            .Select(s => decimal.TryParse(s.Trim(), out var val) ? val : 0)
            .Where(v => v > 0)
            .ToList();
    }
}
