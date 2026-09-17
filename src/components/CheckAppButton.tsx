import { Loader2, ShieldCheck } from 'lucide-react';

interface Props {
  checking: boolean;
  disabled: boolean;
  title: string;
  onClick: () => void;
}

/**
 * Pemicu cek kompatibilitas app — gaya ghost/outline ala action bar DevTools.
 * Saat `checking`, ikon berganti spinner dan tombol dikunci.
 */
export function CheckAppButton({ checking, disabled, title, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || checking}
      title={title}
      className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-sm transition-all duration-150 hover:bg-slate-700/80 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {checking ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
      )}
      {checking ? 'Checking...' : 'Check App'}
    </button>
  );
}
