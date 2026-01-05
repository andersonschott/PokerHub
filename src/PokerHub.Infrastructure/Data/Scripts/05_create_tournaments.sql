-- Script de Carga Historica - Liga Pokerzao
-- Parte 5: Criar Torneios Consolidados por Temporada

DECLARE @LeagueId UNIQUEIDENTIFIER;
SELECT @LeagueId = Id FROM Leagues WHERE Name = N'Pokerzão';

IF @LeagueId IS NULL
BEGIN
    RAISERROR('Liga Pokerzão não encontrada. Execute o script 01 primeiro.', 16, 1);
    RETURN;
END

-- Criar um torneio consolidado por ano
DECLARE @Year INT = 2018;
DECLARE @SeasonId UNIQUEIDENTIFIER;
DECLARE @TournamentId UNIQUEIDENTIFIER;

WHILE @Year <= 2025
BEGIN
    SELECT @SeasonId = Id FROM Seasons WHERE LeagueId = @LeagueId AND Name = N'Temporada ' + CAST(@Year AS NVARCHAR(4));

    IF @SeasonId IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM Tournaments WHERE LeagueId = @LeagueId AND Name = N'Ranking Final ' + CAST(@Year AS NVARCHAR(4))
    )
    BEGIN
        SET @TournamentId = NEWID();

        INSERT INTO Tournaments (
            Id, LeagueId, Name, ScheduledDateTime, Location, BuyIn, StartingStack,
            RebuyValue, RebuyStack, RebuyLimitLevel, RebuyLimitMinutes, RebuyLimitType,
            AddonValue, AddonStack, PrizeStructure, PrizeDistributionType, UsePrizeTable, PrizeTableId,
            InviteCode, AllowCheckInUntilLevel, Status, CurrentLevel, TimeRemainingSeconds,
            CurrentLevelStartedAt, CreatedAt, StartedAt, FinishedAt
        )
        VALUES (
            @TournamentId,
            @LeagueId,
            N'Ranking Final ' + CAST(@Year AS NVARCHAR(4)),
            DATETIMEFROMPARTS(@Year, 12, 31, 20, 0, 0, 0),  -- 31/12/YYYY 20:00
            N'Histórico - Dados Consolidados',
            60.00,  -- BuyIn padrao
            10000,
            0, 0, 0, 0, 0,  -- Sem rebuy
            0, 0,           -- Sem addon
            NULL,
            0,  -- Percentage
            0,  -- Nao usa prize table
            NULL,
            LEFT(REPLACE(CAST(NEWID() AS NVARCHAR(36)), '-', ''), 8),  -- InviteCode aleatorio
            NULL,
            4,  -- Status = Finished
            1,
            0,
            NULL,
            GETUTCDATE(),
            DATETIMEFROMPARTS(@Year, 1, 1, 20, 0, 0, 0),  -- Inicio em 01/01
            DATETIMEFROMPARTS(@Year, 12, 31, 23, 59, 59, 0)  -- Fim em 31/12
        );

        PRINT 'Torneio criado: Ranking Final ' + CAST(@Year AS NVARCHAR(4));
    END

    SET @Year = @Year + 1;
END

PRINT 'Torneios consolidados criados';
