using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Expense;

public record TournamentExpenseDto(
    Guid Id,
    Guid TournamentId,
    Guid PaidByPlayerId,
    string PaidByPlayerName,
    string Description,
    decimal TotalAmount,
    ExpenseSplitType SplitType,
    DateTime CreatedAt,
    IReadOnlyList<ExpenseShareDto> Shares
);

public record ExpenseShareDto(
    Guid Id,
    Guid PlayerId,
    string PlayerName,
    decimal Amount
);

public record CreateExpenseDto(
    Guid PaidByPlayerId,
    string Description,
    decimal TotalAmount,
    ExpenseSplitType SplitType,
    IReadOnlyList<ExpenseShareInput> Shares
);

public record ExpenseShareInput(
    Guid PlayerId,
    decimal Amount
);

public record ExpenseSummaryDto(
    Guid PlayerId,
    string PlayerName,
    decimal TotalPaid,
    decimal TotalOwed,
    decimal ExpenseBalance
);
