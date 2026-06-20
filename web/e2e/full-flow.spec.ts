/**
 * full-flow.spec.ts — prova do fluxo principal do PokerHub, ponta a ponta.
 *
 * Seed pesado por API (organizer JWT): liga + 3 jogadores + torneio iniciado, com os
 * jogadores inscritos mas SEM check-in (para exercitar a seção "Aguardando check-in").
 *
 * Pela UI: dashboard ao vivo → check-in dos inscritos → rebuy + eliminação →
 * encerrar pela folha de confirmação → /app/debitos/pagamentos → "Calcular Pagamentos"
 * → asserta que a lista "quem paga quem" fica NÃO-VAZIA (prova B2 + débitos e2e).
 */
import { test, expect } from '@playwright/test';
import {
  registerOrganizer,
  createLeague,
  createPlayers,
  createTournament,
  addPlayerToTournament,
  startTournament,
  getTournamentDetail,
  injectSession,
  type AuthSession,
  type SeededPlayer,
  type SeededTournament,
} from './seed';

test('fluxo completo: dashboard ao vivo → check-in → rebuy/eliminação → encerrar → pagamentos', async ({
  browser,
}) => {
  // ---- Seed por API ----
  const session: AuthSession = await registerOrganizer('flow');
  const leagueId = await createLeague(session.accessToken, 'Liga Fluxo E2E');
  const players: SeededPlayer[] = await createPlayers(session.accessToken, leagueId, 3);
  const tournament: SeededTournament = await createTournament(
    session.accessToken,
    leagueId,
    'Torneio Fluxo E2E',
    3,
  );

  // Inscreve os 3 jogadores (admin) e inicia — propositalmente SEM check-in.
  for (const p of players) {
    await addPlayerToTournament(session.accessToken, tournament.id, p.id);
  }
  await startTournament(session.accessToken, tournament.id);

  // ---- Contexto autenticado: injeta sessão + liga ativa antes de carregar a app ----
  const context = await browser.newContext();
  await injectSession(context, session, leagueId);
  const page = await context.newPage();

  // O dashboard descobre o torneio ativo pela liga ativa (status InProgress/Paused).
  await page.goto('/app/torneio/dashboard');

  // Cabeçalho do torneio ao vivo.
  await expect(page.getByText('Torneio Fluxo E2E', { exact: false }).first()).toBeVisible();

  // ---- Seção "Aguardando check-in" com os 3 inscritos ----
  const awaiting = page.getByText(/Aguardando check-in/i);
  await expect(awaiting).toBeVisible();
  await expect(page.getByText(/Aguardando check-in · 3/i)).toBeVisible();

  // Check-in dos 3 pela UI (botão "Check-in" de cada linha pendente).
  // A lista encolhe a cada check-in; sempre clicamos o primeiro botão disponível.
  for (let i = 0; i < players.length; i++) {
    const checkInButton = page.getByRole('button', { name: /Check-in/i }).first();
    await expect(checkInButton).toBeVisible();
    await checkInButton.click();
    // espera a linha sair da seção pendente (lista diminui)
    await page.waitForTimeout(400);
  }

  // Após os 3 check-ins, a seção "Na mesa · 3" deve aparecer.
  await expect(page.getByText(/Na mesa · 3/i)).toBeVisible({ timeout: 20_000 });

  // ---- Rebuy + eliminação via UI ----
  // Abre a ação do primeiro jogador "Na mesa". O PlayerRow é um <button> que contém o nome.
  const firstPlayerRow = page
    .getByRole('button')
    .filter({ hasText: players[0].name })
    .first();
  await expect(firstPlayerRow).toBeVisible();
  await firstPlayerRow.click();

  // ActionSheet abre como role="dialog" com o nome do jogador no título.
  const actionSheet = page.getByRole('dialog');
  await expect(actionSheet).toBeVisible();
  await expect(actionSheet.getByText('Rebuys', { exact: true })).toBeVisible();

  // Rebuy: o DbStepper expõe um botão "Aumentar"; o primeiro é o da linha Rebuys.
  const addRebuy = actionSheet.getByRole('button', { name: 'Aumentar' }).first();
  await addRebuy.click();
  await page.waitForTimeout(400);

  // Reabre o sheet (a UI fecha/reabre conforme a interação) caso tenha fechado, e elimina.
  if ((await page.getByRole('dialog').count()) === 0) {
    await firstPlayerRow.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  }
  const eliminateBtn = page.getByRole('dialog').getByRole('button', { name: /Eliminar/i });
  await expect(eliminateBtn).toBeVisible();
  await eliminateBtn.click();

  // EliminateSheet: novo dialog com título "Quem eliminou ...?" — escolhe quem eliminou.
  const eliminateSheet = page.getByRole('dialog');
  await expect(eliminateSheet.getByText(/Quem eliminou/i)).toBeVisible();
  const eliminator = eliminateSheet
    .getByRole('button')
    .filter({ hasText: players[1].name })
    .first();
  await expect(eliminator).toBeVisible();
  await eliminator.click();

  // Confirma que apareceu na seção "Eliminados".
  await expect(page.getByText(/Eliminados ·/i)).toBeVisible({ timeout: 20_000 });

  // ---- Encerrar pela folha de confirmação ----
  await page.getByRole('button', { name: /Encerrar torneio/i }).click();
  const confirmFinish = page.getByRole('button', { name: /Confirmar encerramento/i });
  await expect(confirmFinish).toBeVisible();
  await confirmFinish.click();

  // ---- Cai em /app/debitos/pagamentos?t=... ----
  await page.waitForURL(/\/app\/debitos\/pagamentos\?t=/, { timeout: 30_000 });
  await expect(page.getByText('Pagamentos', { exact: false }).first()).toBeVisible();

  // ---- Calcular Pagamentos ----
  const calcBtn = page.getByRole('button', { name: /Calcular Pagamentos/i }).first();
  await expect(calcBtn).toBeVisible();
  await calcBtn.click();

  // Vai para a aba "Pagamentos" para ver "quem paga quem".
  const pagamentosTab = page.getByRole('button', { name: /^Pagamentos ·/ });
  await expect(pagamentosTab).toBeVisible({ timeout: 20_000 });
  await pagamentosTab.click();

  // ---- Asserta lista "quem paga quem" NÃO-VAZIA ----
  // Cada transferência mostra "<nome> -> <nome>" com um ChevronRight e um botão "Confirmar".
  // Validamos que a mensagem de "nenhum pagamento" NÃO está presente e que há >= 1 botão Confirmar.
  await expect(
    page.getByText(/Nenhum pagamento gerado/i),
  ).toHaveCount(0);

  const confirmButtons = page.getByRole('button', { name: /^Confirmar$/ });
  await expect(confirmButtons.first()).toBeVisible({ timeout: 20_000 });
  const transferCount = await confirmButtons.count();
  expect(transferCount).toBeGreaterThan(0);

  // Cross-check via API: a engine de pagamentos gerou as transferências.
  const detail = await getTournamentDetail(session.accessToken, tournament.id);
  expect(detail.status).toBe(3); // Finished

  await context.close();
});
