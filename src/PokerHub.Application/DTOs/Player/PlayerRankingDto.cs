namespace PokerHub.Application.DTOs.Player;

public record PlayerRankingDto(
    int Position,
    Guid PlayerId,
    string PlayerName,
    string? Nickname,
    int TournamentsPlayed,
    int Wins,
    int SecondPlaces,
    int ThirdPlaces,
    int Top3Finishes,
    decimal TotalBuyIns,
    decimal TotalPrizes,
    decimal Profit,
    decimal ROI,
    decimal ITMRate,
    int TotalSeasonTournaments,
    int ParticipationPercentage,
    // Movimento de posição desde o último torneio da temporada (prevPos - currPos;
    // positivo = subiu). Null quando não há como calcular: ranking geral/acumulado
    // e temporadas legadas (sem dados por torneio).
    int? Delta = null,
    // Últimos 5 resultados do jogador, do mais antigo ao mais recente (forma recente).
    IReadOnlyList<PlayerRecentResultDto>? RecentResults = null
);

/// <summary>Resultado resumido de um torneio para os dots de forma recente.</summary>
public record PlayerRecentResultDto(int? Position, decimal Prize);
