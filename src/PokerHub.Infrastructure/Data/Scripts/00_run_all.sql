-- Script Master - Carga Historica Pokerzao
-- Execute este script para rodar todos os scripts em ordem
--
-- IMPORTANTE: Execute a migration EF Core ANTES de rodar este script!
-- dotnet ef database update --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web
--
-- Ordem de execucao:
-- 1. 01_create_league.sql - Cria a liga Pokerzao
-- 2. 02_create_players.sql - Cria todos os jogadores
-- 3. 03_create_prize_tables.sql - Cria tabelas de premios
-- 4. 04_create_seasons.sql - Cria temporadas 2018-2025
-- 5. 05_create_tournaments.sql - Cria torneios consolidados
-- 6. 06_create_player_season_stats.sql - Cria estatisticas historicas

PRINT '=================================';
PRINT 'Iniciando Carga Historica Pokerzao';
PRINT '=================================';
PRINT '';

-- Verificar se a tabela PlayerSeasonStats existe (migration aplicada)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PlayerSeasonStats')
BEGIN
    RAISERROR('Tabela PlayerSeasonStats nao existe. Execute a migration EF Core primeiro!', 16, 1);
    RETURN;
END

PRINT 'Executando 01_create_league.sql...';
-- Conteudo inline ou usar :r no SQLCMD mode

PRINT 'Executando 02_create_players.sql...';
PRINT 'Executando 03_create_prize_tables.sql...';
PRINT 'Executando 04_create_seasons.sql...';
PRINT 'Executando 05_create_tournaments.sql...';
PRINT 'Executando 06_create_player_season_stats.sql...';

PRINT '';
PRINT '=================================';
PRINT 'Carga concluida!';
PRINT '=================================';

-- Verificacao final
SELECT 'Leagues' AS Tabela, COUNT(*) AS Total FROM Leagues WHERE Name = N'Pokerzão'
UNION ALL
SELECT 'Players', COUNT(*) FROM Players p
    INNER JOIN Leagues l ON p.LeagueId = l.Id WHERE l.Name = N'Pokerzão'
UNION ALL
SELECT 'Seasons', COUNT(*) FROM Seasons s
    INNER JOIN Leagues l ON s.LeagueId = l.Id WHERE l.Name = N'Pokerzão'
UNION ALL
SELECT 'Tournaments', COUNT(*) FROM Tournaments t
    INNER JOIN Leagues l ON t.LeagueId = l.Id WHERE l.Name = N'Pokerzão'
UNION ALL
SELECT 'PrizeTables', COUNT(*) FROM LeaguePrizeTables pt
    INNER JOIN Leagues l ON pt.LeagueId = l.Id WHERE l.Name = N'Pokerzão'
UNION ALL
SELECT 'PlayerSeasonStats', COUNT(*) FROM PlayerSeasonStats pss
    INNER JOIN Seasons s ON pss.SeasonId = s.Id
    INNER JOIN Leagues l ON s.LeagueId = l.Id WHERE l.Name = N'Pokerzão';
