/**
 * /app/torneio/dashboard — Painel ao vivo do organizador.
 * Port de Dashboard.jsx + stat patterns de DesktopTorneio.jsx.
 * README item 4 + seção "How to navigate".
 *
 * Tudo useState sobre mockData. Na Fase 4 o useMockClock será substituído
 * por hook SignalR sem mudar as telas (mesmo shape de estado).
 */
import { useState, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings2, Flag, Users, Trophy, Repeat, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { StatTile } from '@/components/ui/stat-tile';
import { MoneyValue } from '@/components/ui/money-value';
import { LevelControl } from '@/features/live/level-control';
import { PlayerRow } from '@/features/live/player-row';
import { ActionSheet } from '@/features/live/action-sheet';
import { EliminateSheet } from '@/features/live/eliminate-sheet';
import { useMockClock } from '@/features/timer/use-mock-clock';
import { mockData, type MockTablePlayer } from '@/mocks/data';

// ---------------------------------------------------------------------------
// Types for Dashboard-local state
// ---------------------------------------------------------------------------

type SheetStep = 'actions' | 'eliminate';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DashboardRoute() {
  const navigate = useNavigate();
  const t = mockData.tournament;

  // Mock clock — same hook as Timer (Task 10)
  const { state: clock, togglePause, nextLevel, prevLevel } = useMockClock();

  // Table state — mutable copy of mockData.table
  const [table, setTable] = useState<MockTablePlayer[]>(() =>
    mockData.table.map((p) => ({ ...p })),
  );

  // Sheet state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<SheetStep>('actions');

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const inPlay = table.filter((p) => p.status === 'in');
  const out = table.filter((p) => p.status === 'out').sort((a, b) => (a.place ?? 99) - (b.place ?? 99));

  const totalRebuys = table.reduce((s, p) => s + (p.rebuys || 0), 0);
  const totalAddons = table.reduce((s, p) => s + (p.addons || 0), 0);

  // Live prize pool: buy-in × (players + rebuys + add-ons) × 2 (mock formula from kit)
  const prizePool = t.buyIn * (table.length + totalRebuys + totalAddons) * 2;

  const selectedPlayer = selectedId ? table.find((p) => p.id === selectedId) ?? null : null;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const openSheet = useCallback((p: MockTablePlayer) => {
    setSelectedId(p.id);
    setStep('actions');
  }, []);

  const closeSheet = useCallback(() => {
    setSelectedId(null);
  }, []);

  const adjust = useCallback((id: string, key: 'rebuys' | 'addons', delta: number) => {
    setTable((tb) =>
      tb.map((p) =>
        p.id === id ? { ...p, [key]: Math.max(0, (p[key] || 0) + delta) } : p,
      ),
    );
  }, []);

  const handleCheckIn = useCallback(() => {
    if (!selectedPlayer) return;
    closeSheet();
    toast.success(`${selectedPlayer.name}: check-in confirmado`);
  }, [selectedPlayer, closeSheet]);

  const handleEliminate = useCallback(
    (eliminatedBy: MockTablePlayer) => {
      if (!selectedPlayer) return;
      const place = inPlay.length; // eliminado agora, então = tamanho atual antes de remover
      setTable((tb) =>
        tb.map((p) =>
          p.id === selectedPlayer.id ? { ...p, status: 'out' as const, place } : p,
        ),
      );
      closeSheet();
      toast.success(`${selectedPlayer.name} eliminado por ${eliminatedBy.name} · ${place}º lugar`);
    },
    [selectedPlayer, inPlay.length, closeSheet],
  );

  const undoElimination = useCallback(
    (p: MockTablePlayer) => {
      setTable((tb) =>
        tb.map((x) => {
          if (x.id !== p.id) return x;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { place: _place, ...rest } = x;
          return { ...rest, status: 'in' as const };
        }),
      );
      toast.success(`Eliminação de ${p.name} desfeita`);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <div
        className="px-4 pb-24 min-h-full"
        style={
          {
            '--dashboard-content': 'block',
          } as CSSProperties
        }
      >
        {/* ---- Header ---- */}
        <div className="flex items-center gap-[10px] mb-[14px] pt-1">
          <IconButton
            icon={ArrowLeft}
            aria-label="Voltar"
            size="md"
            onClick={() => navigate('/app/torneio')}
            className="shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-[17px] whitespace-nowrap overflow-hidden text-ellipsis">
                {t.name}
              </span>
              <Badge tone="gold">Operando</Badge>
            </div>
            <div className="text-[12px] text-muted-foreground">Você controla a mesa e o nível</div>
          </div>
          <IconButton
            icon={Settings2}
            aria-label="Configurar torneio"
            variant="solid"
            size="sm"
            onClick={() => navigate('/app/torneio/novo?edit=1')}
            className="shrink-0"
          />
          <StatusPill status={clock.paused ? 'paused' : 'live'} className="shrink-0" />
        </div>

        {/* ---- Desktop lg: two-column layout ---- */}
        {/* Left col: control + stats | Right col: players. Sheets stay as sheets (plan step 3). */}
        <div className="lg:grid lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.3fr)] lg:gap-5 lg:items-start">
          {/* Left column: level control + stats + encerrar */}
          <div className="flex flex-col gap-3">
            {/* ---- Level control ---- */}
            <LevelControl
              state={clock}
              onPrev={prevLevel}
              onTogglePause={togglePause}
              onNext={nextLevel}
            />

            {/* ---- Live stats ---- */}
            <div className="grid grid-cols-3 gap-[10px]">
              <StatTile
                value={`${inPlay.length}/${t.players}`}
                label="Na mesa"
                icon={Users}
                center
                valueSize="17px"
              />
              <StatTile
                value={<MoneyValue value={prizePool} cents={false} color="none" size="17px" />}
                label="Prize pool"
                icon={Trophy}
                tone="emerald"
                center
                valueSize="17px"
              />
              <StatTile
                value={totalRebuys}
                label="Rebuys"
                icon={Repeat}
                center
                valueSize="17px"
              />
            </div>

            {/* ---- Encerrar torneio ---- */}
            <div className="mt-1">
              <Button
                variant="primary"
                icon={Flag}
                block
                onClick={() => navigate('/app/debitos/pagamentos')}
              >
                Encerrar torneio
              </Button>
              <div className="text-[12px] text-muted-foreground text-center mt-2">
                Calcula prêmios, caixinha e quem paga quem.
              </div>
            </div>
          </div>

          {/* Right column: players */}
          <div className="mt-3 lg:mt-0">
            {/* ---- Players in play ---- */}
            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
              Na mesa · {inPlay.length}
            </div>
            <div className="flex flex-col gap-2">
              {inPlay.map((p) => (
                <PlayerRow key={p.id} player={p} onSelect={openSheet} />
              ))}
            </div>

            {/* ---- Eliminated — with undo ---- */}
            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-[18px] mb-2">
              Eliminados · {out.length}
            </div>
            <div className="flex flex-col gap-2">
              {out.length === 0 ? (
                <div className="text-[12.5px] text-muted-foreground px-[2px] py-1">
                  Ninguém eliminado ainda.
                </div>
              ) : (
                out.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)]"
                  >
                    <span className="w-[30px] h-[30px] rounded-[8px] bg-secondary flex items-center justify-center font-mono font-bold text-[13px] text-muted-foreground shrink-0">
                      {p.place}º
                    </span>
                    <span className="flex-1 min-w-0 font-sans font-medium text-[14px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                      {p.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => undoElimination(p)}
                      title="Desfazer eliminação"
                      aria-label={`Desfazer eliminação de ${p.name}`}
                      className="inline-flex items-center gap-1.5 h-8 px-[10px] rounded-[var(--radius-sm)] border border-border bg-transparent cursor-pointer text-muted-foreground font-sans font-semibold text-[12.5px] shrink-0 hover:bg-secondary transition-colors duration-[var(--dur-fast,120ms)]"
                    >
                      <Undo2 className="w-[13px] h-[13px]" />
                      Desfazer
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Action sheet (step: actions) ---- */}
      {selectedPlayer && step === 'actions' && (
        <ActionSheet
          player={selectedPlayer}
          buyIn={t.buyIn}
          onClose={closeSheet}
          onAdjust={adjust}
          onEliminate={() => setStep('eliminate')}
          onCheckIn={handleCheckIn}
        />
      )}

      {/* ---- Eliminate sheet (step: eliminate) ---- */}
      {selectedPlayer && step === 'eliminate' && (
        <EliminateSheet
          eliminatedPlayer={selectedPlayer}
          activePlayers={inPlay.filter((p) => p.id !== selectedPlayer.id)}
          onEliminate={handleEliminate}
          onBack={() => setStep('actions')}
          onClose={closeSheet}
        />
      )}
    </>
  );
}
