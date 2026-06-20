import { describe, it, expect } from 'vitest';
import { buildPixPayload, crc16 } from './pix';

describe('buildPixPayload', () => {
  it('começa com o Payload Format Indicator e contém o GUI do PIX', () => {
    const p = buildPixPayload({ key: 'ana.reis@pix.com', name: 'Ana Reis', amount: 120 });
    expect(p.startsWith('000201')).toBe(true);
    expect(p).toContain('br.gov.bcb.pix');
    expect(p).toContain('ana.reis@pix.com');
  });

  it('inclui o valor formatado com 2 casas quando informado', () => {
    const p = buildPixPayload({ key: 'k', name: 'X', amount: 120.5 });
    expect(p).toContain('5406120.50');
  });

  it('omite o campo de valor quando ausente ou zero', () => {
    const p = buildPixPayload({ key: 'k', name: 'X' });
    // moeda (53 03 986) deve emendar direto no país (58 02 BR), sem campo 54 no meio
    expect(p).toContain('53039865802BR');
  });

  it('é auto-consistente: o CRC embutido bate com o recalculado', () => {
    const p = buildPixPayload({ key: 'k', name: 'X', amount: 10 });
    const body = p.slice(0, -4);
    const embedded = p.slice(-4);
    expect(body.endsWith('6304')).toBe(true);
    expect(crc16(body)).toBe(embedded);
  });

  it('remove acentos e usa fallbacks de nome/cidade', () => {
    const p = buildPixPayload({ key: 'k', name: 'Téo Brandão' });
    expect(p).toContain('TEO BRANDAO');
    expect(p).toContain('BRASIL');
  });
});
