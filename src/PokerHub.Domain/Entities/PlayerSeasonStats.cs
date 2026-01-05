namespace PokerHub.Domain.Entities;

/// <summary>
/// Armazena estatísticas históricas/legadas de jogadores por temporada.
/// Usado para importação de dados históricos onde não temos os torneios individuais.
/// </summary>
public class PlayerSeasonStats
{
    public Guid Id { get; set; }
    public Guid SeasonId { get; set; }
    public Guid PlayerId { get; set; }

    /// <summary>
    /// Número de jogos disputados na temporada (J)
    /// </summary>
    public int GamesPlayed { get; set; }

    /// <summary>
    /// Quantidade de primeiros lugares na temporada (1º)
    /// </summary>
    public int FirstPlaces { get; set; }

    /// <summary>
    /// Quantidade de segundos lugares na temporada (2º)
    /// </summary>
    public int SecondPlaces { get; set; }

    /// <summary>
    /// Quantidade de terceiros lugares na temporada (3º)
    /// </summary>
    public int ThirdPlaces { get; set; }

    /// <summary>
    /// Custo total gasto na temporada (buy-ins + rebuys + add-ons)
    /// </summary>
    public decimal TotalCost { get; set; }

    /// <summary>
    /// Prêmio total ganho na temporada
    /// </summary>
    public decimal TotalPrize { get; set; }

    /// <summary>
    /// Saldo da temporada (TotalPrize - TotalCost)
    /// </summary>
    public decimal Balance { get; set; }

    /// <summary>
    /// Posição final no ranking da temporada
    /// </summary>
    public int FinalPosition { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Season Season { get; set; } = null!;
    public Player Player { get; set; } = null!;
}
