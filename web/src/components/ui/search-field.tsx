/**
 * SearchField — input de busca padrão (ícone + placeholder) para filtrar listas.
 * Controlado: value/onChange. Usado nos seletores de jogador (adicionar, delegado, eliminar).
 */
import { Search } from 'lucide-react';

export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar…',
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative mb-3">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-md)] border border-border bg-card text-foreground text-[14px] placeholder:text-muted-foreground outline-none focus:border-[var(--gold-400)]"
      />
    </div>
  );
}
