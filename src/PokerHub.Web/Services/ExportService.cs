using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using PokerHub.Application.DTOs.Payment;
using PokerHub.Application.DTOs.Player;
using PokerHub.Application.Interfaces;

namespace PokerHub.Web.Services;

public class ExportService : IExportService
{
    private static readonly CultureInfo PtBr = new("pt-BR");

    public byte[] ExportPaymentsToExcel(IReadOnlyList<PaymentDto> payments, string tournamentName)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Pagamentos");

        // Header
        ws.Cell(1, 1).Value = "Tipo";
        ws.Cell(1, 2).Value = "De";
        ws.Cell(1, 3).Value = "Para";
        ws.Cell(1, 4).Value = "Valor";
        ws.Cell(1, 5).Value = "Status";
        ws.Cell(1, 6).Value = "Torneio";

        var headerRange = ws.Range(1, 1, 1, 6);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.DarkGreen;
        headerRange.Style.Font.FontColor = XLColor.White;

        for (var i = 0; i < payments.Count; i++)
        {
            var p = payments[i];
            var row = i + 2;
            ws.Cell(row, 1).Value = p.Type.ToString();
            ws.Cell(row, 2).Value = p.FromPlayerName;
            ws.Cell(row, 3).Value = p.ToPlayerName ?? "Jackpot";
            ws.Cell(row, 4).Value = p.Amount;
            ws.Cell(row, 4).Style.NumberFormat.Format = "R$ #,##0.00";
            ws.Cell(row, 5).Value = p.Status.ToString();
            ws.Cell(row, 6).Value = tournamentName;
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public byte[] ExportRankingToExcel(IReadOnlyList<PlayerRankingDto> rankings, string title)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Ranking");

        // Header
        string[] headers = ["#", "Jogador", "Apelido", "Torneios", "Vitorias", "Top 3", "Lucro", "ROI%", "ITM%"];
        for (var i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
        }

        var headerRange = ws.Range(1, 1, 1, headers.Length);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.DarkGreen;
        headerRange.Style.Font.FontColor = XLColor.White;

        for (var i = 0; i < rankings.Count; i++)
        {
            var r = rankings[i];
            var row = i + 2;
            ws.Cell(row, 1).Value = r.Position;
            ws.Cell(row, 2).Value = r.PlayerName;
            ws.Cell(row, 3).Value = r.Nickname ?? "";
            ws.Cell(row, 4).Value = r.TournamentsPlayed;
            ws.Cell(row, 5).Value = r.Wins;
            ws.Cell(row, 6).Value = r.Top3Finishes;
            ws.Cell(row, 7).Value = r.Profit;
            ws.Cell(row, 7).Style.NumberFormat.Format = "R$ #,##0.00";
            ws.Cell(row, 8).Value = r.ROI;
            ws.Cell(row, 8).Style.NumberFormat.Format = "0.0%";
            ws.Cell(row, 9).Value = r.ITMRate;
            ws.Cell(row, 9).Style.NumberFormat.Format = "0.0%";
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public string ExportRankingToCsv(IReadOnlyList<PlayerRankingDto> rankings)
    {
        var sb = new StringBuilder();
        sb.AppendLine("#,Jogador,Apelido,Torneios,Vitorias,Top 3,Lucro,ROI%,ITM%");

        foreach (var r in rankings)
        {
            sb.AppendLine(string.Join(',',
                r.Position,
                CsvEscape(r.PlayerName),
                CsvEscape(r.Nickname ?? ""),
                r.TournamentsPlayed,
                r.Wins,
                r.Top3Finishes,
                r.Profit.ToString("F2", CultureInfo.InvariantCulture),
                r.ROI.ToString("F1", CultureInfo.InvariantCulture),
                r.ITMRate.ToString("F1", CultureInfo.InvariantCulture)));
        }

        return sb.ToString();
    }

    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
