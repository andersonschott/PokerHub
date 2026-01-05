-- Script de Carga Historica - Liga Pokerzao
-- Parte 4: Criar Temporadas (2018-2025)

DECLARE @LeagueId UNIQUEIDENTIFIER;
SELECT @LeagueId = Id FROM Leagues WHERE Name = N'Pokerzão';

IF @LeagueId IS NULL
BEGIN
    RAISERROR('Liga Pokerzão não encontrada. Execute o script 01 primeiro.', 16, 1);
    RETURN;
END

-- Criar temporadas de 2018 a 2025
DECLARE @Year INT = 2018;

WHILE @Year <= 2025
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Seasons WHERE LeagueId = @LeagueId AND Name = N'Temporada ' + CAST(@Year AS NVARCHAR(4)))
    BEGIN
        INSERT INTO Seasons (Id, LeagueId, Name, StartDate, EndDate, IsActive, CreatedAt)
        VALUES (
            NEWID(),
            @LeagueId,
            N'Temporada ' + CAST(@Year AS NVARCHAR(4)),
            DATEFROMPARTS(@Year, 1, 1),
            DATEFROMPARTS(@Year, 12, 31),
            CASE WHEN @Year = 2025 THEN 1 ELSE 0 END,  -- Apenas 2025 ativa
            GETUTCDATE()
        );
    END

    SET @Year = @Year + 1;
END

PRINT 'Temporadas criadas: 2018-2025';
