/**
 * Monta o "Pix copia e cola" (BR Code estático, padrão EMV® MPM do Banco Central)
 * a partir da chave do recebedor. Inclui o CRC16-CCITT exigido pela spec.
 *
 * Cidade é opcional — usamos "BRASIL" como fallback quando o dado não existe
 * (suficiente para pagamentos P2P de jogo entre amigos).
 */

/** Campo EMV: id (2) + tamanho (2, zero-padded) + valor. */
function emv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Normaliza para ASCII maiúsculo sem acentos, limitado a `max` chars.
 * NFD decompõe letras acentuadas (ã → a + diacrítico); a remoção de
 * tudo que não é [A-Za-z0-9 ] descarta o diacrítico combinante restante.
 */
function sanitize(text: string, max: number): string {
  return text
    .normalize('NFD')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, max);
}

/** CRC16-CCITT (polinômio 0x1021, init 0xFFFF) — 4 dígitos hex maiúsculos. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadInput {
  /** Chave PIX do recebedor (e-mail, telefone, CPF/CNPJ ou aleatória). */
  key: string;
  /** Nome do recebedor (máx. 25 chars no BR Code). */
  name?: string | null;
  /** Cidade do recebedor (máx. 15 chars). Default "BRASIL". */
  city?: string | null;
  /** Valor da transferência; omitido do payload quando ausente/zero. */
  amount?: number;
}

export function buildPixPayload({ key, name, city, amount }: PixPayloadInput): string {
  const merchantName = sanitize(name || 'RECEBEDOR', 25) || 'RECEBEDOR';
  const merchantCity = sanitize(city || 'BRASIL', 15) || 'BRASIL';

  // 26 — Merchant Account Information (GUI + chave PIX)
  const mai = emv('00', 'br.gov.bcb.pix') + emv('01', key.trim());

  let payload =
    emv('00', '01') + // Payload Format Indicator
    emv('26', mai) +
    emv('52', '0000') + // Merchant Category Code
    emv('53', '986'); // Moeda: BRL

  if (amount && amount > 0) {
    payload += emv('54', amount.toFixed(2)); // Valor
  }

  payload +=
    emv('58', 'BR') + // País
    emv('59', merchantName) +
    emv('60', merchantCity) +
    emv('62', emv('05', '***')); // Additional Data — TXID

  payload += '6304'; // ID do CRC + tamanho fixo (04); CRC calculado sobre isto
  return payload + crc16(payload);
}
