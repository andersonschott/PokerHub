namespace PokerHub.Application.Exceptions;

public sealed class BusinessRuleException(string message) : InvalidOperationException(message);
