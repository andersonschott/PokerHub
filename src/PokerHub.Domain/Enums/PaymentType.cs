namespace PokerHub.Domain.Enums;

public enum PaymentType
{
    Poker = 0,      // Pagamento de resultado do poker (prize - investment)
    Expense = 1,    // Pagamento de despesa extra (rateio)
    Jackpot = 2     // Contribuicao para caixinha
}
