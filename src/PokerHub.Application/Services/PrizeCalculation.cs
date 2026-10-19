using System.Globalization;
using PokerHub.Application.DTOs.PrizeTable;
using PokerHub.Application.Exceptions;
using PokerHub.Application.Helpers;
using PokerHub.Domain.Enums;

namespace PokerHub.Application.Services;

internal static class PrizeCalculation
{
    internal static List<decimal> Parse(string? structure, PrizeDistributionType type)
    {
        if (string.IsNullOrWhiteSpace(structure))
        {
            if (type == PrizeDistributionType.Percentage) return [100m];
            throw new BusinessRuleException("Informe os valores da premiação fixa.");
        }
        if (!Enum.IsDefined(type)) throw new BusinessRuleException("Tipo de premiação inválido.");
        var values = new List<decimal>();
        foreach (var item in structure.Split(','))
        {
            if (!decimal.TryParse(item.Trim(), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value)
                || value < 0 || FinancialMath.RoundCents(value) != value)
                throw new BusinessRuleException("A premiação deve conter valores positivos ou zero, com até duas casas decimais.");
            values.Add(value);
        }
        if (values.Count == 0 || values.Sum() <= 0 || (type == PrizeDistributionType.Percentage && values.Sum() != 100))
            throw new BusinessRuleException("Os percentuais de premiação devem somar 100%; valores fixos devem ter soma positiva.");
        return values;
    }

    internal static void ValidateTotal(decimal pool, decimal jackpot, IEnumerable<(int Position, decimal Amount)> prizes)
    {
        var entries = prizes.ToList();
        if (pool < 0 || jackpot < 0 || FinancialMath.RoundCents(jackpot) != jackpot
            || entries.Any(p => p.Position < 1 || p.Amount < 0 || FinancialMath.RoundCents(p.Amount) != p.Amount)
            || entries.Select(p => p.Position).Distinct().Count() != entries.Count)
            throw new BusinessRuleException("Confira posições, prêmios e caixinha: não são permitidos valores negativos, posições repetidas ou frações de centavo.");
        if (entries.Sum(p => p.Amount) + jackpot != pool)
            throw new BusinessRuleException($"Prêmios + caixinha devem fechar exatamente com a arrecadação de R$ {pool:N2}.");
    }

    internal static List<PrizeAllocationDto> Allocate(decimal pool, decimal jackpot, List<decimal> values, PrizeDistributionType type)
    {
        if (type == PrizeDistributionType.Fixed)
            return values.Select((v, i) => new PrizeAllocationDto(i + 1, v, false)).ToList();
        // Largest-remainder allocation works even for R$0.03 split five ways:
        // no negative prize and every cent goes to a real position.
        var exactCents = values.Select(v => (pool - jackpot) * v).ToList();
        var amounts = exactCents.Select(v => Math.Floor(v) / 100).ToList();
        var remainder = (int)((pool - jackpot - amounts.Sum()) * 100);
        foreach (var index in Enumerable.Range(0, amounts.Count)
            .OrderByDescending(i => exactCents[i] - Math.Floor(exactCents[i])).ThenBy(i => i).Take(remainder))
            amounts[index] += 0.01m;
        return amounts.Select((v, i) => new PrizeAllocationDto(i + 1, v, false)).ToList();
    }
}
