import { forwardRef } from 'react';
import type { ShareCardModel } from './share-card-model';

export interface ShareCardProps {
  model: ShareCardModel;
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Card gerencial estático renderizado off-screen para captura em PNG.
 * Usa cores sólidas do design system para garantir legibilidade no WhatsApp.
 */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ model }, ref) => {
    return (
      <div
        ref={ref}
        data-testid="share-card"
        style={{
          position: 'fixed',
          left: -9999,
          top: -9999,
          width: 360,
          padding: 24,
          fontFamily: "'Geist Variable', system-ui, -apple-system, sans-serif",
          background: '#191816',
          color: '#f2f0eb',
          borderRadius: 16,
          boxShadow: '0 18px 48px rgba(0,0,0,0.50)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: '#a29f99',
              marginBottom: 4,
            }}
          >
            Pendências · {model.subtitle || 'PokerHub'}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: '#f2f0eb',
            }}
          >
            {model.title}
          </div>
        </div>

        {/* Lines */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {model.lines.map((line, index) => (
            <div
              key={`${line.from}-${line.to}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                background: '#252421',
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
              >
                <span style={{ color: '#f2f0eb' }}>{line.from}</span>
                <span style={{ color: '#6e6b66', margin: '0 8px' }}>→</span>
                <span style={{ color: '#f2f0eb' }}>{line.to}</span>
              </div>
              <div
                style={{
                  flexShrink: 0,
                  fontFamily: "'Geist Mono Variable', ui-monospace, monospace",
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#c4a35a',
                  whiteSpace: 'nowrap',
                }}
              >
                R$ {formatBRL(line.amount)}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {model.empty && (
          <div
            style={{
              padding: '24px 14px',
              textAlign: 'center',
              background: '#252421',
              borderRadius: 12,
              color: '#a29f99',
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 20,
            }}
          >
            Nenhuma pendência em aberto.
          </div>
        )}

        {/* Footer / Total */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: '1px solid #2f2c28',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#a29f99',
            }}
          >
            Total pendente
          </span>
          <span
            style={{
              fontFamily: "'Geist Mono Variable', ui-monospace, monospace",
              fontSize: 24,
              fontWeight: 700,
              color: '#c4a35a',
            }}
          >
            R$ {formatBRL(model.total)}
          </span>
        </div>

        {/* Branding */}
        <div
          style={{
            marginTop: 18,
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: '#6e6b66',
            textTransform: 'uppercase',
          }}
        >
          PokerHub
        </div>
      </div>
    );
  },
);

ShareCard.displayName = 'ShareCard';
