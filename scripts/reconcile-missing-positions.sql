-- Reconciliation: tournaments finished in an inconsistent state where a player
-- has Prize > 0 but Position IS NULL and was not eliminated (EliminatedAt IS NULL).
-- This was caused by a bug in the Finalizar flow (see safety-net in
-- FinishTournamentWithCustomPrizesAsync). The safety-net prevents new occurrences.
-- This script lets you inspect and fix legacy rows.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — Inspect affected rows (READ-ONLY). Review each case manually before
-- running the UPDATE in STEP 2.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    t.Id                AS TournamentId,
    t.Name              AS TournamentName,
    t.ScheduledDateTime,
    t.Status,
    tp.PlayerId,
    p.Name              AS PlayerName,
    tp.Prize,
    tp.Position         AS CurrentPosition,
    tp.EliminatedAt,
    -- Suggested fix: lowest unused Position within this tournament.
    (SELECT MIN(n.Pos)
       FROM (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),
                    (11),(12),(13),(14),(15),(16),(17),(18),(19),(20)) AS n(Pos)
       WHERE NOT EXISTS (
           SELECT 1 FROM TournamentPlayers tp2
           WHERE tp2.TournamentId = tp.TournamentId
             AND tp2.Position = n.Pos)
    )                   AS SuggestedPosition
FROM TournamentPlayers tp
JOIN Tournaments t ON t.Id = tp.TournamentId
JOIN Players p     ON p.Id = tp.PlayerId
WHERE tp.Prize > 0
  AND tp.Position IS NULL
  AND tp.EliminatedAt IS NULL
  AND t.Status = 3 -- Finished
ORDER BY t.ScheduledDateTime DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — Apply the fix. DO NOT run this before reviewing the SELECT above.
-- This assigns the lowest unused Position within each affected tournament.
-- Run inside a transaction so you can ROLLBACK if anything looks wrong.
-- ─────────────────────────────────────────────────────────────────────────────
-- BEGIN TRANSACTION;
--
-- UPDATE tp
--    SET tp.Position = (
--        SELECT MIN(n.Pos)
--          FROM (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),
--                       (11),(12),(13),(14),(15),(16),(17),(18),(19),(20)) AS n(Pos)
--          WHERE NOT EXISTS (
--              SELECT 1 FROM TournamentPlayers tp2
--              WHERE tp2.TournamentId = tp.TournamentId
--                AND tp2.Position = n.Pos)
--    )
--   FROM TournamentPlayers tp
--   JOIN Tournaments t ON t.Id = tp.TournamentId
--  WHERE tp.Prize > 0
--    AND tp.Position IS NULL
--    AND tp.EliminatedAt IS NULL
--    AND t.Status = 3;
--
-- -- Verify result before committing:
-- -- Re-run STEP 1; it should return zero rows.
--
-- COMMIT TRANSACTION;
-- -- or ROLLBACK TRANSACTION;
