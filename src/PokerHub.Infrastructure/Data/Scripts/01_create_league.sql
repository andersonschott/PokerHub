-- Script de Carga Historica - Liga Pokerzao
-- Parte 1: Criar Liga

-- Declarar variavel para o OrganizerId (primeiro usuario do sistema)
DECLARE @OrganizerId UNIQUEIDENTIFIER = '6be61f6f-497d-4f0e-a678-ee67c099c7f7'

-- Verificar se a liga ja existe
IF NOT EXISTS (SELECT 1 FROM Leagues WHERE Name = N'Pokerzão')
BEGIN
    DECLARE @LeagueId UNIQUEIDENTIFIER = NEWID();

    INSERT INTO Leagues (Id, Name, Description, InviteCode, OrganizerId, BlockCheckInWithDebt, CreatedAt, IsActive, JackpotPercentage, AccumulatedPrizePool)
    VALUES (
        @LeagueId,
        N'Pokerzão',
        N'Liga histórica de poker - Dados importados da planilha original (2018-2025)',
        'PKRZAO',
        @OrganizerId,
        0,
        GETUTCDATE(),
        1,
        0,
        0
    );

    PRINT 'Liga Pokerzão criada com ID: ' + CAST(@LeagueId AS NVARCHAR(50));
END
ELSE
BEGIN
    PRINT 'Liga Pokerzão ja existe';
END
