using System.Globalization;

namespace PokerHub.Client.Helpers;

public static class Format
{
    private static readonly CultureInfo PtBr = new("pt-BR");
    public static string ToBrl(this decimal value) => value.ToString("C", PtBr);
    public static string ToBrl(this decimal? value) => value?.ToString("C", PtBr) ?? "-";
}
