/**
 * DesktopStandings — tabela completa de classificação para lg:.
 * Port de DkStandings de DesktopParts.jsx.
 * Exibida somente em lg:, ao lado do podium.
 * Clique na linha abre modal de PlayerStats.
 */
import { Avatar } from '@/components/ui/avatar';
import { MoneyValue } from '@/components/ui/money-value';
import type { RankingEntry } from './ranking-map';

const PODIUM_COLORS = [
  'var(--podium-gold)',
  'var(--podium-silver)',
  'var(--podium-bronze)',
];

interface DesktopStandingsProps {
  data: RankingEntry[];
  onRow: (p: RankingEntry) => void;
}

function Th({ children, align = 'left', width }: { children: React.ReactNode; align?: string; width?: number }) {
  return (
    <th
      style={{
        textAlign: align as React.CSSProperties['textAlign'],
        padding: '0 12px 10px',
        fontFamily: 'var(--font-display)',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--muted-foreground)',
        whiteSpace: 'nowrap',
        width: width,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'center', extra }: { children: React.ReactNode; align?: string; extra?: React.CSSProperties }) {
  return (
    <td
      style={{
        textAlign: align as React.CSSProperties['textAlign'],
        fontFamily: 'var(--font-mono)',
        fontSize: 13.5,
        ...extra,
      }}
    >
      {children}
    </td>
  );
}

export function DesktopStandings({ data, onRow }: DesktopStandingsProps) {
  return (
    <div className="overflow-x-auto">
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
        <thead>
          <tr>
            <Th align="center" width={36}>#</Th>
            <Th>Jogador</Th>
            <Th align="center">Torn.</Th>
            <Th align="center">1º</Th>
            <Th align="center">2º</Th>
            <Th align="center">3º</Th>
            <Th align="center">ITM</Th>
            <Th align="center">ROI</Th>
            <Th align="right">Lucro</Th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => {
            const posColor =
              p.position <= 3 ? PODIUM_COLORS[p.position - 1] : 'var(--muted-foreground)';
            return (
              <tr
                key={p.nick}
                onClick={() => onRow(p)}
                style={{ cursor: 'pointer', borderTop: '1px solid var(--border)' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--secondary)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')
                }
              >
                <td
                  style={{
                    textAlign: 'center',
                    padding: '12px 8px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 15,
                    color: posColor,
                  }}
                >
                  {p.position}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div className="flex items-center gap-[10px]">
                    <Avatar
                      name={p.name}
                      size={32}
                      podium={p.position <= 3 ? (['gold', 'silver', 'bronze'] as const)[p.position - 1] : undefined}
                    />
                    <div className="min-w-0">
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 600,
                          fontSize: 14,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--muted-foreground)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        @{p.nick}
                      </div>
                    </div>
                  </div>
                </td>
                <Td extra={{ color: 'var(--muted-foreground)' }}>{p.tournaments}</Td>
                <Td extra={{ fontWeight: 700 }}>{p.wins}</Td>
                <Td>{p.second}</Td>
                <Td>{p.third}</Td>
                <Td>{p.itm}%</Td>
                <Td
                  extra={{
                    fontWeight: 700,
                    color: p.roi >= 0 ? 'var(--positive)' : 'var(--negative)',
                  }}
                >
                  {p.roi >= 0 ? '+' : ''}
                  {p.roi.toFixed(0)}%
                </Td>
                <td style={{ textAlign: 'right', padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  <MoneyValue value={p.profit} signed size="14px" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
