using System.ComponentModel.DataAnnotations;
using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Tournament;

public record CreateTournamentDto(
    [Required(ErrorMessage = "O nome do torneio e obrigatorio")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "O nome deve ter entre 3 e 200 caracteres")]
    string Name,

    [Required(ErrorMessage = "A data e hora sao obrigatorias")]
    DateTime ScheduledDateTime,

    [StringLength(500, ErrorMessage = "O local deve ter no maximo 500 caracteres")]
    string? Location,

    [Required(ErrorMessage = "O buy-in e obrigatorio")]
    [Range(0.01, 100000, ErrorMessage = "O buy-in deve ser maior que zero")]
    decimal BuyIn,

    [Required(ErrorMessage = "O stack inicial e obrigatorio")]
    [Range(100, 1000000, ErrorMessage = "O stack inicial deve ser entre 100 e 1.000.000")]
    int StartingStack,

    [Range(0, 100000, ErrorMessage = "O valor do rebuy deve ser valido")]
    decimal? RebuyValue,

    [Range(100, 1000000)]
    int? RebuyStack,

    [Range(1, 50)]
    int? RebuyLimitLevel,

    [Range(1, 600)]
    int? RebuyLimitMinutes,

    RebuyLimitType RebuyLimitType,

    [Range(0, 100000, ErrorMessage = "O valor do add-on deve ser valido")]
    decimal? AddonValue,

    [Range(100, 1000000)]
    int? AddonStack,

    string? PrizeStructure,

    IList<CreateBlindLevelDto> BlindLevels
);
