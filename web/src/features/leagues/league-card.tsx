/**
 * League card used in the Lobby — shows name, suit, member/tournament counts,
 * live indicator and organizer actions (Convite + Administrar).
 * Fiel port de Lobby.jsx#LeagueCard.
 */
import { Ticket, Settings2, Users, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { LeagueDto } from '@/lib/api/hooks/use-leagues';

// Suit is derived from league name position in the list; we cycle through the
// four suits for visual variety. The kit uses a `suit` field that doesn't come
// from the API — we pick one deterministically from the league id.
const SUITS = ['♠', '♥', '♦', '♣'] as const;
const SUIT_RED = new Set(['♥', '♦']);

function suitFor(id: string): string {
  // sum first 4 chars of uuid to get a 0-3 index
  const n = id.replace(/-/g, '').charCodeAt(0) % 4;
  return SUITS[n] ?? '♠';
}

export interface LeagueCardProps {
  league: LeagueDto;
  isActive: boolean;
  currentUserId: string;
  onPick: (league: LeagueDto) => void;
  onInvite: (league: LeagueDto) => void;
  onAdmin: (league: LeagueDto) => void;
}

export function LeagueCard({
  league,
  isActive,
  currentUserId,
  onPick,
  onInvite,
  onAdmin,
}: LeagueCardProps) {
  const isOrganizer = league.organizerId === currentUserId;
  const suit = suitFor(league.id);
  const suitRed = SUIT_RED.has(suit);

  return (
    <Card
      interactive
      pad="md"
      onClick={() => onPick(league)}
      className={
        isActive
          ? '[border-color:color-mix(in_oklab,var(--gold-500)_55%,var(--border))] [box-shadow:var(--glow-gold)]'
          : ''
      }
    >
      {/* Top row: suit icon + name + "Atual" badge */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-[13px] shrink-0 flex items-center justify-center text-[22px] leading-none bg-secondary border border-border"
          style={{ color: suitRed ? 'var(--suit-red)' : 'var(--foreground)' }}
        >
          {suit}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="min-w-0 font-sans font-bold text-[15.5px] tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis">
              {league.name}
            </span>
            {isActive ? (
              <span className="shrink-0 font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-gold-400 bg-[color-mix(in_oklab,var(--gold-500)_16%,var(--card))] border border-[color-mix(in_oklab,var(--gold-500)_30%,transparent)] px-[7px] py-[2px] rounded-full">
                Atual
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {!isOrganizer ? `por ${league.organizerName} · ` : ''}
            {league.isActive ? 'Temporada ativa' : 'Inativa'}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 mt-3">
        <Badge tone="neutral" icon={Users}>
          {league.playerCount}
        </Badge>
        <Badge tone="neutral" icon={Trophy}>
          {league.tournamentCount}
        </Badge>
        <span className="ml-auto font-mono text-[11.5px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
          {league.jackpotPercentage > 0 ? `caixinha ${league.jackpotPercentage}%` : null}
        </span>
      </div>

      {/* Organizer actions */}
      {isOrganizer ? (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInvite(league);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-[9px] rounded-[var(--radius-md)] bg-secondary border border-border cursor-pointer text-gold-400 font-sans font-semibold text-[13px] whitespace-nowrap hover:bg-[var(--felt-700)] transition-colors"
          >
            <Ticket className="size-[15px]" />
            Convite
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdmin(league);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-[9px] rounded-[var(--radius-md)] bg-secondary border border-border cursor-pointer text-foreground font-sans font-semibold text-[13px] whitespace-nowrap hover:bg-[var(--felt-700)] transition-colors"
          >
            <Settings2 className="size-[15px]" />
            Administrar
          </button>
        </div>
      ) : null}
    </Card>
  );
}
