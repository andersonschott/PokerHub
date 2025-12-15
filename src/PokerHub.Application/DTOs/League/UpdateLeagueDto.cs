using System.ComponentModel.DataAnnotations;

namespace PokerHub.Application.DTOs.League;

public record UpdateLeagueDto(
    [Required(ErrorMessage = "O nome da liga e obrigatorio")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "O nome deve ter entre 3 e 200 caracteres")]
    string Name,

    [StringLength(1000, ErrorMessage = "A descricao deve ter no maximo 1000 caracteres")]
    string? Description,

    bool BlockCheckInWithDebt
);
