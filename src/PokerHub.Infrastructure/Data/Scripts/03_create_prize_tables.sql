-- Script de Carga Historica - Liga Pokerzao
-- Parte 3: Criar Tabelas de Premios

DECLARE @LeagueId UNIQUEIDENTIFIER;
SELECT @LeagueId = Id FROM Leagues WHERE Name = N'Pokerzão';

IF @LeagueId IS NULL
BEGIN
    RAISERROR('Liga Pokerzão não encontrada. Execute o script 01 primeiro.', 16, 1);
    RETURN;
END

-- Tabela temporaria com dados da aba PREMIOS
-- Formato: POTE, CAIXINHA, PREMIO, 1o, 2o, 3o
DECLARE @PrizeData TABLE (
    Pote DECIMAL(18,2),
    Caixinha DECIMAL(18,2),
    Premio DECIMAL(18,2),
    Primeiro DECIMAL(18,2),
    Segundo DECIMAL(18,2),
    Terceiro DECIMAL(18,2)
);

-- Dados extraidos da planilha PREMIOS (coluna B-G e I-N)
INSERT INTO @PrizeData VALUES
    (300, 0, 300, 140, 100, 60),
    (360, 0, 360, 160, 130, 70),
    (420, 0, 420, 190, 150, 80),
    (480, 0, 480, 220, 170, 90),
    (540, 0, 540, 250, 200, 90),
    (600, 60, 540, 250, 200, 90),
    (660, 60, 600, 290, 210, 100),
    (720, 60, 660, 310, 230, 120),
    (780, 60, 720, 320, 250, 150),
    (840, 60, 780, 350, 270, 160),
    (900, 80, 820, 370, 290, 160),
    (960, 80, 880, 400, 300, 180),
    (1020, 80, 940, 420, 330, 190),
    (1080, 80, 1000, 450, 350, 200),
    (1140, 80, 1060, 480, 370, 210),
    (1200, 100, 1100, 490, 390, 220),
    (1260, 100, 1160, 520, 410, 230),
    (1290, 100, 1190, 540, 410, 240),
    (1350, 120, 1230, 550, 430, 250),
    (1410, 120, 1290, 580, 450, 260),
    (1470, 150, 1320, 600, 460, 260),
    (1530, 150, 1380, 620, 480, 280),
    (1590, 150, 1440, 650, 500, 290),
    (1650, 150, 1500, 670, 530, 300),
    (1710, 150, 1560, 700, 550, 310),
    (1770, 180, 1590, 720, 550, 320),
    (1830, 180, 1650, 740, 570, 340),
    (1890, 180, 1710, 760, 600, 350),
    (1950, 180, 1770, 780, 630, 360),
    (2010, 200, 1810, 810, 640, 360),
    (2070, 200, 1870, 840, 660, 370),
    (2130, 200, 1930, 870, 680, 380),
    (2190, 200, 1990, 890, 700, 400),
    (2250, 200, 2050, 920, 720, 410),
    -- Segunda tabela (colunas I-N)
    (2310, 220, 2090, 940, 730, 420),
    (2370, 220, 2150, 970, 750, 430),
    (2430, 220, 2210, 1000, 770, 440),
    (2490, 220, 2270, 1020, 790, 460),
    (2550, 240, 2310, 1040, 800, 470),
    (2610, 240, 2370, 1060, 830, 480),
    (2670, 240, 2430, 1090, 850, 490),
    (2730, 240, 2490, 1120, 870, 500),
    (2790, 260, 2530, 1140, 890, 500),
    (2850, 260, 2590, 1160, 910, 520),
    (2910, 260, 2650, 1190, 930, 530),
    (2970, 280, 2690, 1210, 940, 540),
    (3030, 280, 2750, 1240, 960, 550),
    (3090, 280, 2810, 1270, 980, 560),
    (3150, 300, 2850, 1280, 990, 580),
    (3210, 300, 2910, 1310, 1020, 580),
    (3270, 300, 2970, 1340, 1040, 590),
    (3330, 300, 3030, 1360, 1060, 610),
    (3390, 330, 3060, 1370, 1070, 620),
    (3450, 330, 3120, 1400, 1090, 630),
    (3510, 330, 3180, 1430, 1120, 630),
    (3570, 330, 3240, 1460, 1140, 640),
    (3630, 360, 3270, 1470, 1150, 650),
    (3690, 360, 3330, 1500, 1170, 660),
    (3750, 360, 3390, 1520, 1190, 680),
    (3810, 360, 3450, 1550, 1200, 700),
    (3870, 400, 3470, 1560, 1210, 700),
    (3930, 400, 3530, 1590, 1230, 710),
    (3990, 400, 3590, 1620, 1250, 720),
    (4050, 420, 3630, 1630, 1270, 730),
    (4110, 420, 3690, 1660, 1290, 740),
    (4170, 420, 3750, 1680, 1320, 750),
    (4230, 420, 3810, 1710, 1340, 760);

-- Inserir LeaguePrizeTable e LeaguePrizeTableEntry para cada linha
DECLARE @Pote DECIMAL(18,2), @Caixinha DECIMAL(18,2), @Premio DECIMAL(18,2);
DECLARE @Primeiro DECIMAL(18,2), @Segundo DECIMAL(18,2), @Terceiro DECIMAL(18,2);
DECLARE @PrizeTableId UNIQUEIDENTIFIER;

DECLARE prize_cursor CURSOR FOR
SELECT Pote, Caixinha, Premio, Primeiro, Segundo, Terceiro FROM @PrizeData;

OPEN prize_cursor;
FETCH NEXT FROM prize_cursor INTO @Pote, @Caixinha, @Premio, @Primeiro, @Segundo, @Terceiro;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Verificar se ja existe
    IF NOT EXISTS (SELECT 1 FROM LeaguePrizeTables WHERE LeagueId = @LeagueId AND PrizePoolTotal = @Pote)
    BEGIN
        SET @PrizeTableId = NEWID();

        -- Inserir LeaguePrizeTable
        INSERT INTO LeaguePrizeTables (Id, LeagueId, Name, PrizePoolTotal, JackpotAmount, CreatedAt)
        VALUES (
            @PrizeTableId,
            @LeagueId,
            N'Pote R$ ' + CAST(CAST(@Pote AS INT) AS NVARCHAR(10)),
            @Pote,
            @Caixinha,
            GETUTCDATE()
        );

        -- Inserir Entries (1o, 2o, 3o)
        INSERT INTO LeaguePrizeTableEntries (Id, LeaguePrizeTableId, Position, PrizeAmount)
        VALUES
            (NEWID(), @PrizeTableId, 1, @Primeiro),
            (NEWID(), @PrizeTableId, 2, @Segundo),
            (NEWID(), @PrizeTableId, 3, @Terceiro);
    END

    FETCH NEXT FROM prize_cursor INTO @Pote, @Caixinha, @Premio, @Primeiro, @Segundo, @Terceiro;
END

CLOSE prize_cursor;
DEALLOCATE prize_cursor;

PRINT 'Tabelas de premios criadas com sucesso';
