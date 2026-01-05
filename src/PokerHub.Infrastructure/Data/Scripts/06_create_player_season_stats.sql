-- Script de Carga Historica - Liga Pokerzao
-- Parte 6: Criar PlayerSeasonStats (Dados Historicos Legados)
-- Este script contem TODOS os dados das temporadas 2018-2025

DECLARE @LeagueId UNIQUEIDENTIFIER;
SELECT @LeagueId = Id FROM Leagues WHERE Name = N'Pokerzão';

IF @LeagueId IS NULL
BEGIN
    RAISERROR('Liga Pokerzão não encontrada. Execute o script 01 primeiro.', 16, 1);
    RETURN;
END

-- Limpar dados anteriores (caso script tenha sido executado parcialmente)
DELETE pss
FROM PlayerSeasonStats pss
INNER JOIN Seasons s ON pss.SeasonId = s.Id
WHERE s.LeagueId = @LeagueId;

PRINT 'Dados anteriores limpos: ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' registros removidos';

-- Funcao auxiliar para obter PlayerId
-- (usaremos uma tabela temporaria para mapear nomes -> IDs)
DECLARE @PlayerMap TABLE (Name NVARCHAR(200), PlayerId UNIQUEIDENTIFIER);
INSERT INTO @PlayerMap (Name, PlayerId)
SELECT Name, Id FROM Players WHERE LeagueId = @LeagueId;

-- Funcao auxiliar para obter SeasonId
DECLARE @SeasonMap TABLE (Year INT, SeasonId UNIQUEIDENTIFIER);
INSERT INTO @SeasonMap (Year, SeasonId)
SELECT
    CAST(RIGHT(Name, 4) AS INT) AS Year,
    Id
FROM Seasons WHERE LeagueId = @LeagueId;

-- Tabela temporaria com TODOS os dados das temporadas
-- Formato: Ano, Posicao, Jogador, Jogos, 1o, 2o, 3o, Custo, Premio, Saldo
DECLARE @SeasonData TABLE (
    Year INT,
    FinalPosition INT,
    PlayerName NVARCHAR(200),
    GamesPlayed INT,
    FirstPlaces INT,
    SecondPlaces INT,
    ThirdPlaces INT,
    TotalCost DECIMAL(18,2),
    TotalPrize DECIMAL(18,2),
    Balance DECIMAL(18,2)
);

-- =====================================================
-- TEMPORADA 2018 (21 jogadores)
-- =====================================================
INSERT INTO @SeasonData VALUES
    (2018, 1, N'Toledo', 47, 6, 9, 1, 490, 680, 190),
    (2018, 2, N'Douglas Jesus', 38, 9, 5, 0, 410, 590, 180),
    (2018, 3, N'Wess', 25, 7, 2, 0, 280, 440, 160),
    (2018, 4, N'Tilas', 30, 2, 9, 2, 320, 440, 120),
    (2018, 5, N'Edu', 47, 7, 6, 1, 510, 600, 90),
    (2018, 6, N'Iago', 16, 3, 2, 1, 160, 210, 50),
    (2018, 7, N'Gui Marzocchi', 1, 0, 0, 0, 10, 0, -10),
    (2018, 8, N'Renan', 1, 0, 0, 0, 10, 0, -10),
    (2018, 9, N'Junior', 1, 0, 0, 0, 10, 0, -10),
    (2018, 10, N'Rubercy', 1, 0, 0, 0, 20, 0, -20),
    (2018, 11, N'Furlis', 25, 2, 5, 0, 260, 230, -30),
    (2018, 12, N'Edinaldo', 15, 1, 2, 0, 150, 120, -30),
    (2018, 13, N'Corvo', 4, 0, 0, 0, 40, 0, -40),
    (2018, 14, N'Bomber', 2, 0, 0, 0, 50, 0, -50),
    (2018, 15, N'Jads', 21, 1, 4, 0, 210, 150, -60),
    (2018, 16, N'Feltrin', 4, 0, 0, 0, 60, 0, -60),
    (2018, 17, N'Vinão', 20, 2, 2, 0, 240, 170, -70),
    (2018, 18, N'Canaveze', 4, 0, 0, 0, 70, 0, -70),
    (2018, 19, N'Dorfera', 18, 2, 0, 0, 190, 90, -100),
    (2018, 20, N'Idozo', 51, 7, 3, 1, 540, 430, -110),
    (2018, 21, N'Jean', 30, 2, 2, 2, 310, 190, -120);

-- =====================================================
-- TEMPORADA 2019 (27 jogadores)
-- =====================================================
INSERT INTO @SeasonData VALUES
    (2019, 1, N'Toledo', 42, 6, 11, 10, 770, 1050, 280),
    (2019, 2, N'Thiago', 24, 4, 5, 8, 560, 810, 250),
    (2019, 3, N'Vinão', 17, 5, 1, 0, 260, 510, 250),
    (2019, 4, N'Wess', 29, 8, 1, 2, 550, 630, 80),
    (2019, 5, N'Yago', 1, 1, 0, 0, 20, 80, 60),
    (2019, 6, N'Gustavão', 8, 0, 2, 2, 190, 240, 50),
    (2019, 7, N'Macoy', 4, 0, 3, 0, 110, 160, 50),
    (2019, 8, N'Marco Aurelio', 2, 1, 0, 0, 20, 70, 50),
    (2019, 9, N'Furlis', 9, 2, 1, 0, 160, 200, 40),
    (2019, 10, N'Jads', 14, 3, 0, 0, 220, 240, 20),
    (2019, 11, N'Tilas', 14, 2, 2, 1, 200, 210, 10),
    (2019, 12, N'João', 4, 0, 1, 0, 60, 50, -10),
    (2019, 13, N'Luan', 1, 0, 0, 0, 10, 0, -10),
    (2019, 14, N'Rafaela', 1, 0, 0, 0, 10, 0, -10),
    (2019, 15, N'Saci', 1, 0, 0, 0, 10, 0, -10),
    (2019, 16, N'Dorfera', 5, 0, 1, 0, 90, 70, -20),
    (2019, 17, N'Canaveze', 1, 0, 0, 0, 20, 0, -20),
    (2019, 18, N'Henrique', 1, 0, 0, 0, 20, 0, -20),
    (2019, 19, N'Edu', 42, 5, 7, 4, 730, 700, -30),
    (2019, 20, N'Carlão', 2, 0, 0, 0, 40, 0, -40),
    (2019, 21, N'Edinaldo', 2, 0, 0, 0, 50, 0, -50),
    (2019, 22, N'Bomber', 9, 0, 0, 1, 130, 30, -100),
    (2019, 23, N'Idozo', 36, 1, 2, 3, 360, 250, -110),
    (2019, 24, N'Feltrin', 25, 4, 1, 3, 560, 360, -200),
    (2019, 25, N'Douglas Jesus', 28, 0, 4, 5, 500, 290, -210),
    (2019, 26, N'Schott', 14, 0, 0, 1, 330, 60, -270);

-- =====================================================
-- TEMPORADA 2020 (17 jogadores)
-- =====================================================
INSERT INTO @SeasonData VALUES
    (2020, 1, N'Wess', 11, 5, 2, 2, 240, 730, 490),
    (2020, 2, N'Toledo', 13, 3, 5, 0, 280, 530, 250),
    (2020, 3, N'Edu', 13, 3, 1, 2, 290, 370, 80),
    (2020, 4, N'Dorfera', 1, 0, 0, 0, 20, 0, -20),
    (2020, 5, N'Sabiá', 1, 0, 0, 0, 20, 0, -20),
    (2020, 6, N'Clone', 1, 0, 0, 0, 20, 0, -20),
    (2020, 7, N'Macoy', 1, 0, 0, 0, 20, 0, -20),
    (2020, 8, N'André', 1, 0, 0, 0, 20, 0, -20),
    (2020, 9, N'Gustavão', 13, 1, 4, 3, 470, 440, -30),
    (2020, 10, N'Schott', 8, 0, 0, 4, 190, 160, -30),
    (2020, 11, N'Douglas Jesus', 3, 0, 0, 0, 50, 0, -50),
    (2020, 12, N'Jads', 2, 0, 0, 0, 70, 0, -70),
    (2020, 13, N'Idozo', 10, 0, 0, 2, 150, 70, -80),
    (2020, 14, N'Feltrin', 4, 0, 0, 0, 90, 0, -90),
    (2020, 15, N'Thiago', 12, 1, 1, 0, 230, 130, -100),
    (2020, 16, N'Edinaldo', 4, 0, 0, 0, 100, 0, -100),
    (2020, 17, N'Vinão', 6, 0, 0, 0, 170, 0, -170);

-- =====================================================
-- TEMPORADA 2021 (19 jogadores)
-- =====================================================
INSERT INTO @SeasonData VALUES
    (2021, 1, N'Toledo', 15, 5, 1, 1, 520, 960, 440),
    (2021, 2, N'Gustavão', 16, 2, 4, 3, 600, 730, 130),
    (2021, 3, N'Wess', 12, 1, 5, 3, 800, 900, 100),
    (2021, 4, N'Vinão', 6, 2, 1, 0, 130, 220, 90),
    (2021, 5, N'Macoy', 3, 2, 0, 0, 90, 170, 80),
    (2021, 6, N'Edu', 16, 2, 3, 3, 580, 610, 30),
    (2021, 7, N'Bomber', 6, 0, 0, 1, 190, 190, 0),
    (2021, 8, N'Dorfera', 1, 0, 0, 0, 10, 0, -10),
    (2021, 9, N'Gui Marzocchi', 1, 0, 0, 0, 10, 0, -10),
    (2021, 10, N'Rodrigo', 1, 0, 0, 0, 10, 0, -10),
    (2021, 11, N'André', 1, 0, 0, 0, 20, 0, -20),
    (2021, 12, N'Nicolas', 1, 0, 0, 0, 30, 0, -30),
    (2021, 13, N'Schott', 2, 0, 0, 0, 40, 0, -40),
    (2021, 14, N'Nathan', 1, 0, 0, 0, 40, 0, -40),
    (2021, 15, N'João', 2, 0, 0, 0, 150, 30, -120),
    (2021, 16, N'Jads', 10, 0, 2, 3, 410, 280, -130),
    (2021, 17, N'Feltrin', 4, 0, 0, 0, 130, 0, -130),
    (2021, 18, N'Douglas Jesus', 2, 0, 0, 0, 140, 0, -140),
    (2021, 19, N'Thiago', 12, 2, 0, 2, 500, 310, -190);

-- =====================================================
-- TEMPORADA 2022 (10 jogadores)
-- =====================================================
INSERT INTO @SeasonData VALUES
    (2022, 1, N'Edu', 11, 3, 4, 1, 690, 1930, 1240),
    (2022, 2, N'Toledo', 12, 2, 1, 2, 870, 1240, 370),
    (2022, 3, N'Schott', 2, 0, 1, 0, 500, 730, 230),
    (2022, 4, N'Gustavão', 12, 2, 1, 4, 1150, 1050, -100),
    (2022, 5, N'Bomber', 11, 1, 1, 0, 310, 200, -110),
    (2022, 6, N'Murilo Jesus', 1, 0, 0, 0, 150, 0, -150),
    (2022, 7, N'Jads', 6, 0, 1, 0, 340, 160, -180),
    (2022, 8, N'Wess', 12, 2, 3, 3, 1330, 960, -370),
    (2022, 9, N'Daniel', 1, 0, 0, 0, 400, 0, -400),
    (2022, 10, N'Thiago', 11, 2, 0, 2, 850, 320, -530);

-- =====================================================
-- TEMPORADA 2023 (15 jogadores - separado Thiago e Guilherme)
-- =====================================================
INSERT INTO @SeasonData VALUES
    (2023, 1, N'Toledo', 12, 3, 4, 0, 605, 1300, 695),
    (2023, 2, N'Wess', 12, 5, 1, 1, 830, 1140, 310),
    (2023, 3, N'Murilo Jesus', 3, 0, 1, 1, 200, 340, 140),
    (2023, 4, N'Thiago', 10, 2, 1, 4, 725, 860, 135),
    (2023, 5, N'Edu', 12, 1, 2, 1, 595, 560, -35),
    (2023, 6, N'Feltrin', 1, 0, 0, 0, 40, 0, -40),
    (2023, 7, N'Saci', 1, 0, 0, 0, 60, 0, -60),
    (2023, 8, N'Douglas Jesus', 1, 0, 0, 0, 80, 0, -80),
    (2023, 9, N'Horta', 1, 0, 0, 0, 90, 0, -90),
    (2023, 10, N'Guilherme', 1, 0, 0, 0, 120, 0, -120),
    (2023, 11, N'Gustavão', 12, 1, 3, 3, 1040, 910, -130),
    (2023, 12, N'Bomber', 3, 0, 0, 0, 150, 0, -150),
    (2023, 13, N'Daniel', 2, 0, 0, 0, 180, 0, -180),
    (2023, 14, N'Jads', 8, 0, 0, 2, 415, 220, -195),
    (2023, 15, N'Vinão', 3, 0, 0, 0, 200, 0, -200);

-- =====================================================
-- TEMPORADA 2024 (17 jogadores - separado Thiago e Guilherme)
-- =====================================================
INSERT INTO @SeasonData VALUES
    (2024, 1, N'Toledo', 34, 12, 4, 4, 2970, 4125, 1155),
    (2024, 2, N'Edu', 33, 4, 10, 3, 2880, 3630, 750),
    (2024, 3, N'Gu Miante', 3, 2, 0, 0, 210, 500, 290),
    (2024, 4, N'Idozo', 1, 0, 1, 0, 60, 300, 240),
    (2024, 5, N'Douglas Jesus', 1, 1, 0, 0, 90, 280, 190),
    (2024, 6, N'Antonio', 11, 0, 3, 2, 900, 900, 0),
    (2024, 7, N'Thiago', 32, 6, 7, 7, 4020, 3980, -40),
    (2024, 8, N'Bomber', 1, 0, 0, 0, 60, 0, -60),
    (2024, 9, N'Edinaldo', 1, 0, 0, 0, 60, 0, -60),
    (2024, 10, N'Breno', 1, 0, 0, 0, 60, 0, -60),
    (2024, 11, N'Harry', 1, 0, 0, 0, 60, 0, -60),
    (2024, 12, N'Gustavão', 4, 0, 0, 1, 360, 250, -110),
    (2024, 13, N'Schott', 6, 0, 0, 2, 630, 460, -170),
    (2024, 14, N'Horta', 14, 2, 1, 1, 1320, 1045, -275),
    (2024, 15, N'Wess', 29, 3, 0, 6, 2160, 1800, -360),
    (2024, 16, N'Diegão', 29, 2, 7, 4, 2880, 2400, -480),
    (2024, 17, N'Guilherme', 27, 2, 1, 4, 2580, 1410, -1170);

-- =====================================================
-- TEMPORADA 2025 (18 jogadores)
-- =====================================================
INSERT INTO @SeasonData VALUES
    (2025, 1, N'Toledo', 47, 10, 9, 7, 5700, 9850, 4150),
    (2025, 2, N'Edu', 46, 6, 9, 5, 6450, 6800, 350),
    (2025, 3, N'Gustavão', 2, 0, 0, 1, 120, 190, 70),
    (2025, 4, N'Diegão', 47, 8, 9, 4, 6780, 6820, 40),
    (2025, 5, N'Wess', 4, 1, 0, 0, 390, 400, 10),
    (2025, 6, N'Barroso', 4, 0, 1, 0, 570, 550, -20),
    (2025, 7, N'Leo', 1, 0, 0, 0, 60, 0, -60),
    (2025, 8, N'Luiz', 2, 0, 0, 0, 120, 0, -120),
    (2025, 9, N'Bomber', 1, 0, 0, 0, 120, 0, -120),
    (2025, 10, N'Antonio', 40, 6, 6, 6, 5940, 5790, -150),
    (2025, 11, N'Ronaldo', 1, 0, 0, 0, 150, 0, -150),
    (2025, 12, N'Mello', 3, 1, 0, 0, 840, 610, -230),
    (2025, 13, N'Mateus', 4, 0, 1, 0, 600, 370, -230),
    (2025, 14, N'Schott', 16, 3, 0, 4, 2430, 2010, -420),
    (2025, 15, N'Guilherme', 46, 5, 8, 9, 8340, 7700, -640),
    (2025, 16, N'Rapha', 5, 0, 0, 0, 720, 0, -720),
    (2025, 17, N'Horta', 8, 1, 0, 1, 1500, 670, -830),
    (2025, 18, N'Thiago', 43, 7, 5, 11, 8700, 7585, -1115);

-- =====================================================
-- INSERIR PlayerSeasonStats
-- =====================================================

INSERT INTO PlayerSeasonStats (Id, SeasonId, PlayerId, GamesPlayed, FirstPlaces, SecondPlaces, ThirdPlaces, TotalCost, TotalPrize, Balance, FinalPosition, CreatedAt)
SELECT
    NEWID(),
    sm.SeasonId,
    pm.PlayerId,
    sd.GamesPlayed,
    sd.FirstPlaces,
    sd.SecondPlaces,
    sd.ThirdPlaces,
    sd.TotalCost,
    sd.TotalPrize,
    sd.Balance,
    sd.FinalPosition,
    GETUTCDATE()
FROM @SeasonData sd
INNER JOIN @SeasonMap sm ON sm.Year = sd.Year
INNER JOIN @PlayerMap pm ON pm.Name = sd.PlayerName
WHERE NOT EXISTS (
    SELECT 1 FROM PlayerSeasonStats pss
    WHERE pss.SeasonId = sm.SeasonId AND pss.PlayerId = pm.PlayerId
);

PRINT 'PlayerSeasonStats inseridos: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
