/**
 * /app/comparar — Comparativo entre 2 jogadores (Fase 6, F16b).
 *
 * Porta o comportamento de `Compare.razor`:
 *  - 2 slots fixos (Jogador 1 VS Jogador 2); cada slot busca jogadores da liga
 *    ativa por nome/nickname (input + dropdown filtrado, sem lib nova).
 *  - Estado deep-linkável na URL: ?p1={id}&p2={id} (selecionar faz replace).
 *  - usePlayerStats nos 2 ids; tabela/cards comparativos com destaque do
 *    vencedor por linha (lógica pura em features/rankings/compare-stats.ts).
 *  - Estados: loading, vazio (nada selecionado) e placeholder por slot vazio.
 *
 * Mobile: 2 cards empilhados com divisor "VS". Desktop lg:: colunas lado a lado
 * com os rótulos no centro.
 */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ChevronLeft,
  Loader2,
  Search,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { useActiveLeague } from '@/features/leagues/league-context';
import { useLeagueRanking, type PlayerRankingDto } from '@/lib/api/hooks/use-rankings';
import { usePlayerStats } from '@/lib/api/hooks/use-player-stats';
import { buildComparison, type CompareRow, type CompareWinner } from '@/features/rankings/compare-stats';

const matches = (p: PlayerRankingDto, q: string) => {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    p.playerName.toLowerCase().includes(needle) ||
    (p.nickname?.toLowerCase().includes(needle) ?? false)
  );
};

/* ───────────────────────── Seletor de jogador ───────────────────────── */

interface PlayerSelectProps {
  label: string;
  players: PlayerRankingDto[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function PlayerSelect({ label, players, selectedId, onSelect }: PlayerSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = players.find((p) => p.playerId === selectedId) ?? null;
  const filtered = useMemo(() => players.filter((p) => matches(p, q)).slice(0, 10), [players, q]);

  return (
    <div className="relative flex-1 min-w-0">
      <label className="block text-[11px] uppercase tracking-[0.07em] text-muted-foreground mb-[6px]">
        {label}
      </label>

      {selected ? (
        // Slot preenchido: chip com o jogador + botão limpar.
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQ('');
            setOpen(true);
          }}
          className="w-full h-[46px] px-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--input)] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] text-left cursor-pointer"
        >
          <Avatar name={selected.playerName} size={28} />
          <span className="flex-1 min-w-0 font-sans font-semibold text-[14px] truncate">
            {selected.nickname ?? selected.playerName}
          </span>
          <X className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground pointer-events-none" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar por nome ou apelido…"
            className="w-full h-[46px] pl-[34px] pr-[14px] rounded-[var(--radius-md)] border border-[var(--input)] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] text-foreground font-sans text-[15px] outline-none placeholder:text-[var(--ink-600)] focus:border-[var(--ring)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_20%,transparent)]"
          />
        </div>
      )}

      {/* Dropdown filtrado */}
      {open && !selected ? (
        <>
          {/* overlay para fechar ao clicar fora */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-[280px] overflow-y-auto rounded-[var(--radius-md)] border border-border bg-card shadow-lg">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-[13px] text-muted-foreground">
                Nenhum jogador encontrado.
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.playerId}
                  type="button"
                  onClick={() => {
                    onSelect(p.playerId);
                    setQ('');
                    setOpen(false);
                  }}
                  className="w-full px-3 py-[10px] flex items-center gap-[10px] text-left hover:bg-secondary cursor-pointer border-b border-border last:border-b-0"
                >
                  <Avatar name={p.playerName} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-semibold text-[14px] truncate">
                      {p.nickname ?? p.playerName}
                    </div>
                    {p.nickname ? (
                      <div className="text-[11.5px] text-muted-foreground truncate">
                        {p.playerName}
                      </div>
                    ) : null}
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                    #{p.position}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ───────────────────────── Setas / destaque ───────────────────────── */

function WinnerArrow({ winner, side }: { winner: CompareWinner; side: 'left' | 'right' }) {
  if (winner === 'tie' || winner === 'none') return null;
  if (winner === side)
    return <ArrowUp className="w-[14px] h-[14px] text-positive shrink-0" aria-label="vantagem" />;
  return <ArrowDown className="w-[14px] h-[14px] text-muted-foreground shrink-0" aria-label="desvantagem" />;
}

const valueToneClass = (winner: CompareWinner, side: 'left' | 'right') => {
  if (winner === side) return 'text-positive font-bold';
  if ((winner === 'left' || winner === 'right') && winner !== side) return 'text-muted-foreground';
  return 'text-foreground';
};

/* ───────────────────────── Player header card ───────────────────────── */

function PlayerHeader({ player, slot }: { player: PlayerRankingDto | null; slot: 1 | 2 }) {
  if (!player)
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-2 text-center">
        <UserPlus className="w-7 h-7 text-muted-foreground" />
        <div className="text-[12.5px] text-muted-foreground">Selecione o Jogador {slot}</div>
      </div>
    );
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Avatar name={player.playerName} size={52} />
      <div className="font-sans font-bold text-[15px] tracking-[-0.01em] truncate max-w-full">
        {player.nickname ?? player.playerName}
      </div>
    </div>
  );
}

/* ───────────────────────────── Página ───────────────────────────── */

export default function CompararRoute() {
  const { activeLeagueId } = useActiveLeague();
  const leagueId = activeLeagueId ?? '';

  const rankingQ = useLeagueRanking(leagueId);
  const players = useMemo(() => rankingQ.data ?? [], [rankingQ.data]);

  const [searchParams, setSearchParams] = useSearchParams();
  const p1Id = searchParams.get('p1');
  const p2Id = searchParams.get('p2');

  const setSlot = (slot: 'p1' | 'p2', id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set(slot, id);
    else next.delete(slot);
    setSearchParams(next, { replace: true });
  };

  const stats1Q = usePlayerStats(p1Id ?? '');
  const stats2Q = usePlayerStats(p2Id ?? '');

  const ranking1 = players.find((p) => p.playerId === p1Id) ?? null;
  const ranking2 = players.find((p) => p.playerId === p2Id) ?? null;
  const stats1 = p1Id ? stats1Q.data : undefined;
  const stats2 = p2Id ? stats2Q.data : undefined;

  const rows = useMemo(
    () => buildComparison(stats1, ranking1, stats2, ranking2),
    [stats1, ranking1, stats2, ranking2],
  );

  const loadingStats =
    (!!p1Id && stats1Q.isLoading) || (!!p2Id && stats2Q.isLoading);
  const nothingSelected = !p1Id && !p2Id;

  /* Sem liga ativa */
  if (!leagueId) {
    return (
      <div className="px-4 pb-24 min-h-full">
        <Header />
        <Card pad="lg" className="text-center">
          <Trophy className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <div className="font-sans font-semibold text-[15px] mb-1">Nenhuma liga selecionada</div>
          <div className="text-[13px] text-muted-foreground mb-4">
            Escolha uma liga para comparar jogadores.
          </div>
          <Link
            to="/app/ligas"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-md)] bg-secondary border border-border text-[13px] font-semibold text-foreground no-underline"
          >
            Ver minhas ligas
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 min-h-full">
      <Header />

      {/* Seletores */}
      <div className="flex items-end gap-2 mb-5">
        <PlayerSelect
          label="Jogador 1"
          players={players}
          selectedId={p1Id}
          onSelect={(id) => setSlot('p1', id)}
        />
        <div className="shrink-0 pb-[11px] font-mono font-bold text-[13px] text-gold-400">VS</div>
        <PlayerSelect
          label="Jogador 2"
          players={players}
          selectedId={p2Id}
          onSelect={(id) => setSlot('p2', id)}
        />
      </div>

      {rankingQ.isLoading ? (
        <Spinner />
      ) : loadingStats ? (
        <Spinner label="Carregando estatísticas…" />
      ) : nothingSelected ? (
        <Card pad="lg" className="text-center">
          <ArrowLeftRight className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <div className="font-sans font-semibold text-[15px] mb-1">
            Selecione dois jogadores para comparar
          </div>
          <div className="text-[13px] text-muted-foreground">
            Use os campos acima para buscar jogadores da liga.
          </div>
        </Card>
      ) : (
        <>
          {/* ───── Mobile: 2 cards empilhados ───── */}
          <div className="lg:hidden flex flex-col">
            <PlayerStatsCard
              player={ranking1}
              slot={1}
              rows={rows}
              side="left"
              present={!!stats1}
            />
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="font-mono font-bold text-[12px] text-gold-400">VS</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <PlayerStatsCard
              player={ranking2}
              slot={2}
              rows={rows}
              side="right"
              present={!!stats2}
            />
          </div>

          {/* ───── Desktop: colunas lado a lado, rótulos no centro ───── */}
          <div className="hidden lg:block">
            <Card pad="none" className="overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 px-5 py-4 border-b border-border">
                <PlayerHeader player={ranking1} slot={1} />
                <div className="w-px self-stretch bg-border" />
                <PlayerHeader player={ranking2} slot={2} />
              </div>
              {rows.map((r, i) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 px-5 py-[11px]"
                  style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <div className={`flex items-center justify-end gap-2 font-mono text-[15px] ${valueToneClass(r.winner, 'left')}`}>
                    {stats1 ? (
                      <>
                        <WinnerArrow winner={r.winner} side="left" />
                        <span>{r.display1}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </div>
                  <div className="text-center text-[11px] uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap min-w-[96px]">
                    {r.label}
                  </div>
                  <div className={`flex items-center gap-2 font-mono text-[15px] ${valueToneClass(r.winner, 'right')}`}>
                    {stats2 ? (
                      <>
                        <span>{r.display2}</span>
                        <WinnerArrow winner={r.winner} side="right" />
                      </>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Subcomponentes locais ───────────────────────── */

function Header() {
  return (
    <div className="flex items-center gap-2 mb-[14px] pt-1">
      <Link
        to="/app/ranking"
        className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-md)] bg-secondary border border-border text-foreground no-underline shrink-0"
        aria-label="Voltar ao ranking"
      >
        <ChevronLeft className="w-[18px] h-[18px]" />
      </Link>
      <div className="font-sans font-bold text-[20px] tracking-[-0.01em]">Comparar jogadores</div>
    </div>
  );
}

function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      {label ? <div className="text-[13px] text-muted-foreground">{label}</div> : null}
    </div>
  );
}

interface PlayerStatsCardProps {
  player: PlayerRankingDto | null;
  slot: 1 | 2;
  rows: CompareRow[];
  side: 'left' | 'right';
  present: boolean;
}

function PlayerStatsCard({ player, slot, rows, side, present }: PlayerStatsCardProps) {
  if (!present) {
    return (
      <Card pad="lg" className="text-center">
        <UserPlus className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
        <div className="text-[13px] text-muted-foreground">Selecione o Jogador {slot}</div>
      </Card>
    );
  }
  return (
    <Card pad="md">
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={player?.playerName ?? ''} size={40} />
        <div className="font-sans font-bold text-[16px] tracking-[-0.01em] truncate">
          {player ? player.nickname ?? player.playerName : `Jogador ${slot}`}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-[10px]">
        {rows.map((r) => {
          const display = side === 'left' ? r.display1 : r.display2;
          return (
            <div key={r.label} className="flex flex-col gap-[2px]">
              <span className="text-[11px] text-muted-foreground">{r.label}</span>
              <span className={`flex items-center gap-1 font-mono text-[14px] ${valueToneClass(r.winner, side)}`}>
                <WinnerArrow winner={r.winner} side={side} />
                <span>{display}</span>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
