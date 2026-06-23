import { forwardRef } from 'react';
import type { BalanceShareCardModel } from './balance-share-card-model';

export interface BalanceShareCardProps {
  model: BalanceShareCardModel;
}

function formatBRL(n: number): string {
  return Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/**
 * Card estatico do saldo do torneio, renderizado off-screen para captura em PNG.
 * Cores solidas (hex) para legibilidade no WhatsApp. A captura (handleShareBalance)
 * sobrescreve a posicao do clone para o conteudo nao rasterizar fora do viewport.
 */
export const BalanceShareCard = forwardRef<HTMLDivElement, BalanceShareCardProps>(
  ({ model }, ref) => {
    return (
      <div
        ref={ref}
        data-testid="balance-share-card"
        style={{
          position: 'fixed', left: -9999, top: -9999, width: 360, padding: 24,
          fontFamily: "'Geist Variable', system-ui, -apple-system, sans-serif",
          background: '#191816', color: '#f2f0eb', borderRadius: 16,
          boxShadow: '0 18px 48px rgba(0,0,0,0.50)',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#a29f99', marginBottom: 4 }}>
            Saldo · {model.subtitle || 'PokerHub'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: '#f2f0eb' }}>
            {model.title}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {model.lines.map((line, index) => (
            <div key={`${line.name}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#252421', borderRadius: 12 }}>
              <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#393633', color: '#f2f0eb', fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {initials(line.name)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25, color: '#f2f0eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {line.name}
                </div>
                <div style={{ fontFamily: "'Geist Mono Variable', ui-monospace, monospace", fontSize: 11, color: '#a29f99', whiteSpace: 'nowrap' }}>
                  inv R$ {formatBRL(line.investment)} · prêmio R$ {formatBRL(line.prize)}
                </div>
              </div>
              <div style={{ flexShrink: 0, fontFamily: "'Geist Mono Variable', ui-monospace, monospace", fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', color: line.balance > 0 ? '#6db58c' : line.balance < 0 ? '#d35d58' : '#f2f0eb' }}>
                {line.balance > 0 ? '+' : line.balance < 0 ? '−' : ''}R$ {formatBRL(line.balance)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#252421', borderRadius: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f2f0eb' }}>Contribuição para a caixinha</span>
          <span style={{ fontFamily: "'Geist Mono Variable', ui-monospace, monospace", fontSize: 15, fontWeight: 700, color: '#c4a35a', whiteSpace: 'nowrap' }}>R$ {formatBRL(model.caixinha)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid #2f2c28' }}>
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a29f99' }}>Total prize pool</span>
          <span style={{ fontFamily: "'Geist Mono Variable', ui-monospace, monospace", fontSize: 24, fontWeight: 700, color: '#c4a35a' }}>R$ {formatBRL(model.prizePool)}</span>
        </div>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: '#6e6b66', textTransform: 'uppercase' }}>
          PokerHub
        </div>
      </div>
    );
  },
);

BalanceShareCard.displayName = 'BalanceShareCard';
