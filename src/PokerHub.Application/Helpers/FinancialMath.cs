namespace PokerHub.Application.Helpers;

public static class FinancialMath
{
    /// <summary>
    /// Rounds a decimal to the nearest integer using MidpointRounding.AwayFromZero.
    /// Returns int because the payment system operates with whole values (no cents).
    /// </summary>
    public static int FinancialRound(decimal value)
    {
        return (int)Math.Round(value, MidpointRounding.AwayFromZero);
    }
}
