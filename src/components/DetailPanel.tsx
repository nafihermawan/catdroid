import { useState } from 'react';
import { Check, Copy, WrapText } from 'lucide-react';
import type { ExchangeDetail } from '../types';
import { formatJson, highlightJson } from '../utils/format';
import { MethodBadge, StatusBadge } from './badges';

interface Props {
  detail: ExchangeDetail | null;
  onClose: () => void;
}

// Code block dengan judul + action bar floating (toggle Raw/Pretty + copy).
function CodeBlock({ title, body }: { title: string; body: string | null }) {
  const [copied, setCopied] = useState(false);
  // Default pretty; `raw` = string asli dari log, tanpa indentasi.
  const [raw, setRaw] = useState(false);
  if (!body) return null;
  const text = raw ? body : formatJson(body);
  const toggleLabel = raw ? 'Pretty' : 'Raw';
  const toggleHint = raw
    ? 'Switch to Formatted JSON View'
    : 'Switch to Unformatted Raw View';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // abaikan
    }
  };

  return (
    <section>
      <h3 className="px-0.5 pb-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      {/* Container relatif: action bar overlay di pojok kanan atas,
          tetap di dalam border & tidak ikut scroll konten JSON. */}
      <div className="relative">
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/80 p-1 shadow-md backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setRaw((r) => !r)}
            title={toggleHint}
            aria-label={toggleHint}
            className={`flex items-center gap-1 rounded border px-2 py-1 font-mono text-[11px] font-medium transition-colors hover:bg-slate-700/60 hover:text-white ${
              raw
                ? 'border-slate-700 bg-slate-800 text-sky-400'
                : 'border-transparent text-slate-300'
            }`}
          >
            <WrapText className="h-3.5 w-3.5" />
            {toggleLabel}
          </button>
          <button
            type="button"
            onClick={copy}
            title={copied ? 'Copied' : 'Salin body'}
            aria-label={copied ? 'Copied' : 'Salin body'}
            className="rounded p-1 text-slate-300 transition-colors hover:bg-slate-700/60 hover:text-white"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <pre className="max-h-72 overflow-auto whitespace-pre rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
          {raw ? (
            <code>{body}</code>
          ) : (
            <code dangerouslySetInnerHTML={{ __html: highlightJson(text) }} />
          )}
        </pre>
      </div>
    </section>
  );
}

export function DetailPanel({ detail, onClose }: Props) {
  return (
    <aside className="flex h-full w-full flex-col bg-slate-800">
      <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Detail
        </h2>
        <button
          onClick={onClose}
          className="ml-auto rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-200"
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
          <p className="text-xs leading-relaxed text-slate-500">
            Klik sebuah log untuk melihat detail request &amp; response body di sini.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          <div className="flex items-center gap-2">
            <MethodBadge method={detail.method} />
            <StatusBadge status={detail.status} />
            {detail.durationMs != null && (
              <span className="ml-auto font-mono text-[11px] tabular-nums text-slate-500">
                {detail.durationMs}ms
              </span>
            )}
          </div>

          {/* URL */}
          <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2">
            <div className="pb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              URL
            </div>
            <div className="break-all font-mono text-[11px] leading-relaxed text-slate-200">
              {detail.url ?? '—'}
            </div>
          </div>

          {detail.activity && (
            <div className="font-mono text-[11px] tracking-wide text-slate-500">
              {detail.activity}
            </div>
          )}

          <CodeBlock title="Request" body={detail.requestBody} />
          <CodeBlock title="Response" body={detail.responseBody} />
        </div>
      )}
    </aside>
  );
}
