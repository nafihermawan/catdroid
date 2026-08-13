import { useState } from 'react';
import type { ExchangeDetail } from '../types';
import { formatJson, highlightJson } from '../utils/format';
import { MethodBadge, StatusBadge } from './badges';

interface Props {
  detail: ExchangeDetail | null;
  onClose: () => void;
}

// Code block dengan judul + tombol copy ikon di pojok kanan.
function CodeBlock({ title, body }: { title: string; body: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!body) return null;
  const formatted = formatJson(body);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // abaikan
    }
  };

  return (
    <section>
      <h3 className="px-0.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h3>
      {/* Container relatif: tombol copy overlay di pojok kanan atas,
          tetap di dalam border & tidak ikut scroll konten JSON. */}
      <div className="relative">
        <button
          onClick={copy}
          title={copied ? 'Copied' : 'Salin body'}
          aria-label={copied ? 'Copied' : 'Salin body'}
          className="absolute right-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#2c3542] bg-[#171c25]/95 text-zinc-300 shadow-sm transition-colors hover:border-[#3d4a5c] hover:bg-[#1c222d] hover:text-white"
        >
          {copied ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {/* clipboard: dua persegi tumpuk */}
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          )}
        </button>
        <pre className="max-h-72 overflow-auto whitespace-pre rounded-md border border-[#1e2430] bg-[#0d1016] p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
          <code dangerouslySetInnerHTML={{ __html: highlightJson(formatted) }} />
        </pre>
      </div>
    </section>
  );
}

export function DetailPanel({ detail, onClose }: Props) {
  return (
    <aside className="flex w-full flex-col border-t border-[#1e2430] bg-[#12161d] md:w-[46%] md:border-l md:border-t-0 xl:w-[42%]">
      <div className="flex items-center gap-2 border-b border-[#1e2430] px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Detail
        </h2>
        <button
          onClick={onClose}
          className="ml-auto rounded p-1 text-zinc-500 hover:bg-[#1c222d] hover:text-zinc-200"
          title="Tutup panel"
          aria-label="Tutup panel detail"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {!detail ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-xs leading-relaxed text-zinc-600">
            Klik sebuah log untuk melihat detail request &amp; response body di sini.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          <div className="flex items-center gap-2">
            <MethodBadge method={detail.method} />
            <StatusBadge status={detail.status} />
            {detail.durationMs != null && (
              <span className="ml-auto text-[11px] tabular-nums text-zinc-500">
                {detail.durationMs}ms
              </span>
            )}
          </div>

          {/* URL */}
          <div className="rounded-md border border-[#1e2430] bg-[#0d1016] px-3 py-2">
            <div className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              URL
            </div>
            <div className="break-all font-mono text-[11px] leading-relaxed text-zinc-200">
              {detail.url ?? '—'}
            </div>
          </div>

          {detail.activity && (
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              ## {detail.activity}
            </div>
          )}

          <CodeBlock title="Request Body" body={detail.requestBody} />
          <CodeBlock title="Response Body" body={detail.responseBody} />
        </div>
      )}
    </aside>
  );
}
