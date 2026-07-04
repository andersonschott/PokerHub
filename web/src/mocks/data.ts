// Mock da Fase 1+ — substituir por hooks TanStack Query conforme os endpoints nascem (ver roadmap).

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface MockLeague {
  id: string;
  name: string;
  suit: string;
  season: string;
  members: number;
  tournaments: number;
  role: 'organizer' | 'player';
  organizer: string;
  invite: string;
  live: boolean;
  liveName?: string;
  next?: string;
}

export interface MockTournament {
  name: string;
  buyIn: number;
  level: number;
  levelLabel: string;
  sb: number;
  bb: number;
  ante: number;
  nextSb: number;
  nextBb: number;
  nextAnte: number;
  secondsRemaining: number;
  levelSeconds: number;
  players: number;
  remaining: number;
  rebuys: number;
  addons: number;
  prizePool: number;
}

export interface MockPrize {
  position: number;
  amount: number;
  pct: number;
}

export type MockTablePlayerStatus = 'in' | 'out';

export interface MockTablePlayer {
  id: string;
  name: string;
  nick: string;
  status: MockTablePlayerStatus;
  rebuys: number;
  addons: number;
  place?: number;
}

export interface MockSeason {
  name: string;
  played: number;
  total: number;
  range: string;
  leader: string;
}

export interface MockRecentTournament {
  name: string;
  date: string;
  pos: number;
  total: number;
  invest: number;
  prize: number;
  profit: number;
}

export interface MockRankingEntry {
  position: number;
  name: string;
  nick: string;
  sub: string;
  profit: number;
  tournaments: number;
  wins: number;
  second: number;
  third: number;
  itm: number;
  roi: number;
  winRate: number;
  avgPos: number;
  buyIns: number;
  prizes: number;
  /** Only present in current-season ranking (not rankingGeral). */
  part?: number;
  best?: number;
  worst?: number;
  recent?: MockRecentTournament[];
}

export interface MockPastTournament {
  id: string;
  name: string;
  buyIn: number;
  stack: number;
  rebuy: boolean;
  rebuyVal: number;
  rebuyLvl: number;
  addon: boolean;
  addonVal: number;
  blinds: 'turbo' | 'regular' | 'deep';
  prize: number[];
}

export interface MockPodiumEntry {
  pos: number;
  name: string;
  prize: number;
}

export interface MockHistoricoItem {
  id: string;
  name: string;
  date: string;
  players: number;
  buyIn: number;
  rebuys: number;
  addons: number;
  prizePool: number;
  caixinha: number;
  podium: MockPodiumEntry[];
}

export type MockTransferStatus = 'pending' | 'paid' | 'confirmed';

export interface MockPagamentoSaldoEntry {
  id: string;
  name: string;
  inv: number;
  prize: number;
}

export interface MockTransfer {
  id: string;
  from: string;
  to: string;
  amount: number;
  type: string;
  pix: string;
  status: MockTransferStatus;
}

export interface MockPagamentos {
  tournament: string;
  caixinha: number;
  prizePool: number;
  saldo: MockPagamentoSaldoEntry[];
  transfers: MockTransfer[];
}

export interface MockUpcoming {
  name: string;
  when: string;
  buyIn: number;
  confirmed: number;
  status: 'live' | 'scheduled';
}

export interface MockCaixinhaEntry {
  tournament: string;
  date: string;
  prizePool: number;
  pct: number;
  amount: number;
}

export type MockCaixinhaUsageType = 'expense' | 'tournament';

export interface MockCaixinhaUsage {
  id: string;
  desc: string;
  date: string;
  amount: number;
  type: MockCaixinhaUsageType;
  balanceAfter: number;
}

export interface MockCaixinha {
  percent: number;
  balance: number;
  entries: MockCaixinhaEntry[];
  usages: MockCaixinhaUsage[];
}

export interface MockSettlementDebt {
  id: string;
  from: string;
  to: string;
  amount: number;
  pix?: string;
  type: string;
  status: MockTransferStatus;
}

export interface MockSettlement {
  netBalance: number;
  debts: MockSettlementDebt[];
  credits: MockSettlementDebt[];
}

export interface MockData {
  league: { id: string; name: string; season: string; members: number; live: boolean };
  leagues: MockLeague[];
  tournament: MockTournament;
  prizes: MockPrize[];
  table: MockTablePlayer[];
  season: MockSeason;
  seasons: string[];
  rankingGeral: MockRankingEntry[];
  pastTournaments: MockPastTournament[];
  history: MockHistoricoItem[];
  pagamentos: MockPagamentos;
  ranking: MockRankingEntry[];
  upcoming: MockUpcoming[];
  caixinha: MockCaixinha;
  settlement: MockSettlement;
}

// ---------------------------------------------------------------------------
// Dataset — Liga dos Amigos (conteúdo idêntico ao data.js do UI kit)
// ---------------------------------------------------------------------------

export const mockData: MockData = {
  league: { id: 'amigos', name: 'Liga dos Amigos', season: 'Temporada 3', members: 11, live: true },

  leagues: [
    { id: 'amigos',     name: 'Liga dos Amigos',    suit: '♠', season: 'Temporada 3', members: 11, tournaments: 14, role: 'organizer', organizer: 'Você',        invite: 'AMIGOS-2K6', live: true,  liveName: 'Torneio da Sexta' },
    { id: 'escritorio', name: 'Poker do Escritório', suit: '♣', season: 'Temporada 1', members: 8,  tournaments: 5,  role: 'organizer', organizer: 'Você',        invite: 'OFFICE-Q9',  live: false, next: 'Qui 3 · 19h' },
    { id: 'domingo',    name: 'Clube de Domingo',    suit: '♥', season: 'Temporada 2', members: 14, tournaments: 9,  role: 'player',    organizer: 'Marcos Vale', invite: 'DOM-H2',     live: false, next: 'Dom · 16h' },
    { id: 'varzea',     name: 'Várzea Poker Tour',   suit: '♦', season: 'Temporada 4', members: 22, tournaments: 18, role: 'player',    organizer: 'Téo Brandão', invite: 'VARZEA-E12', live: true,  liveName: 'Etapa 12 · Final' },
  ],

  tournament: {
    name: 'Torneio da Sexta',
    buyIn: 50,
    level: 4,
    levelLabel: 'Nível 4',
    sb: 100, bb: 200, ante: 25,
    nextSb: 150, nextBb: 300, nextAnte: 25,
    secondsRemaining: 763, // 12:43
    levelSeconds: 900,
    players: 9, remaining: 6, rebuys: 12, addons: 3,
    prizePool: 4800,
  },

  prizes: [
    { position: 1, amount: 2400, pct: 50 },
    { position: 2, amount: 1440, pct: 30 },
    { position: 3, amount: 960,  pct: 20 },
  ],

  // Live table players (dashboard) — stack/fichas are not tracked; rebuys & add-ons are.
  table: [
    { id: 'ana',   name: 'Ana Reis',      nick: 'a_reis', status: 'in',  rebuys: 1, addons: 1 },
    { id: 'caio',  name: 'Caio Souza',    nick: 'caio',   status: 'in',  rebuys: 0, addons: 0 },
    { id: 'bruno', name: 'Bruno Lima',    nick: 'brunin', status: 'in',  rebuys: 2, addons: 1 },
    { id: 'duda',  name: 'Duda Martins',  nick: 'duda',   status: 'in',  rebuys: 1, addons: 0 },
    { id: 'rafa',  name: 'Rafa Nunes',    nick: 'rafa',   status: 'in',  rebuys: 0, addons: 0 },
    { id: 'igor',  name: 'Igor Pádua',    nick: 'igor',   status: 'in',  rebuys: 1, addons: 1 },
    { id: 'lena',  name: 'Lena Costa',    nick: 'lena',   status: 'out', place: 7, rebuys: 1, addons: 0 },
    { id: 'theo',  name: 'Theo Alves',    nick: 'theo',   status: 'out', place: 8, rebuys: 0, addons: 0 },
    { id: 'nina',  name: 'Nina Rocha',    nick: 'nina',   status: 'out', place: 9, rebuys: 2, addons: 0 },
  ],

  // Season meta for the Ranking destination
  season: { name: 'Temporada 3', played: 9, total: 14, range: '01/04 – 30/06', leader: 'Ana Reis' },
  seasons: ['Temporada 3', 'Temporada 2', 'Temporada 1', 'Geral (acumulado)'],

  // Ranking geral — acumulado de todas as temporadas
  rankingGeral: [
    { position: 1, name: 'Ana Reis',     nick: 'a_reis', sub: '34 vitórias · 58% ITM', profit: 9449, tournaments: 42, part: 98, wins: 34, second: 12, third: 9,  itm: 58, roi: 60.0,  winRate: 81, avgPos: 2.1, buyIns: 15745, prizes: 25194 },
    { position: 2, name: 'Caio Souza',   nick: 'caio',   sub: '18 vitórias · 48% ITM', profit: 1012, tournaments: 26, part: 60, wins: 18, second: 6,  third: 8,  itm: 48, roi: 11.3,  winRate: 69, avgPos: 2.9, buyIns: 8980,  prizes: 9992 },
    { position: 3, name: 'Bruno Lima',   nick: 'brunin', sub: '15 vitórias · 40% ITM', profit: 865,  tournaments: 40, part: 94, wins: 15, second: 17, third: 8,  itm: 40, roi: 5.8,   winRate: 38, avgPos: 3.4, buyIns: 14945, prizes: 15810 },
    { position: 4, name: 'Duda Martins', nick: 'duda',   sub: '8 vitórias · 41% ITM',  profit: 290,  tournaments: 31, part: 72, wins: 8,  second: 5,  third: 6,  itm: 41, roi: 8.6,   winRate: 26, avgPos: 4.0, buyIns: 3380,  prizes: 3670 },
    { position: 5, name: 'Rafa Nunes',   nick: 'rafa',   sub: '5 vitórias · 38% ITM',  profit: 130,  tournaments: 18, part: 42, wins: 5,  second: 4,  third: 3,  itm: 38, roi: 25.0,  winRate: 28, avgPos: 4.4, buyIns: 520,   prizes: 650 },
    { position: 6, name: 'Igor Pádua',   nick: 'igor',   sub: '4 vitórias · 35% ITM',  profit: 110,  tournaments: 12, part: 28, wins: 4,  second: 2,  third: 1,  itm: 35, roi: 50.0,  winRate: 33, avgPos: 4.9, buyIns: 220,   prizes: 330 },
  ],

  // Past tournaments — source for "copiar configurações"
  pastTournaments: [
    { id: 'sexta',    name: 'Torneio da Sexta', buyIn: 50,  stack: 10000, rebuy: true,  rebuyVal: 50,  rebuyLvl: 4, addon: true,  addonVal: 50,  blinds: 'regular', prize: [50, 30, 20] },
    { id: 'especial', name: 'Especial de Maio', buyIn: 100, stack: 15000, rebuy: true,  rebuyVal: 100, rebuyLvl: 6, addon: true,  addonVal: 100, blinds: 'deep',    prize: [50, 30, 20] },
    { id: 'turbo',    name: 'Turbo de Quarta',  buyIn: 30,  stack: 8000,  rebuy: true,  rebuyVal: 30,  rebuyLvl: 3, addon: false, addonVal: 0,   blinds: 'turbo',   prize: [60, 40] },
  ],

  // Torneios realizados — histórico consultável
  history: [
    { id: 'h1', name: 'Torneio da Sexta', date: '24/06', players: 9,  buyIn: 50,  rebuys: 12, addons: 3, prizePool: 1440, caixinha: 100,
      podium: [{ pos: 1, name: 'Ana Reis', prize: 610 }, { pos: 2, name: 'Caio Souza', prize: 470 }, { pos: 3, name: 'Bruno Lima', prize: 260 }] },
    { id: 'h2', name: 'Especial de Maio', date: '17/06', players: 11, buyIn: 100, rebuys: 9,  addons: 5, prizePool: 2150, caixinha: 215,
      podium: [{ pos: 1, name: 'Caio Souza', prize: 970 }, { pos: 2, name: 'Ana Reis', prize: 580 }, { pos: 3, name: 'Rafa Nunes', prize: 385 }] },
    { id: 'h3', name: 'Turbo de Quarta',  date: '12/06', players: 8,  buyIn: 30,  rebuys: 7,  addons: 0, prizePool: 760,  caixinha: 76,
      podium: [{ pos: 1, name: 'Bruno Lima', prize: 340 }, { pos: 2, name: 'Duda Martins', prize: 205 }, { pos: 3, name: 'Ana Reis', prize: 139 }] },
    { id: 'h4', name: 'Clássico da Liga', date: '05/06', players: 10, buyIn: 50,  rebuys: 10, addons: 4, prizePool: 1200, caixinha: 120,
      podium: [{ pos: 1, name: 'Ana Reis', prize: 540 }, { pos: 2, name: 'Igor Pádua', prize: 324 }, { pos: 3, name: 'Caio Souza', prize: 216 }] },
    { id: 'h5', name: 'Torneio da Sexta', date: '31/05', players: 9,  buyIn: 50,  rebuys: 8,  addons: 2, prizePool: 1050, caixinha: 105,
      podium: [{ pos: 1, name: 'Caio Souza', prize: 473 }, { pos: 2, name: 'Ana Reis', prize: 284 }, { pos: 3, name: 'Duda Martins', prize: 189 }] },
    { id: 'h6', name: 'Mata-mata',        date: '24/05', players: 7,  buyIn: 50,  rebuys: 5,  addons: 0, prizePool: 690,  caixinha: 69,
      podium: [{ pos: 1, name: 'Ana Reis', prize: 310 }, { pos: 2, name: 'Bruno Lima', prize: 186 }, { pos: 3, name: 'Igor Pádua', prize: 124 }] },
  ],

  // Pagamentos do torneio encerrado — saldo por jogador + transferências
  pagamentos: {
    tournament: 'Torneio da Sexta', caixinha: 100, prizePool: 1440,
    saldo: [
      { id: 'ana',   name: 'Ana Reis',     inv: 60,  prize: 610 },
      { id: 'caio',  name: 'Caio Souza',   inv: 180, prize: 470 },
      { id: 'bruno', name: 'Bruno Lima',   inv: 180, prize: 260 },
      { id: 'duda',  name: 'Duda Martins', inv: 60,  prize: 0 },
      { id: 'rafa',  name: 'Rafa Nunes',   inv: 120, prize: 0 },
      { id: 'igor',  name: 'Igor Pádua',   inv: 240, prize: 0 },
      { id: 'lena',  name: 'Lena Costa',   inv: 240, prize: 0 },
      { id: 'theo',  name: 'Theo Alves',   inv: 360, prize: 0 },
    ],
    transfers: [
      { id: 't1', from: 'Theo Alves',   to: 'Ana Reis',   amount: 310, type: 'Poker',    pix: 'ana.reis@pix.com',  status: 'pending' },
      { id: 't2', from: 'Igor Pádua',   to: 'Ana Reis',   amount: 240, type: 'Poker',    pix: 'ana.reis@pix.com',  status: 'pending' },
      { id: 't3', from: 'Lena Costa',   to: 'Caio Souza', amount: 240, type: 'Poker',    pix: '11 98765-4321',     status: 'pending' },
      { id: 't4', from: 'Theo Alves',   to: 'Caio Souza', amount: 50,  type: 'Poker',    pix: '11 98765-4321',     status: 'pending' },
      { id: 't5', from: 'Rafa Nunes',   to: 'Bruno Lima', amount: 80,  type: 'Poker',    pix: 'brunolima@pix.com', status: 'pending' },
      { id: 't6', from: 'Rafa Nunes',   to: 'Caixinha',   amount: 40,  type: 'Caixinha', pix: 'Pote acumulado',    status: 'pending' },
      { id: 't7', from: 'Duda Martins', to: 'Caixinha',   amount: 60,  type: 'Caixinha', pix: 'Pote acumulado',    status: 'pending' },
    ],
  },

  ranking: [
    { position: 1, name: 'Ana Reis',     nick: 'a_reis', sub: '8 vitórias · 62% ITM', profit: 1840,
      tournaments: 9, wins: 8, second: 0, third: 1, itm: 62, roi: 112.3, winRate: 89, avgPos: 1.8,
      buyIns: 1640, prizes: 3480, best: 980, worst: -100,
      recent: [
        { name: 'Torneio da Sexta', date: '24/06', pos: 1, total: 9,  invest: 50,  prize: 980, profit: 930 },
        { name: 'Especial de Maio', date: '17/06', pos: 1, total: 11, invest: 100, prize: 760, profit: 660 },
        { name: 'Turbo de Quarta',  date: '12/06', pos: 3, total: 8,  invest: 30,  prize: 90,  profit: 60 },
        { name: 'Clássico da Liga', date: '05/06', pos: 1, total: 10, invest: 50,  prize: 540, profit: 490 },
        { name: 'Torneio da Sexta', date: '31/05', pos: 2, total: 9,  invest: 80,  prize: 180, profit: 100 },
        { name: 'Mata-mata',        date: '24/05', pos: 1, total: 7,  invest: 50,  prize: 320, profit: 270 },
      ] },
    { position: 2, name: 'Caio Souza',   nick: 'caio',   sub: '5 vitórias · 55% ITM', profit: 1120,
      tournaments: 9, wins: 5, second: 2, third: 1, itm: 55, roi: 71.8, winRate: 56, avgPos: 2.6,
      buyIns: 1560, prizes: 2680, best: 720, worst: -160,
      recent: [
        { name: 'Torneio da Sexta', date: '24/06', pos: 2, total: 9,  invest: 50,  prize: 260, profit: 210 },
        { name: 'Especial de Maio', date: '17/06', pos: 1, total: 11, invest: 100, prize: 720, profit: 620 },
        { name: 'Turbo de Quarta',  date: '12/06', pos: 5, total: 8,  invest: 60,  prize: 0,   profit: -60 },
        { name: 'Clássico da Liga', date: '05/06', pos: 3, total: 10, invest: 50,  prize: 180, profit: 130 },
        { name: 'Torneio da Sexta', date: '31/05', pos: 1, total: 9,  invest: 50,  prize: 440, profit: 390 },
        { name: 'Mata-mata',        date: '24/05', pos: 4, total: 7,  invest: 50,  prize: 0,   profit: -50 },
      ] },
    { position: 3, name: 'Bruno Lima',   nick: 'brunin', sub: '3 vitórias · 48% ITM', profit: 640,
      tournaments: 8, wins: 3, second: 3, third: 0, itm: 48, roi: 44.4, winRate: 38, avgPos: 3.1,
      buyIns: 1440, prizes: 2080, best: 520, worst: -200,
      recent: [
        { name: 'Torneio da Sexta', date: '24/06', pos: 4, total: 9,  invest: 100, prize: 0,   profit: -100 },
        { name: 'Especial de Maio', date: '17/06', pos: 2, total: 11, invest: 100, prize: 420, profit: 320 },
        { name: 'Turbo de Quarta',  date: '12/06', pos: 1, total: 8,  invest: 30,  prize: 240, profit: 210 },
        { name: 'Clássico da Liga', date: '05/06', pos: 2, total: 10, invest: 50,  prize: 320, profit: 270 },
        { name: 'Torneio da Sexta', date: '31/05', pos: 6, total: 9,  invest: 50,  prize: 0,   profit: -50 },
        { name: 'Mata-mata',        date: '24/05', pos: 2, total: 7,  invest: 50,  prize: 190, profit: 140 },
      ] },
    { position: 4, name: 'Duda Martins', nick: 'duda',   sub: '2 vitórias · 41% ITM', profit: 120,
      tournaments: 8, wins: 2, second: 1, third: 2, itm: 41, roi: 8.6, winRate: 25, avgPos: 4.0,
      buyIns: 1400, prizes: 1520, best: 380, worst: -150,
      recent: [
        { name: 'Torneio da Sexta', date: '24/06', pos: 3, total: 9,  invest: 50,  prize: 130, profit: 80 },
        { name: 'Especial de Maio', date: '17/06', pos: 7, total: 11, invest: 100, prize: 0,   profit: -100 },
        { name: 'Turbo de Quarta',  date: '12/06', pos: 2, total: 8,  invest: 30,  prize: 140, profit: 110 },
        { name: 'Clássico da Liga', date: '05/06', pos: 5, total: 10, invest: 50,  prize: 0,   profit: -50 },
        { name: 'Torneio da Sexta', date: '31/05', pos: 3, total: 9,  invest: 50,  prize: 130, profit: 80 },
        { name: 'Mata-mata',        date: '24/05', pos: 1, total: 7,  invest: 50,  prize: 320, profit: 270 },
      ] },
    { position: 5, name: 'Rafa Nunes',   nick: 'rafa',   sub: '1 vitória · 38% ITM',  profit: -260,
      tournaments: 8, wins: 1, second: 1, third: 1, itm: 38, roi: -18.6, winRate: 13, avgPos: 4.8,
      buyIns: 1400, prizes: 1140, best: 280, worst: -200,
      recent: [
        { name: 'Torneio da Sexta', date: '24/06', pos: 5, total: 9,  invest: 50,  prize: 0,   profit: -50 },
        { name: 'Especial de Maio', date: '17/06', pos: 3, total: 11, invest: 100, prize: 240, profit: 140 },
        { name: 'Turbo de Quarta',  date: '12/06', pos: 6, total: 8,  invest: 30,  prize: 0,   profit: -30 },
        { name: 'Clássico da Liga', date: '05/06', pos: 1, total: 10, invest: 50,  prize: 320, profit: 270 },
        { name: 'Torneio da Sexta', date: '31/05', pos: 8, total: 9,  invest: 50,  prize: 0,   profit: -50 },
        { name: 'Mata-mata',        date: '24/05', pos: 5, total: 7,  invest: 50,  prize: 0,   profit: -50 },
      ] },
    { position: 6, name: 'Igor Pádua',   nick: 'igor',   sub: '0 vitórias · 33% ITM', profit: -540,
      tournaments: 9, wins: 0, second: 1, third: 1, itm: 33, roi: -33.8, winRate: 0, avgPos: 5.6,
      buyIns: 1600, prizes: 1060, best: 220, worst: -250,
      recent: [
        { name: 'Torneio da Sexta', date: '24/06', pos: 6, total: 9,  invest: 80,  prize: 0,   profit: -80 },
        { name: 'Especial de Maio', date: '17/06', pos: 4, total: 11, invest: 100, prize: 0,   profit: -100 },
        { name: 'Turbo de Quarta',  date: '12/06', pos: 4, total: 8,  invest: 30,  prize: 0,   profit: -30 },
        { name: 'Clássico da Liga', date: '05/06', pos: 2, total: 10, invest: 50,  prize: 220, profit: 170 },
        { name: 'Torneio da Sexta', date: '31/05', pos: 7, total: 9,  invest: 50,  prize: 0,   profit: -50 },
        { name: 'Mata-mata',        date: '24/05', pos: 3, total: 7,  invest: 50,  prize: 110, profit: 60 },
      ] },
  ],

  upcoming: [
    { name: 'Torneio da Sexta',      when: 'Sexta · 20h00',  buyIn: 50,  confirmed: 7, status: 'live' },
    { name: 'Especial de Fim de Mês', when: 'Sáb 28 · 19h30', buyIn: 100, confirmed: 4, status: 'scheduled' },
    { name: 'Turbo de Quarta',        when: 'Qua 2 · 21h00',  buyIn: 30,  confirmed: 2, status: 'scheduled' },
  ],

  // Caixinha (jackpot) — % do prize pool acumulado + despesas da liga
  caixinha: {
    percent: 10,
    balance: 510,
    entries: [
      { tournament: 'Torneio da Sexta', date: '24/06', prizePool: 4800, pct: 10, amount: 480 },
      { tournament: 'Especial de Maio', date: '17/06', prizePool: 3100, pct: 10, amount: 310 },
      { tournament: 'Turbo de Quarta',  date: '12/06', prizePool: 2700, pct: 10, amount: 270 },
      { tournament: 'Clássico da Liga', date: '05/06', prizePool: 3500, pct: 10, amount: 350 },
    ],
    usages: [
      { id: 'u1', desc: 'Baralhos novos + fichas',      date: '10/06', amount: 180, type: 'expense',    balanceAfter: 930 },
      { id: 'u2', desc: 'Torneio Especial de São João', date: '21/06', amount: 600, type: 'tournament', balanceAfter: 330 },
      { id: 'u3', desc: 'Lanches da final',             date: '24/06', amount: 120, type: 'expense',    balanceAfter: 510 },
    ],
  },

  // Settlement (who pays whom)
  settlement: {
    netBalance: 230,
    debts: [
      { id: 'd1', from: 'Você', to: 'Ana Reis',         amount: 120, pix: 'ana.reis@pix.com', type: 'Poker',    status: 'pending' },
      { id: 'd2', from: 'Você', to: 'Caixinha da Liga', amount: 20,  pix: '11 99876-5432',    type: 'Caixinha', status: 'paid' },
    ],
    credits: [
      { id: 'c1', from: 'Igor Pádua', to: 'Você', amount: 250, type: 'Poker',   status: 'pending' },
      { id: 'c2', from: 'Rafa Nunes', to: 'Você', amount: 120, type: 'Lanches', status: 'confirmed' },
    ],
  },
};

// Individual named exports for convenient destructured imports
export const {
  league: mockLeague,
  leagues: mockLeagues,
  tournament: mockTournament,
  prizes: mockPrizes,
  table: mockTable,
  season: mockSeason,
  seasons: mockSeasons,
  rankingGeral: mockRankingGeral,
  pastTournaments: mockPastTournaments,
  history: mockHistory,
  pagamentos: mockPagamentos,
  ranking: mockRanking,
  upcoming: mockUpcoming,
  caixinha: mockCaixinha,
  settlement: mockSettlement,
} = mockData;
