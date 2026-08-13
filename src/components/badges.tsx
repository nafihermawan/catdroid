// Badge kecil yang dipakai di LogViewer & DetailPanel.
// Warna method mengikuti konvensi HTTP umum; status mengikuti semantik
// 2xx/3xx/4xx/5xx. Kontras dijaga agar tetap terbaca di latar gelap.

export function MethodBadge({ method }: { method: string | null }) {
  if (!method) return null;
  const color =
    method === 'GET'
      ? 'bg-sky-500/15 text-sky-300 ring-sky-500/30'
      : method === 'POST'
        ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
        : method === 'PUT'
          ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
          : method === 'PATCH'
            ? 'bg-orange-500/15 text-orange-300 ring-orange-500/30'
            : method === 'DELETE'
              ? 'bg-red-500/15 text-red-300 ring-red-500/30'
              : 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30';
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
      ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
      : status >= 300 && status < 400
        ? 'bg-sky-500/15 text-sky-300 ring-sky-500/30'
        : status >= 400 && status < 500
          ? 'bg-orange-500/15 text-orange-300 ring-orange-500/30'
          : 'bg-red-500/15 text-red-300 ring-red-500/30';
  return (
    <span
      className={`inline-block min-w-[3.5ch] rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold leading-none ring-1 ${tone}`}
    >
      {status}
    </span>
  );
}
