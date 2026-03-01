using PokerHub.Application.DTOs.Payment;
using PokerHub.Application.DTOs.Player;

namespace PokerHub.Application.Interfaces;

public interface IExportService
{
    byte[] ExportPaymentsToExcel(IReadOnlyList<PaymentDto> payments, string tournamentName);
    byte[] ExportRankingToExcel(IReadOnlyList<PlayerRankingDto> rankings, string title);
    string ExportRankingToCsv(IReadOnlyList<PlayerRankingDto> rankings);
}
