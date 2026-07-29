namespace PokerHub.Application.Helpers;

public static class FinancialMath
{
    /// <summary>
    /// Rounds a decimal to the nearest integer using MidpointRounding.AwayFromZero.
    /// Returns int because the poker settlement (buy-in, rebuy, prêmio, caixinha) operates
    /// with whole values. NÃO use para despesas rateadas — elas têm centavos reais
    /// (R$ 173 / 5 = R$ 34,60) e arredondar cobraria a mais do jogador.
    /// </summary>
    public static int FinancialRound(decimal value)
    {
        return (int)Math.Round(value, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// Rounds a decimal to 2 decimal places (centavos), matching the decimal(18,2) columns.
    /// Use para valores que podem ter centavos, como o rateio de despesas.
    /// </summary>
    public static decimal RoundCents(decimal value)
    {
        return Math.Round(value, 2, MidpointRounding.AwayFromZero);
    }
}
