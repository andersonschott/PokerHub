/**
 * Perfil — conta + preferências.
 * Port fiel de App.jsx#Perfil (kit) + DesktopPerfil.jsx.
 * Dados REAIS: useAuth().user (nome / e-mail).
 * Stats mock: lucro temporada / ITM.
 * Ações REAIS: toggle tema (useTheme), sair (useAuth().clear() → /login).
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MoonStar,
  Sun,
  Settings2,
  PiggyBank,
  KeyRound,
  MessageCircle,
  Bell,
  LogOut,
  ChevronRight,
  Crown,
  TrendingUp,
  Target,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { StatTile } from '@/components/ui/stat-tile';
import { MoneyValue } from '@/components/ui/money-value';
import { Input } from '@/components/ui/input';
import { mockData } from '@/mocks/data';

const STORAGE_PIX = 'ph.pix_key';
const STORAGE_WHATSAPP = 'ph.whatsapp';

function fmtPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function saveStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable
  }
}

type SheetKind = 'pix' | 'whatsapp' | null;

// ----------------------------------------------------------------------------
// Shared row item component
// ----------------------------------------------------------------------------

interface ProfileRowProps {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  to?: string;
}

function ProfileRow({ icon, label, trailing, onClick, disabled, to }: ProfileRowProps) {
  const cls =
    'flex items-center gap-3 w-full min-h-[52px] px-[14px] py-3 bg-card border border-border rounded-[var(--radius-md)] cursor-pointer text-foreground text-left ' +
    'hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const content = (
    <>
      <span className="text-muted-foreground shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px]">
        {icon}
      </span>
      <span className="flex-1 font-sans font-medium text-[15px]">{label}</span>
      {trailing ? (
        <span className="font-mono font-bold text-[13.5px] text-gold-400 whitespace-nowrap shrink-0">
          {trailing}
        </span>
      ) : null}
      {(onClick || to) && !disabled ? (
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      ) : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {content}
    </button>
  );
}

// ----------------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------------

export default function PerfilRoute() {
  const { user, clear } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [pix, setPix] = useState(() => readStorage(STORAGE_PIX));
  const [whatsapp, setWhatsapp] = useState(() => readStorage(STORAGE_WHATSAPP));
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [draft, setDraft] = useState('');

  const caixinhaBalance = mockData.caixinha.balance;

  const openSheet = (kind: SheetKind) => {
    setDraft(kind === 'pix' ? pix : whatsapp);
    setSheet(kind);
  };

  const saveSheet = () => {
    if (sheet === 'pix') {
      setPix(draft.trim());
      saveStorage(STORAGE_PIX, draft.trim());
    } else if (sheet === 'whatsapp') {
      setWhatsapp(draft);
      saveStorage(STORAGE_WHATSAPP, draft);
    }
    setSheet(null);
  };

  const handleSignOut = () => {
    clear();
    navigate('/login', { replace: true });
  };

  const displayName = user?.name ?? 'Você';
  const displayEmail = user?.email ?? '';

  return (
    <div className="pb-24 px-4 pt-3">
      {/* Identity header */}
      <div className="flex flex-col items-center gap-2.5 py-5">
        <Avatar name={displayName} size={72} badgeIcon={Crown} badgeGold />
        <div className="font-sans font-bold text-[20px]">{displayName}</div>
        <div className="text-[13px] text-muted-foreground">{displayEmail}</div>
      </div>

      {/* Stat cards — mock */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <StatTile
          icon={TrendingUp}
          value={<MoneyValue value={1840} signed cents={false} size="19px" />}
          label="Lucro na temporada"
          tone="positive"
          center
          valueSize="19px"
        />
        <StatTile
          icon={Target}
          value="62%"
          label="ITM"
          center
          valueSize="19px"
        />
      </div>

      {/* Desktop layout: 2-column grid on lg+ */}
      <div className="lg:grid lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)] lg:gap-5 lg:items-start">
        {/* Desktop-only identity card (hidden on mobile - already shown above) */}
        <div className="hidden lg:flex flex-col gap-3.5">
          <Card pad="lg">
            <div className="flex flex-col items-center gap-2.5 py-2">
              <Avatar name={displayName} size={84} badgeIcon={Crown} badgeGold />
              <div className="font-sans font-bold text-[21px]">{displayName}</div>
              <div className="text-[13px] text-muted-foreground">{displayEmail}</div>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile
              icon={TrendingUp}
              value={<MoneyValue value={1840} signed cents={false} size="19px" />}
              label="Lucro na temporada"
              tone="positive"
              center
              valueSize="19px"
            />
            <StatTile
              icon={Target}
              value="62%"
              label="ITM"
              center
              valueSize="19px"
            />
          </div>
        </div>

        {/* Preference rows */}
        <div className="flex flex-col gap-2">
          {/* Aparência — theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full min-h-[52px] px-[14px] py-3 bg-card border border-border rounded-[var(--radius-md)] cursor-pointer text-foreground text-left hover:bg-secondary/50 transition-colors"
          >
            <span className="text-gold-400 shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px]">
              {theme === 'dark' ? <MoonStar /> : <Sun />}
            </span>
            <span className="flex-1 font-sans font-medium text-[15px]">Aparência</span>
            <span className="font-mono text-[13px] text-muted-foreground">
              {theme === 'dark' ? 'Escuro' : 'Claro'}
            </span>
            {/* Inline switch visual */}
            <span
              aria-hidden
              className={
                'w-[42px] h-6 rounded-full p-0.5 box-border border border-border shrink-0 ' +
                'flex items-center transition-[background] duration-[var(--dur-fast,120ms)] ' +
                (theme === 'dark' ? 'bg-secondary justify-start' : 'bg-primary justify-end')
              }
            >
              <span
                className={
                  'w-[18px] h-[18px] rounded-full ' +
                  (theme === 'dark' ? 'bg-muted-foreground' : 'bg-primary-foreground')
                }
              />
            </span>
          </button>

          <ProfileRow
            icon={<Settings2 />}
            label="Administração da liga"
            to="/app/perfil/admin"
          />

          <ProfileRow
            icon={<PiggyBank />}
            label="Caixinha da liga"
            trailing={`R$ ${caixinhaBalance.toLocaleString('pt-BR')}`}
            to="/app/perfil/caixinha"
          />

          <ProfileRow
            icon={<KeyRound />}
            label="Minha chave PIX"
            trailing={pix || undefined}
            onClick={() => openSheet('pix')}
          />

          <ProfileRow
            icon={<MessageCircle />}
            label="WhatsApp"
            trailing={whatsapp || 'Adicionar'}
            onClick={() => openSheet('whatsapp')}
          />

          <ProfileRow
            icon={<Bell />}
            label="Notificações"
            trailing="Em breve"
            disabled
          />

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full min-h-[52px] px-[14px] py-3 bg-card border border-border rounded-[var(--radius-md)] cursor-pointer text-negative text-left hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span className="flex-1 font-sans font-medium text-[15px]">Sair</span>
          </button>
        </div>
      </div>

      {/* PIX sheet */}
      {sheet === 'pix' && (
        <Sheet
          fixed
          open
          onClose={() => setSheet(null)}
          title="Minha chave PIX"
          subtitle="Usada para receber prêmios e acertos"
        >
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="block font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Chave PIX (e-mail, telefone ou aleatória)
              </label>
              <Input
                mono
                placeholder="ex.: voce@email.com"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              variant="primary"
              block
              disabled={draft.trim().length < 3}
              onClick={saveSheet}
            >
              Salvar
            </Button>
            {pix ? (
              <Button
                variant="ghost"
                block
                onClick={() => {
                  setPix('');
                  saveStorage(STORAGE_PIX, '');
                  setSheet(null);
                }}
              >
                Remover chave
              </Button>
            ) : null}
          </div>
        </Sheet>
      )}

      {/* WhatsApp sheet */}
      {sheet === 'whatsapp' && (
        <Sheet
          fixed
          open
          onClose={() => setSheet(null)}
          title="Cadastrar WhatsApp"
          subtitle="Usado para lembretes de pagamento e avisos de torneio"
        >
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="block font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Número com DDD
              </label>
              <Input
                mono
                type="tel"
                inputMode="tel"
                placeholder="(11) 98765-4321"
                value={draft}
                onChange={(e) => setDraft(fmtPhone(e.target.value))}
                autoFocus
              />
            </div>
            <Button
              variant="primary"
              block
              disabled={draft.replace(/\D/g, '').length < 10}
              onClick={saveSheet}
            >
              Salvar
            </Button>
            {whatsapp ? (
              <Button
                variant="ghost"
                block
                onClick={() => {
                  setWhatsapp('');
                  saveStorage(STORAGE_WHATSAPP, '');
                  setSheet(null);
                }}
              >
                Remover número
              </Button>
            ) : null}
          </div>
        </Sheet>
      )}
    </div>
  );
}
