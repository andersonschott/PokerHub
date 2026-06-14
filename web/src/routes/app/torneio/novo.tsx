/**
 * /app/torneio/novo — Wizard de 5 passos para criar/editar torneio.
 * Port fiel de TorneioWizard.jsx (mobile) + DesktopWizard.jsx (desktop lg:).
 * Suporta ?edit=1 para modo edição (pré-preenche com mockData.tournament).
 *
 * Estado todo local (useState por passo).
 * Na Fase 2+: substituir o handler de submit por mutation real.
 */
import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

import { useActiveLeague } from '@/features/leagues/league-context';
import {
  useCreateTournament,
  useTournaments,
  PrizeDistributionType,
  RebuyLimitType,
  CreateTournamentDto,
} from '@/lib/api/hooks/use-tournaments';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Chips } from '@/components/ui/chips';
import { BlindTable } from '@/features/tournaments/blind-table';
import { PrizeTable } from '@/features/tournaments/prize-table';
import {
  BLIND_TEMPLATES,
  genBlinds,
  getTemplateConfig,
  type BlindTemplate,
} from '@/features/tournaments/blind-utils';
import { MoneyValue } from '@/components/ui/money-value';
import { mockData } from '@/mocks/data';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PrizeMode = 'pct' | 'fixo';

// ---------------------------------------------------------------------------
// NumStep — stepper numérico compacto (− valor +)
// ---------------------------------------------------------------------------

interface NumStepProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}

function NumStep({ label, value, onChange, min = 1, max = 99, suffix }: NumStepProps) {
  return (
    <div className="flex items-center gap-[10px]">
      <span className="flex-1 text-[13.5px] text-muted-foreground">{label}</span>
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          'w-9 h-9 rounded-[var(--radius-sm)] border border-border bg-secondary text-foreground',
          'cursor-pointer text-[17px] leading-none shrink-0',
          'disabled:opacity-35 disabled:pointer-events-none',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]',
        )}
        aria-label={`Diminuir ${label}`}
      >
        −
      </button>
      <span className="min-w-[52px] text-center font-mono font-bold text-[15px]">
        {value}
        {suffix ?? ''}
      </span>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(
          'w-9 h-9 rounded-[var(--radius-sm)] border border-border bg-secondary text-foreground',
          'cursor-pointer text-[17px] leading-none shrink-0',
          'disabled:opacity-35 disabled:pointer-events-none',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]',
        )}
        aria-label={`Aumentar ${label}`}
      >
        +
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryRow — row de confirmação
// ---------------------------------------------------------------------------

function SummaryRow({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <div
      className={cn(
        'flex justify-between items-baseline gap-[14px] px-[14px] py-[11px]',
        !last && 'border-b border-border',
      )}
    >
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="font-mono font-semibold text-[13.5px] text-right">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop step rail
// ---------------------------------------------------------------------------

const STEPS = ['Informações', 'Valores', 'Blinds', 'Premiação', 'Confirmação'];

interface StepRailProps {
  step: number;
  onNavigate: (i: number) => void;
  onCancel: () => void;
}

function StepRail({ step, onNavigate, onCancel }: StepRailProps) {
  return (
    <div className="flex flex-col gap-1 sticky top-4">
      {STEPS.map((s, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <button
            key={s}
            type="button"
            onClick={() => { if (done) onNavigate(i); }}
            className={cn(
              'flex items-center gap-[11px] px-3 py-[10px] rounded-[var(--radius-md)] border-0',
              'text-left font-sans font-semibold text-[13.5px]',
              'transition-colors duration-[var(--dur-fast,120ms)]',
              done ? 'cursor-pointer' : 'cursor-default',
              active
                ? 'bg-[color-mix(in_oklab,var(--gold-500)_14%,transparent)] text-gold-400'
                : done
                ? 'text-foreground hover:bg-secondary'
                : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'w-6 h-6 shrink-0 rounded-full flex items-center justify-center',
                'font-mono font-bold text-[12px]',
                'border transition-colors',
                done
                  ? 'bg-positive border-transparent text-primary-foreground'
                  : active
                  ? 'bg-gold-500 border-transparent text-primary-foreground'
                  : 'bg-secondary border-border text-muted-foreground',
              )}
              aria-hidden
            >
              {done ? <Check className="w-[13px] h-[13px]" /> : i + 1}
            </span>
            {s}
          </button>
        );
      })}
      <Button variant="ghost" size="sm" onClick={onCancel} className="mt-2.5">
        Cancelar
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function NovoTorneioRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = searchParams.get('edit') === '1';
  const t = mockData.tournament;

  const { activeLeagueId } = useActiveLeague();
  const id = activeLeagueId ?? '';
  const { data: allTournaments } = useTournaments(id);
  const pastTournaments = (allTournaments ?? []).slice(0, 3);
  const create = useCreateTournament(id);

  // Stepper state
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  // Step 1 — Informações
  const [name, setName] = useState(isEdit ? t.name : '');
  const [tourDate, setTourDate] = useState('2026-06-12');
  const [tourTime, setTourTime] = useState('20:00');
  const [local, setLocal] = useState('');

  // Step 2 — Valores
  const [buyIn, setBuyIn] = useState(String(t.buyIn));
  const [stack, setStack] = useState('10000');
  const [rebuy, setRebuy] = useState(true);
  const [rebuyVal, setRebuyVal] = useState(String(t.buyIn));
  const [rebuyStack, setRebuyStack] = useState('10000');
  const [rebuyLvl, setRebuyLvl] = useState(4);
  const [addon, setAddon] = useState(true);
  const [addonVal, setAddonVal] = useState(String(t.buyIn));
  const [addonStack, setAddonStack] = useState('10000');
  const [lateCheckin, setLateCheckin] = useState(false);
  const [lateLvl, setLateLvl] = useState(2);

  // Step 3 — Blinds
  const [template, setTemplate] = useState<BlindTemplate>('regular');
  const [customMin, setCustomMin] = useState(15);
  const [customBreak, setCustomBreak] = useState(4);

  // Step 4 — Premiação
  const [usePrizeTable, setUsePrizeTable] = useState(true);
  const [prizeMode, setPrizeMode] = useState<PrizeMode>('pct');
  const [positions, setPositions] = useState([50, 30, 20]);

  // Derived
  const blindCfg = getTemplateConfig(template, customMin, customBreak);
  const blinds = genBlinds(blindCfg);
  const gamelevels = blinds.filter((b) => b.type === 'jogo').length;
  const totalBlindMins = blinds.reduce((s, b) => s + b.min, 0);
  const prizeTotal = positions.reduce((s, p) => s + (p || 0), 0);
  const prizeOk = usePrizeTable || prizeMode === 'fixo' || prizeTotal === 100;
  const canNext = step !== 0 || !!name.trim();

  const back = () => navigate(isEdit ? '/app/torneio/dashboard' : (activeLeagueId ? `/app/ligas/${activeLeagueId}` : '/app/ligas'));

  const next = async () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      if (!activeLeagueId) {
        toast.error('Nenhuma liga ativa selecionada.');
        return;
      }
      try {
        const dto: CreateTournamentDto = {
          name,
          scheduledDateTime: new Date(`${tourDate}T${tourTime}:00`).toISOString(),
          location: local || null,
          buyIn: Number(buyIn) || 0,
          startingStack: Number(stack) || 0,
          rebuyValue: rebuy ? (Number(rebuyVal) || 0) : null,
          rebuyStack: rebuy ? (Number(rebuyStack) || 0) : null,
          rebuyLimitLevel: rebuy ? rebuyLvl : null,
          rebuyLimitMinutes: null,
          rebuyLimitType: RebuyLimitType.Level,
          addonValue: addon ? (Number(addonVal) || 0) : null,
          addonStack: addon ? (Number(addonStack) || 0) : null,
          prizeStructure: usePrizeTable ? null : positions.join(','),
          prizeDistributionType: usePrizeTable ? PrizeDistributionType.Percentage : (prizeMode === 'pct' ? PrizeDistributionType.Percentage : PrizeDistributionType.Fixed),
          usePrizeTable,
          prizeTableId: null,
          allowCheckInUntilLevel: lateCheckin ? lateLvl : null,
          blindLevels: blinds.map((b) => ({
            order: b.level,
            smallBlind: b.sb || 0,
            bigBlind: b.bb || 0,
            ante: b.ante || 0,
            durationMinutes: b.min || 15,
            isBreak: b.type === 'intervalo',
            breakDescription: b.type === 'intervalo' ? 'Intervalo' : null
          }))
        };
        await create.mutateAsync(dto);
        toast.success(isEdit ? 'Torneio atualizado!' : 'Torneio criado!');
        navigate(`/app/ligas/${activeLeagueId}`);
      } catch (err) {
        toast.error('Erro ao salvar o torneio.');
      }
    }
  };

  const copyFrom = (pt: any) => {
    if (!isEdit) setName(pt.name);
    setBuyIn(String(pt.buyIn));
    setStack(String(pt.startingStack || pt.stack || 10000));
    setRebuy(pt.rebuyValue !== null && pt.rebuyValue !== undefined);
    setRebuyVal(String(pt.rebuyValue || pt.buyIn));
    setAddon(pt.addonValue !== null && pt.addonValue !== undefined);
    setAddonVal(String(pt.addonValue || pt.buyIn));
    setCopied(pt.id);
  };

  const numOnly = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter(e.target.value.replace(/\D/g, ''));

  // Confirmation summary rows
  const summaryRows: [string, ReactNode][] = [
    ['Nome', name || '—'],
    ['Data · hora', `${tourDate} · ${tourTime}`],
    ['Local', local || '—'],
    ['Buy-in', <><MoneyValue value={Number(buyIn) || 0} cents={false} color="none" size="13.5px" /> · stack {Number(stack || 0).toLocaleString('pt-BR')}</>],
    ['Rebuy', rebuy ? <><MoneyValue value={Number(rebuyVal) || 0} cents={false} color="none" size="13.5px" /> · até nível {rebuyLvl}</> : 'não'],
    ['Add-on', addon ? <MoneyValue value={Number(addonVal) || 0} cents={false} color="none" size="13.5px" /> : 'não'],
    ['Check-in tardio', lateCheckin ? `até nível ${lateLvl}` : 'não'],
    ['Blinds', `${blindCfg.label} · ${blindCfg.min} min · ${gamelevels} níveis`],
    ['Premiação', usePrizeTable ? 'tabela da liga (50/30/20)' : positions.map((p, i) => `${i + 1}º ${p}${prizeMode === 'pct' ? '%' : ''}`).join(' · ')],
  ];

  // ---------------------------------------------------------------------------
  // Step content (shared mobile + desktop)
  // ---------------------------------------------------------------------------
  const stepContent = (
    <>
      {/* Step 1 — Informações */}
      {step === 0 && (
        <div className="flex flex-col gap-4">
          {/* Copy from past tournament */}
          {!isEdit && (
            <Card pad="md">
              <div className="text-[11px] uppercase tracking-[0.07em] text-muted-foreground mb-2">
                Copiar configurações de
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {pastTournaments.map((pt) => {
                  const active = copied === pt.id;
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => copyFrom(pt)}
                      className={cn(
                        'px-3 py-2 rounded-full cursor-pointer',
                        'font-sans font-semibold text-[12.5px] whitespace-nowrap',
                        'border transition-colors duration-[var(--dur-fast,120ms)]',
                        active
                          ? 'bg-[color-mix(in_oklab,var(--gold-500)_14%,var(--card))] border-[color-mix(in_oklab,var(--gold-500)_45%,var(--border))] text-gold-400'
                          : 'bg-transparent border-border text-muted-foreground hover:border-[var(--felt-600)]',
                      )}
                    >
                      {pt.name}
                    </button>
                  );
                })}
              </div>
              {copied ? (
                <p className="text-[12px] text-positive mt-2">
                  Buy-in, stacks, blinds e premiação copiados — revise os passos.
                </p>
              ) : null}
            </Card>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="tour-name">Nome do torneio</Label>
            <Input
              id="tour-name"
              placeholder="Ex.: Torneio da Sexta"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="tour-date">Data</Label>
              <Input
                id="tour-date"
                type="date"
                mono
                value={tourDate}
                onChange={(e) => setTourDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tour-time">Horário</Label>
              <Input
                id="tour-time"
                type="time"
                mono
                value={tourTime}
                onChange={(e) => setTourTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tour-local">Local (opcional)</Label>
            <Input
              id="tour-local"
              placeholder="Casa do Caio"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 2 — Valores */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="buyin">Buy-in</Label>
              <Input
                id="buyin"
                mono
                prefix="R$"
                inputMode="numeric"
                value={buyIn}
                onChange={numOnly(setBuyIn)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stack">Stack inicial</Label>
              <Input
                id="stack"
                mono
                inputMode="numeric"
                value={stack}
                onChange={numOnly(setStack)}
              />
            </div>
          </div>

          <Card pad="md">
            <Switch
              label="Permitir rebuy"
              sub="Recompra após perder as fichas"
              checked={rebuy}
              onChange={setRebuy}
            />
            {rebuy && (
              <div className="flex flex-col gap-3 pt-1.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="rebuy-val">Valor do rebuy</Label>
                    <Input
                      id="rebuy-val"
                      mono
                      prefix="R$"
                      inputMode="numeric"
                      value={rebuyVal}
                      onChange={numOnly(setRebuyVal)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rebuy-stack">Stack do rebuy</Label>
                    <Input
                      id="rebuy-stack"
                      mono
                      inputMode="numeric"
                      value={rebuyStack}
                      onChange={numOnly(setRebuyStack)}
                    />
                  </div>
                </div>
                <NumStep
                  label="Permitido até o nível"
                  value={rebuyLvl}
                  onChange={setRebuyLvl}
                  min={1}
                  max={12}
                />
              </div>
            )}
          </Card>

          <Card pad="md">
            <Switch
              label="Permitir add-on"
              sub="Compra extra única no fim do período de rebuy"
              checked={addon}
              onChange={setAddon}
            />
            {addon && (
              <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                <div className="space-y-1.5">
                  <Label htmlFor="addon-val">Valor do add-on</Label>
                  <Input
                    id="addon-val"
                    mono
                    prefix="R$"
                    inputMode="numeric"
                    value={addonVal}
                    onChange={numOnly(setAddonVal)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addon-stack">Stack do add-on</Label>
                  <Input
                    id="addon-stack"
                    mono
                    inputMode="numeric"
                    value={addonStack}
                    onChange={numOnly(setAddonStack)}
                  />
                </div>
              </div>
            )}
          </Card>

          <Card pad="md">
            <Switch
              label="Check-in tardio"
              sub="Permitir entrada após o início do torneio"
              checked={lateCheckin}
              onChange={setLateCheckin}
            />
            {lateCheckin && (
              <div className="pt-1.5">
                <NumStep
                  label="Check-in até o nível"
                  value={lateLvl}
                  onChange={setLateLvl}
                  min={1}
                  max={8}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Step 3 — Blinds */}
      {step === 2 && (
        <div className="flex flex-col gap-3.5">
          <p className="text-[13px] text-muted-foreground">
            Escolha um template ou configure manualmente.
          </p>

          {/* Mobile segmented buttons */}
          <div className="flex gap-1 bg-secondary p-1 rounded-[var(--radius-md)] lg:hidden">
            {(['turbo', 'regular', 'deep', 'custom'] as BlindTemplate[]).map((tpl) => {
              const label = tpl === 'custom' ? 'Custom' : `${BLIND_TEMPLATES[tpl].label.split(' ')[0]} ${BLIND_TEMPLATES[tpl].min}'`;
              return (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setTemplate(tpl)}
                  className={cn(
                    'flex-1 h-9 rounded-[var(--radius-sm)] border-0 cursor-pointer whitespace-nowrap',
                    'font-sans font-semibold text-[12.5px]',
                    'transition-colors duration-[var(--dur-fast,120ms)]',
                    template === tpl
                      ? 'bg-[var(--felt-700)] text-foreground'
                      : 'bg-transparent text-muted-foreground',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Desktop chips */}
          <div className="hidden lg:block">
            <Chips<BlindTemplate>
              label="Estrutura"
              options={['turbo', 'regular', 'deep', 'custom']}
              value={template}
              onChange={setTemplate}
              render={(t) =>
                t === 'custom'
                  ? 'Custom'
                  : `${BLIND_TEMPLATES[t].label} ${BLIND_TEMPLATES[t].min}'`
              }
            />
          </div>

          {template === 'custom' && (
            <Card pad="md">
              <div className="flex flex-col gap-3">
                <NumStep
                  label="Duração de cada nível"
                  value={customMin}
                  onChange={setCustomMin}
                  min={5}
                  max={45}
                  suffix=" min"
                />
                <NumStep
                  label="Intervalo a cada"
                  value={customBreak}
                  onChange={setCustomBreak}
                  min={2}
                  max={8}
                  suffix=" níveis"
                />
              </div>
            </Card>
          )}

          {/* Blind table: list on mobile, table on desktop */}
          <div className="lg:hidden">
            <BlindTable rows={blinds} variant="list" />
          </div>
          <div className="hidden lg:block">
            <BlindTable rows={blinds} variant="table" />
          </div>

          <p className="text-[12px] text-muted-foreground">
            {gamelevels} níveis · intervalos de 10 min · duração estimada ~{Math.round(totalBlindMins / 60)}h
          </p>
        </div>
      )}

      {/* Step 4 — Premiação */}
      {step === 3 && (
        <div className="flex flex-col gap-3.5">
          <Card pad="md">
            <Switch
              label="Usar tabela de premiação da liga"
              sub="1º 50% · 2º 30% · 3º 20% (prioritário)"
              checked={usePrizeTable}
              onChange={setUsePrizeTable}
            />
          </Card>

          {!usePrizeTable && (
            <>
              {/* Segmented pct/fixo */}
              <div className="flex gap-1 bg-secondary p-1 rounded-[var(--radius-md)]">
                {(['pct', 'fixo'] as PrizeMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPrizeMode(m)}
                    className={cn(
                      'flex-1 h-9 rounded-[var(--radius-sm)] border-0 cursor-pointer',
                      'font-sans font-semibold text-[12.5px]',
                      'transition-colors duration-[var(--dur-fast,120ms)]',
                      prizeMode === m
                        ? 'bg-[var(--felt-700)] text-foreground'
                        : 'bg-transparent text-muted-foreground',
                    )}
                  >
                    {m === 'pct' ? 'Percentual' : 'Valor fixo (R$)'}
                  </button>
                ))}
              </div>

              {/* Desktop with progress bars */}
              <div className="hidden lg:block">
                <Card pad="md">
                  <p className="text-[13px] text-muted-foreground mb-3">
                    Percentual do prize pool por posição. A soma precisa fechar em{' '}
                    <strong className="font-mono text-foreground">100%</strong>.
                  </p>
                  <PrizeTable
                    positions={positions}
                    onChange={setPositions}
                    mode={prizeMode}
                    variant="desktop"
                  />
                </Card>
                <div className="flex justify-end mt-2">
                  <Badge tone={prizeTotal === 100 ? 'positive' : 'warning'}>
                    Soma {prizeTotal}%
                  </Badge>
                </div>
              </div>

              {/* Mobile */}
              <div className="lg:hidden">
                <Card pad="md">
                  <PrizeTable
                    positions={positions}
                    onChange={setPositions}
                    mode={prizeMode}
                    variant="mobile"
                  />
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 5 — Confirmação */}
      {step === 4 && (
        <div className="flex flex-col gap-3.5">
          <Card pad="none">
            {summaryRows.map(([l, v], i) => (
              <SummaryRow key={l} label={l} value={v} last={i === summaryRows.length - 1} />
            ))}
          </Card>
          {!prizeOk && (
            <p className="text-[12.5px] text-warning">
              Atenção: a premiação não soma 100% — volte ao passo 4.
            </p>
          )}
          {/* Desktop caixinha note */}
          <div className="hidden lg:block px-[14px] py-3 rounded-[var(--radius-md)] bg-[color-mix(in_oklab,var(--gold-500)_10%,var(--card))] border border-border text-[13px] text-muted-foreground">
            Uma porcentagem do prize pool vai para a caixinha da liga.
          </div>
        </div>
      )}
    </>
  );

  // ---------------------------------------------------------------------------
  // Desktop layout (lg:)
  // ---------------------------------------------------------------------------
  const desktopLayout = (
    <div className="hidden lg:grid" style={{ gridTemplateColumns: '220px minmax(0, 1fr)', gap: '24px', maxWidth: '880px', alignItems: 'start' }}>
      <StepRail step={step} onNavigate={setStep} onCancel={back} />
      <Card pad="lg">
        <div className="font-sans font-bold text-[18px] mb-4">{STEPS[step]}</div>
        {stepContent}
        <div className="flex gap-2 justify-end mt-[22px] pt-4 border-t border-border">
          {step > 0 ? (
            <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          ) : null}
          {step < 4 ? (
            <Button variant="primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Continuar
            </Button>
          ) : (
            <Button variant="primary" icon={Check} disabled={!prizeOk} onClick={next}>
              {isEdit ? 'Salvar' : 'Criar torneio'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Mobile layout
  // ---------------------------------------------------------------------------
  const mobileLayout = (
    <div className="lg:hidden" style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      {/* Form header */}
      <div className="flex items-center gap-2.5 mb-4">
        <IconButton
          icon={ArrowLeft}
          aria-label="Voltar"
          onClick={back}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-sans font-bold text-[18px] tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis">
            {isEdit ? 'Configurar torneio' : 'Criar torneio'}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {step + 1}/5 · {STEPS[step]}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-[5px] mb-[18px]">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            title={s}
            onClick={() => i < step && setStep(i)}
            className={cn(
              'flex-1 h-1 rounded-full border-0 p-0',
              i < step ? 'cursor-pointer' : 'cursor-default',
            )}
            style={{
              backgroundColor: i <= step ? 'var(--gold-500)' : 'var(--felt-700)',
            }}
          />
        ))}
      </div>

      {stepContent}

      {/* Footer nav */}
      <div className="flex gap-2 mt-5">
        {step > 0 ? (
          <Button variant="secondary" block onClick={() => setStep(step - 1)}>
            Voltar
          </Button>
        ) : (
          <Button variant="ghost" block onClick={back}>
            Cancelar
          </Button>
        )}
        <Button
          variant="primary"
          block
          disabled={!canNext || (step === 4 && !prizeOk)}
          onClick={next}
        >
          {step === 4 ? (isEdit ? 'Salvar' : 'Criar torneio') : 'Próximo'}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {mobileLayout}
      <div className="hidden lg:block px-8 py-6">
        {desktopLayout}
      </div>
    </>
  );
}
