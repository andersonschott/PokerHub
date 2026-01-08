-- Script para gerar pagamentos pendentes para despesas extras existentes
-- PaymentType: 0 = Poker, 1 = Expense, 2 = Jackpot
-- PaymentStatus: 0 = Pending, 1 = Paid, 2 = Confirmed

-- ============================================
-- PASSO 1: VERIFICAR/ADICIONAR COLUNAS NOVAS
-- ============================================
-- Execute este bloco primeiro se as colunas Type e ExpenseId nao existirem

-- Adicionar coluna Type se nao existir
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Payments') AND name = 'Type')
BEGIN
    ALTER TABLE Payments ADD [Type] INT NOT NULL DEFAULT 0;
    PRINT 'Coluna Type adicionada a tabela Payments';
END
ELSE
BEGIN
    PRINT 'Coluna Type ja existe';
END
GO

-- Adicionar coluna ExpenseId se nao existir
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Payments') AND name = 'ExpenseId')
BEGIN
    ALTER TABLE Payments ADD ExpenseId UNIQUEIDENTIFIER NULL;
    PRINT 'Coluna ExpenseId adicionada a tabela Payments';

    -- Criar indice
    CREATE INDEX IX_Payments_ExpenseId ON Payments(ExpenseId);
    PRINT 'Indice IX_Payments_ExpenseId criado';

    -- Criar FK (opcional - descomente se quiser)
    -- ALTER TABLE Payments ADD CONSTRAINT FK_Payments_TournamentExpenses_ExpenseId
    --     FOREIGN KEY (ExpenseId) REFERENCES TournamentExpenses(Id);
END
ELSE
BEGIN
    PRINT 'Coluna ExpenseId ja existe';
END
GO

-- ============================================
-- PASSO 2: VISUALIZAR DESPESAS SEM PAGAMENTOS
-- ============================================
-- Mostra quais pagamentos serao criados

SELECT
    e.Id AS ExpenseId,
    e.TournamentId,
    t.Name AS TournamentName,
    e.Description,
    e.TotalAmount,
    e.PaidByPlayerId,
    payer.Name AS PaidByPlayerName,
    s.PlayerId AS DebtorPlayerId,
    debtor.Name AS DebtorPlayerName,
    CAST(ROUND(s.Amount, 0) AS INT) AS ShareAmount
FROM TournamentExpenses e
INNER JOIN Tournaments t ON t.Id = e.TournamentId
INNER JOIN TournamentExpenseShares s ON s.ExpenseId = e.Id
INNER JOIN Players payer ON payer.Id = e.PaidByPlayerId
INNER JOIN Players debtor ON debtor.Id = s.PlayerId
WHERE s.PlayerId != e.PaidByPlayerId  -- Exclui quem pagou (nao deve a si mesmo)
  AND ROUND(s.Amount, 0) > 0           -- Apenas valores positivos
  AND NOT EXISTS (                      -- Nao existe pagamento para esta despesa/jogador
      SELECT 1 FROM Payments p
      WHERE p.ExpenseId = e.Id
        AND p.FromPlayerId = s.PlayerId
  )
ORDER BY t.Name, e.Description;

-- Contagem de pagamentos a serem criados
SELECT COUNT(*) AS TotalPaymentsToCreate
FROM TournamentExpenses e
INNER JOIN TournamentExpenseShares s ON s.ExpenseId = e.Id
WHERE s.PlayerId != e.PaidByPlayerId
  AND ROUND(s.Amount, 0) > 0
  AND NOT EXISTS (
      SELECT 1 FROM Payments p
      WHERE p.ExpenseId = e.Id
        AND p.FromPlayerId = s.PlayerId
  );

-- ============================================
-- PASSO 3: INSERIR PAGAMENTOS DE DESPESAS
-- ============================================
-- Descomente o bloco abaixo para executar a insercao

/*
INSERT INTO Payments (
    Id,
    TournamentId,
    FromPlayerId,
    ToPlayerId,
    Amount,
    [Type],
    [Status],
    Description,
    ExpenseId,
    CreatedAt
)
SELECT
    NEWID(),                              -- Id (novo GUID)
    e.TournamentId,                       -- TournamentId
    s.PlayerId,                           -- FromPlayerId (quem deve)
    e.PaidByPlayerId,                     -- ToPlayerId (quem pagou a despesa)
    CAST(ROUND(s.Amount, 0) AS INT),      -- Amount (arredondado para inteiro)
    1,                                    -- Type = Expense
    0,                                    -- Status = Pending
    e.Description,                        -- Description (ex: "Pizza", "Cerveja")
    e.Id,                                 -- ExpenseId (referencia a despesa)
    GETUTCDATE()                          -- CreatedAt
FROM TournamentExpenses e
INNER JOIN TournamentExpenseShares s ON s.ExpenseId = e.Id
WHERE s.PlayerId != e.PaidByPlayerId      -- Exclui quem pagou
  AND ROUND(s.Amount, 0) > 0              -- Apenas valores positivos
  AND NOT EXISTS (                         -- Evita duplicatas
      SELECT 1 FROM Payments p
      WHERE p.ExpenseId = e.Id
        AND p.FromPlayerId = s.PlayerId
  );

PRINT 'Pagamentos de despesas criados com sucesso!';
*/

-- ============================================
-- PASSO 4: VERIFICACAO APOS INSERCAO
-- ============================================
-- Execute apos a insercao para verificar os pagamentos criados

/*
SELECT
    p.Id,
    t.Name AS TournamentName,
    fromPlayer.Name AS FromPlayerName,
    toPlayer.Name AS ToPlayerName,
    p.Amount,
    p.Description,
    CASE p.[Type]
        WHEN 0 THEN 'Poker'
        WHEN 1 THEN 'Expense'
        WHEN 2 THEN 'Jackpot'
    END AS PaymentType,
    CASE p.[Status]
        WHEN 0 THEN 'Pending'
        WHEN 1 THEN 'Paid'
        WHEN 2 THEN 'Confirmed'
    END AS PaymentStatus,
    p.CreatedAt
FROM Payments p
INNER JOIN Tournaments t ON t.Id = p.TournamentId
INNER JOIN Players fromPlayer ON fromPlayer.Id = p.FromPlayerId
LEFT JOIN Players toPlayer ON toPlayer.Id = p.ToPlayerId
WHERE p.[Type] = 1  -- Expense
ORDER BY p.CreatedAt DESC;

-- Resumo por torneio
SELECT
    t.Name AS TournamentName,
    COUNT(*) AS QtdPagamentos,
    SUM(p.Amount) AS TotalDespesas
FROM Payments p
INNER JOIN Tournaments t ON t.Id = p.TournamentId
WHERE p.[Type] = 1
GROUP BY t.Name
ORDER BY t.Name;
*/
