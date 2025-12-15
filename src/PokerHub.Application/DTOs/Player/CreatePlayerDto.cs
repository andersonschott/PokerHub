using System.ComponentModel.DataAnnotations;
using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Player;

public record CreatePlayerDto(
    [Required(ErrorMessage = "O nome do jogador e obrigatorio")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "O nome deve ter entre 2 e 200 caracteres")]
    string Name,

    [StringLength(100, ErrorMessage = "O apelido deve ter no maximo 100 caracteres")]
    string? Nickname,

    [EmailAddress(ErrorMessage = "Email invalido")]
    [StringLength(256, ErrorMessage = "O email deve ter no maximo 256 caracteres")]
    string? Email,

    [Phone(ErrorMessage = "Telefone invalido")]
    [StringLength(20, ErrorMessage = "O telefone deve ter no maximo 20 caracteres")]
    string? Phone,

    [StringLength(256, ErrorMessage = "A chave PIX deve ter no maximo 256 caracteres")]
    string? PixKey,

    PixKeyType? PixKeyType
);
