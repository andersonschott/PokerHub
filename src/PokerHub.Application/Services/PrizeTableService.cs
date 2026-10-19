using PokerHub.Domain.Enums;
using PokerHub.Application.Helpers;
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

    public Task<LeaguePrizeTableDto> CreatePrizeTableAsync(Guid leagueId, CreatePrizeTableDto dto)
        => MutationScope.RunAsync(_context, leagueId, "Tabela de premiação criada", () => CreatePrizeTableCoreAsync(leagueId, dto), "League");

    private async Task<LeaguePrizeTableDto> CreatePrizeTableCoreAsync(Guid leagueId, CreatePrizeTableDto dto)
    {
        PrizeCalculation.ValidateTotal(dto.PrizePoolTotal, dto.JackpotAmount, dto.Entries.Select(e => (e.Position, e.PrizeAmount)));
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
        var leagueId = await _context.LeaguePrizeTables.AsNoTracking().Where(p => p.Id == prizeTableId).Select(p => (Guid?)p.LeagueId).FirstOrDefaultAsync();
        if (leagueId == null) return null;
        return await MutationScope.RunAsync(_context, leagueId.Value, "Tabela de premiação atualizada", () => UpdatePrizeTableCoreAsync(prizeTableId, dto), "League");
    }

    private async Task<LeaguePrizeTableDto?> UpdatePrizeTableCoreAsync(Guid prizeTableId, UpdatePrizeTableDto dto)
    {
        var prizeTable = await _context.LeaguePrizeTables
            .FirstOrDefaultAsync(pt => pt.Id == prizeTableId);

        if (prizeTable == null) return null;

        PrizeCalculation.ValidateTotal(dto.PrizePoolTotal, dto.JackpotAmount, dto.Entries.Select(e => (e.Position, e.PrizeAmount)));
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
        string? fallbackPercentages,
        bool usePrizeTable = true,
        PrizeDistributionType distributionType = PrizeDistributionType.Percentage)
    {
        // Only try to find prize table if usePrizeTable is true
        if (usePrizeTable)
        {
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
        }

        var values = PrizeCalculation.Parse(fallbackPercentages, distributionType);
        var league = await _context.Leagues.FindAsync(leagueId);
        var jackpotPercentage = league?.JackpotPercentage ?? 0;
        if (jackpotPercentage < 0 || jackpotPercentage > 100)
            throw new PokerHub.Application.Exceptions.BusinessRuleException("O percentual da caixinha deve estar entre 0 e 100.");
        var jackpot = FinancialMath.RoundCents(prizePoolTotal * jackpotPercentage / 100);
        return new PrizeDistributionResultDto(false, null, jackpot,
            PrizeCalculation.Allocate(prizePoolTotal, jackpot, values, distributionType));
    }
}
