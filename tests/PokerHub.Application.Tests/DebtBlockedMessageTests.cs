using PokerHub.Application.DTOs.Payment;
using PokerHub.Application.Services;
using PokerHub.Domain.Enums;

namespace PokerHub.Application.Tests;

/// <summary>
/// Cobre a mensagem de bloqueio de inscrição por débito (BlockCheckInWithDebt).
/// O jogador precisa saber O QUE bloqueou: débito em aberto (Pending) vs pago
/// aguardando confirmação do credor (Paid) — e os valores/credores envolvidos.
/// Asserts de moeda usam só "NN,NN" porque o separador entre "R$" e o número
/// varia (NBSP) conforme a versão do ICU.
/// </summary>
public class DebtBlockedMessageTests
{
    private static PendingDebtDto Debt(decimal amount, PaymentStatus status, string creditor = "Eduardo") =>
        new(
            PaymentId: Guid.NewGuid(),
            TournamentId: Guid.NewGuid(),
            TournamentName: "T2026 - Semana 26",
            TournamentDate: new DateTime(2026, 7, 8),
            DebtorPlayerId: Guid.NewGuid(),
            CreditorPlayerId: Guid.NewGuid(),
            CreditorPlayerName: creditor,
            CreditorPixKey: null,
            Amount: amount,
            DaysOpen: 7,
            Status: status);

    [Fact]
    public void OnlyOpenDebts_SaysOpenAmountAndCreditor()
    {
        var msg = TournamentService.BuildDebtBlockedMessage([Debt(50m, PaymentStatus.Pending)]);

        Assert.Contains("débito em aberto", msg);
        Assert.Contains("50,00", msg);
        Assert.Contains("Eduardo", msg);
        Assert.DoesNotContain("confirmação do credor", msg);
    }

    [Fact]
    public void OnlyAwaitingConfirmation_SaysPaidAwaitingCreditor()
    {
        var msg = TournamentService.BuildDebtBlockedMessage([Debt(60m, PaymentStatus.Paid)]);

        Assert.Contains("aguarda a confirmação do credor", msg);
        Assert.Contains("60,00", msg);
        Assert.Contains("Eduardo", msg);
        Assert.DoesNotContain("em aberto", msg);
    }

    [Fact]
    public void OpenAndAwaiting_MentionsBothStatusesWithAmounts()
    {
        var msg = TournamentService.BuildDebtBlockedMessage(
        [
            Debt(50m, PaymentStatus.Pending, "Eduardo"),
            Debt(60m, PaymentStatus.Paid, "Guilherme"),
        ]);

        Assert.Contains("em aberto", msg);
        Assert.Contains("aguardando confirmação", msg);
        Assert.Contains("50,00", msg);
        Assert.Contains("60,00", msg);
        Assert.Contains("Eduardo", msg);
        Assert.Contains("Guilherme", msg);
    }

    [Fact]
    public void SameStatus_SumsAmounts()
    {
        var msg = TournamentService.BuildDebtBlockedMessage(
        [
            Debt(40m, PaymentStatus.Pending),
            Debt(35m, PaymentStatus.Pending),
        ]);

        Assert.Contains("75,00", msg);
    }

    [Fact]
    public void TwoCreditors_ListsBothNames()
    {
        var msg = TournamentService.BuildDebtBlockedMessage(
        [
            Debt(10m, PaymentStatus.Pending, "Eduardo"),
            Debt(20m, PaymentStatus.Pending, "Guilherme"),
        ]);

        Assert.Contains("Eduardo e Guilherme", msg);
    }

    [Fact]
    public void ManyCreditors_UsesCount()
    {
        var msg = TournamentService.BuildDebtBlockedMessage(
        [
            Debt(10m, PaymentStatus.Pending, "Eduardo"),
            Debt(20m, PaymentStatus.Pending, "Guilherme"),
            Debt(30m, PaymentStatus.Pending, "Rafael"),
        ]);

        Assert.Contains("3 credores", msg);
    }
}
