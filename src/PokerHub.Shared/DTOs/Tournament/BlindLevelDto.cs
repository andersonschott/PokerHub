namespace PokerHub.Application.DTOs.Tournament;

public record BlindLevelDto(
    Guid Id,
    int Order,
    int SmallBlind,
    int BigBlind,
    int Ante,
    int DurationMinutes,
    bool IsBreak,
    string? BreakDescription
);

public record CreateBlindLevelDto(
    int Order,
    int SmallBlind,
    int BigBlind,
    int Ante,
    int DurationMinutes,
    bool IsBreak,
    string? BreakDescription
);
