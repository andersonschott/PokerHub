-- Script de Carga Historica - Liga Pokerzao
-- Parte 2: Criar Jogadores

DECLARE @LeagueId UNIQUEIDENTIFIER;
SELECT @LeagueId = Id FROM Leagues WHERE Name = N'Pokerzão';

IF @LeagueId IS NULL
BEGIN
    RAISERROR('Liga Pokerzão não encontrada. Execute o script 01 primeiro.', 16, 1);
    RETURN;
END

-- Lista de todos os jogadores unicos encontrados nas temporadas 2018-2025
DECLARE @Players TABLE (Name NVARCHAR(200));
INSERT INTO @Players (Name) VALUES
    (N'Toledo'), (N'Edu'), (N'Wess'), (N'Furlis'), (N'Idozo'), (N'Vinão'), (N'Jean'), (N'Gustavão'),
    (N'Antonio'), (N'Dorfera'), (N'Diegão'), (N'Feltrin'), (N'Bomber'), (N'Jads'), (N'Schott'), (N'Horta'),
    (N'Thiago'), (N'Guilherme'), (N'Barroso'), (N'Leo'), (N'Luiz'), (N'Rapha'), (N'Mello'), (N'Ronaldo'),
    (N'Mateus'), (N'Gu Miante'), (N'Douglas Jesus'), (N'Breno'), (N'Harry'), (N'Murilo Jesus'), (N'Saci'),
    (N'Daniel'), (N'Macoy'), (N'Rodrigo'), (N'André'), (N'Nicolas'), (N'Nathan'), (N'João'), (N'Sabiá'),
    (N'Clone'), (N'Yago'), (N'Luan'), (N'Rafaela'), (N'Henrique'), (N'Carlão'), (N'Bob'), (N'Tilas'),
    (N'Iago'), (N'Gui Marzocchi'), (N'Renan'), (N'Junior'), (N'Rubercy'), (N'Edinaldo'), (N'Corvo'),
    (N'Canaveze'), (N'Marco Aurelio');

-- Inserir jogadores que nao existem
INSERT INTO Players (Id, LeagueId, Name, Nickname, Email, Phone, PixKey, PixKeyType, UserId, CreatedAt, IsActive)
SELECT
    NEWID(),
    @LeagueId,
    p.Name,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    GETUTCDATE(),
    1
FROM @Players p
WHERE NOT EXISTS (
    SELECT 1 FROM Players WHERE LeagueId = @LeagueId AND Name = p.Name
);

PRINT 'Jogadores criados: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
