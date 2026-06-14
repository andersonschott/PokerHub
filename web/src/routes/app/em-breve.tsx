import { Spade } from 'lucide-react';

export default function EmBreveRoute({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center animate-ph-fade-in">
      <div className="border border-border bg-card shadow-md flex size-14 items-center justify-center rounded-2xl">
        <Spade className="size-6 text-gold-400" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        Em construção — esta mesa ainda está sendo montada.
      </p>
    </div>
  );
}
