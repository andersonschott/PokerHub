import { useState } from 'react';
import {
  Play,
  UserPlus,
  Skull,
  ChevronRight,
  Copy,
  Settings,
  Crown,
  Trophy,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { StatTile } from '@/components/ui/stat-tile';
import { MoneyValue } from '@/components/ui/money-value';
import { PodiumStat } from '@/components/ui/podium-stat';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Sheet } from '@/components/ui/sheet';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Chips } from '@/components/ui/chips';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-1">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function App() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [chips, setChips] = useState(10);

  return (
    <div className="min-h-dvh bg-background text-foreground p-4 md:p-8 space-y-10 max-w-2xl mx-auto animate-ph-fade-in">
      <h1 className="text-2xl font-bold text-gold-400">
        PokerHub — Design System Demo
      </h1>

      {/* Buttons */}
      <Section title="Button">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={Play}>
            Operar torneio
          </Button>
          <Button variant="secondary" icon={UserPlus}>
            Check-in
          </Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost" iconRight={ChevronRight}>
            Ver ranking
          </Button>
          <Button variant="destructive" icon={Skull}>
            Eliminar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline">
            Small
          </Button>
          <Button size="lg" variant="primary">
            Large
          </Button>
        </div>
        <Button block variant="primary" icon={Play}>
          Block button
        </Button>
      </Section>

      {/* IconButton */}
      <Section title="IconButton">
        <div className="flex gap-2">
          <IconButton icon={Copy} variant="solid" aria-label="Copiar" />
          <IconButton icon={Settings} aria-label="Configurações" />
          <IconButton icon={Crown} gold variant="solid" aria-label="Organizer" />
        </div>
      </Section>

      {/* Badge */}
      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">Neutro</Badge>
          <Badge tone="gold">♠ Poker</Badge>
          <Badge tone="emerald">Agendado</Badge>
          <Badge tone="positive" icon={TrendingUp}>
            Confirmado
          </Badge>
          <Badge tone="negative">Negativo</Badge>
          <Badge tone="warning">Pendente</Badge>
          <Badge tone="solid">Solid</Badge>
        </div>
      </Section>

      {/* StatusPill */}
      <Section title="StatusPill">
        <div className="flex flex-wrap gap-3">
          <StatusPill status="live" />
          <StatusPill status="paused" />
          <StatusPill status="scheduled" />
          <StatusPill status="finished" />
        </div>
      </Section>

      {/* Avatar */}
      <Section title="Avatar">
        <div className="flex items-end gap-4">
          <Avatar name="Bruno Lima" size={44} />
          <Avatar name="Ana Reis" podium="gold" badge="1" badgeGold size={44} />
          <Avatar name="Caio Souza" podium="silver" badge="2" size={44} />
          <Avatar name="Org" badgeIcon={Crown} badgeGold size={52} />
        </div>
      </Section>

      {/* MoneyValue */}
      <Section title="MoneyValue">
        <div className="flex flex-wrap gap-6 font-mono">
          <MoneyValue value={1250} />
          <MoneyValue value={350} signed />
          <MoneyValue value={-120} />
          <MoneyValue value={4800} cents={false} size="32px" color="none" />
          <MoneyValue value={0} />
        </div>
      </Section>

      {/* StatTile */}
      <Section title="StatTile">
        <div className="grid grid-cols-2 gap-3">
          <StatTile icon={Users} value="6/9" label="Jogadores" center />
          <StatTile
            icon={Trophy}
            value={<MoneyValue value={4800} cents={false} color="none" />}
            label="Prize pool"
            tone="emerald"
            center
          />
          <StatTile value="12" label="Rebuys" center />
          <StatTile value="3" label="Add-ons" tone="gold" center />
        </div>
      </Section>

      {/* PodiumStat */}
      <Section title="PodiumStat">
        <div className="space-y-2">
          <PodiumStat
            position={1}
            name="Ana Reis"
            sub="8 vitórias"
            prize={<MoneyValue value={2400} cents={false} color="none" />}
          />
          <PodiumStat
            position={2}
            name="Caio Souza"
            sub="55% ITM"
            prize={<MoneyValue value={1440} cents={false} color="none" />}
          />
          <PodiumStat
            position={3}
            name="Bruno Lima"
            prize={<MoneyValue value={960} cents={false} color="none" />}
          />
          <PodiumStat position={4} name="Maria Santos" sub="40% ITM" />
        </div>
      </Section>

      {/* ProgressBar */}
      <Section title="ProgressBar">
        <div className="space-y-3">
          <ProgressBar value={62} />
          <ProgressBar value={3} max={10} tone="emerald" size="lg" />
          <ProgressBar value={75} tone="warning" />
          <ProgressBar value={90} tone="positive" />
        </div>
      </Section>

      {/* Card */}
      <Section title="Card">
        <Card
          variant="live"
          title="Torneio da Sexta"
          action={<StatusPill status="live" />}
        >
          <p className="text-sm text-muted-foreground">
            Conteúdo da card com variante live (emerald glow).
          </p>
        </Card>
        <Card variant="gold" title="Prize Pool">
          <MoneyValue value={4800} cents={false} size="32px" color="none" />
        </Card>
        <Card variant="flat">
          <p className="text-sm text-muted-foreground">Flat card (inset).</p>
        </Card>
        <Card
          interactive
          title="Ranking"
          action={
            <Button variant="ghost" size="sm" iconRight={ChevronRight}>
              Ver tudo
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">Interactive card — hover me.</p>
        </Card>
      </Section>

      {/* SectionTitle */}
      <Section title="SectionTitle">
        <SectionTitle
          icon={Trophy}
          action={
            <Button variant="ghost" size="sm" iconRight={ChevronRight}>
              Ver tudo
            </Button>
          }
        >
          Próximos torneios
        </SectionTitle>
      </Section>

      {/* Input & Label */}
      <Section title="Input and Label">
        <div className="space-y-4">
          <div>
            <Label htmlFor="nome-demo">Nome da liga</Label>
            <Input id="nome-demo" placeholder="Ex.: Liga dos Amigos" />
          </div>
          <div>
            <Label htmlFor="val-demo">Valor (mono)</Label>
            <Input id="val-demo" mono prefix="R$" placeholder="0,00" type="text" />
          </div>
          <div>
            <Label htmlFor="desc-demo">Descrição</Label>
            <Textarea id="desc-demo" placeholder="Torneio toda sexta, buy-in leve…" />
          </div>
        </div>
      </Section>

      {/* Switch */}
      <Section title="Switch">
        <Card pad="md">
          <Switch
            label="Bloquear check-in com débitos"
            sub="Jogador com pagamento pendente não entra no próximo torneio"
            checked={switchChecked}
            onChange={setSwitchChecked}
          />
        </Card>
      </Section>

      {/* Chips */}
      <Section title="Chips">
        <Chips
          label="Caixinha — % do prize pool"
          options={[0, 5, 10, 15]}
          value={chips}
          onChange={setChips}
          render={(o) => `${o}%`}
        />
      </Section>

      {/* Sheet */}
      <Section title="Sheet">
        <Button variant="outline" onClick={() => setSheetOpen(true)}>
          Abrir Sheet
        </Button>
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          leading={<Avatar name="Bruno Lima" size={40} />}
          title="Bruno Lima"
          subtitle="Stack inicial · sem rebuys"
          fixed
        >
          <div className="grid gap-2 pb-2">
            <Button variant="outline" icon={UserPlus} block>
              Check-in
            </Button>
            <Button variant="secondary" icon={TrendingUp} block>
              Rebuy (+R$ 50)
            </Button>
            <Button variant="destructive" icon={Skull} block>
              Eliminar
            </Button>
          </div>
        </Sheet>
      </Section>
    </div>
  );
}
