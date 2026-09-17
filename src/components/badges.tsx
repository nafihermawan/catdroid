// Badge kecil yang dipakai di LogViewer & DetailPanel.
// Warna method mengikuti konvensi HTTP umum; status mengikuti semantik
// 2xx/3xx/4xx/5xx. Kontras dijaga agar tetap terbaca di latar gelap.

export function MethodBadge({ method }: { method: string | null }) {
  if (!method) return null;
  const color =
    method === 'GET'
      ? 'bg-sky-500/10 text-sky-400 ring-sky-500/30'
      : method === 'POST'
        ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30'
        : method === 'PUT'
          ? 'bg-amber-500/10 text-amber-400 ring-amber-500/30'
          : method === 'PATCH'
            ? 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/30'
            : method === 'DELETE'
              ? 'bg-rose-500/10 text-rose-400 ring-rose-500/30'
              : 'bg-slate-500/10 text-slate-400 ring-slate-500/30';
  return (
    <span
      className={`inline-block min-w-[4.5ch] rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold leading-none ring-1 ${color}`}
    >
      {method}
    </span>
  );
}

export function StatusBadge({ status }: { status: number | null }) {
  if (status == null) return null;
  const tone =
    status >= 200 && status < 300
      ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30'
      : status >= 300 && status < 400
        ? 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/30'
        : status >= 400 && status < 500
          ? 'bg-amber-500/10 text-amber-400 ring-amber-500/30'
          : 'bg-rose-500/10 text-rose-400 ring-rose-500/30';
  return (
    <span
      className={`inline-block min-w-[3.5ch] rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold leading-none ring-1 ${tone}`}
    >
      {status}
    </span>
  );
}
