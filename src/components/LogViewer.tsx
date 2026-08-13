import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExchangeDetail, LogEntry } from '../types';
import { DetailPanel } from './DetailPanel';

interface Props {
  entries: LogEntry[];
  keywords: string[];
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
}

const textSecondary = 'text-zinc-400';
const textMuted = 'text-zinc-600';

// Agregasi baris request/response/body per exchange + activity terakhir,
// supaya panel detail bisa menampilkan request & response body.
function buildExchanges(entries: LogEntry[]): Map<number, ExchangeDetail> {
  const map = new Map<number, ExchangeDetail>();
  let lastActivity: string | null = null;

  for (const e of entries) {
    if (e.type === 'activity') {
      lastActivity = e.name ?? null;
      continue;
    }
    if (e.exchangeId == null) continue;
    let d = map.get(e.exchangeId);
    if (!d) {
      d = {
        id: e.exchangeId,
        method: null,
        url: null,
        status: null,
        durationMs: null,
        activity: lastActivity,
        requestBody: null,
        responseBody: null,
      };
      map.set(e.exchangeId, d);
    }
    if (e.type === 'request') {
      d.method = e.method ?? null;
      d.url = e.url ?? null;
    } else if (e.type === 'response') {
      d.status = e.status ?? null;
      d.url = e.url ?? null;
      d.durationMs = e.durationMs ?? null;
    } else if (e.type === 'body') {
      if (!d.requestBody) d.requestBody = e.body ?? null;
      else if (!d.responseBody) d.responseBody = e.body ?? null;
    }
  }
  return map;
}

// ── Item log: dua baris ala DevTools Network ─────────────────────────
// Baris 1: [METHOD] [status] [duration]  | Baris 2: URL
function LogItem({
  detail,
  selected,
  onSelect,
}: {
  detail: ExchangeDetail;
  selected: boolean;
  onSelect: () => void;
}) {
  const method = detail.method ?? '—';
  const status = detail.status;
  const duration = detail.durationMs;

  const statusText =
    status == null
      ? ''
      : status >= 200 && status < 300
        ? 'text-emerald-400'
        : status >= 400 && status < 500
          ? 'text-orange-400'
          : status >= 500
            ? 'text-red-400'
            : 'text-zinc-400';

  const methodColor =
    method === 'GET'
      ? 'text-sky-400'
      : method === 'POST'
        ? 'text-emerald-400'
        : method === 'PUT'
          ? 'text-amber-400'
          : method === 'PATCH'
            ? 'text-orange-400'
            : method === 'DELETE'
              ? 'text-red-400'
              : 'text-zinc-400';

  return (
    <button
      onClick={onSelect}
      className={`flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors ${
        selected
          ? 'bg-[#4d9fff]/10 ring-1 ring-inset ring-[#4d9fff]/30'
          : 'hover:bg-white/[0.04]'
      }`}
    >
      <span className="flex items-center gap-2 font-mono text-[11px] leading-none">
        <span className={`w-12 shrink-0 font-semibold ${methodColor}`}>{method}</span>
        {status != null && (
          <span className={`w-8 shrink-0 text-right font-semibold tabular-nums ${statusText}`}>
            {status}
          </span>
        )}
        {duration != null && (
          <span className={`text-[10px] tabular-nums ${textMuted}`}>{duration}ms</span>
        )}
      </span>
      <span className={`truncate font-mono text-[11px] leading-tight ${textSecondary}`}>
        {detail.url ?? '—'}
      </span>
    </button>
  );
}

function ActivityHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-3 pb-1">
      <span className="rounded bg-[#4d9fff]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#9cc4ff] ring-1 ring-[#4d9fff]/20">
        ## {name}
      </span>
      <span className="h-px flex-1 bg-[#1e2430]" aria-hidden />
    </div>
  );
}

function ToolbarToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300">
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={onChange}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onChange();
          }
        }}
        className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors duration-100 ${
          checked ? 'bg-[#4d9fff]/70' : 'bg-[#2c3542]'
        }`}
      >
        <span
          className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow transition-transform duration-100 ${
            checked ? 'translate-x-3' : 'translate-x-0.5'
          }`}
        />
      </span>
      {label}
    </label>
  );
}

export function LogViewer({ entries, keywords, autoScroll, onToggleAutoScroll }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showFiltered, setShowFiltered] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const exchanges = useMemo(() => buildExchanges(entries), [entries]);

  // Bangun daftar item yang ditampilkan: activity header + exchange
  // (request dijadikan satu item bersama response-nya).
  const items = useMemo(() => {
    type Item =
      | { type: 'activity'; name: string }
      | { type: 'exchange'; detail: ExchangeDetail };
    const lower = keywords.map((k) => k.toLowerCase()).filter(Boolean);
    const result: Item[] = [];

    for (const e of entries) {
      if (e.type === 'activity') {
        result.push({ type: 'activity', name: e.name ?? '' });
        continue;
      }
      if (e.type !== 'request' && e.type !== 'response') continue;
      if (e.exchangeId == null) continue;
      const detail = exchanges.get(e.exchangeId);
      if (!detail) continue;
      // hanya tambahkan sekali per exchange (saat request)
      if (e.type === 'response') continue;

      if (!showFiltered) {
        result.push({ type: 'exchange', detail });
        continue;
      }
      const text = `${detail.method ?? ''} ${detail.url ?? ''} ${detail.status ?? ''}`.toLowerCase();
      const match = lower.length === 0 || lower.some((k) => text.includes(k));
      if (match) result.push({ type: 'exchange', detail });
    }
    return result;
  }, [entries, exchanges, keywords, showFiltered]);

  const selectedDetail = selectedId != null ? exchanges.get(selectedId) ?? null : null;

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [items.length, autoScroll]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-4 border-b border-[#1e2430] bg-[#12161d] px-3 py-1.5">
        <ToolbarToggle checked={autoScroll} onChange={onToggleAutoScroll} label="Auto-scroll" />
        <ToolbarToggle checked={showFiltered} onChange={() => setShowFiltered((s) => !s)} label="Filter" />
        <span className="ml-auto text-[11px] tabular-nums text-zinc-600">
          {items.length} entries
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Daftar log — mobile full width, desktop kiri */}
        <div
          ref={containerRef}
          className="min-h-0 flex-1 overflow-y-auto bg-[#0b0e13] px-2 py-2 md:min-w-0"
        >
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm text-zinc-400">Belum ada log yang tertangkap</p>
              <p className="max-w-sm text-xs leading-relaxed text-zinc-600">
                Tekan <span className="rounded bg-emerald-500/15 px-1 py-0.5 font-mono text-emerald-400">Start</span> untuk
                mulai capture, lalu buka halaman di app. Request &amp; response OkHttp akan
                muncul di sini dengan grouping per activity.
              </p>
            </div>
          ) : (
            items.map((item, i) =>
              item.type === 'activity' ? (
                <ActivityHeader key={`a-${i}`} name={item.name} />
              ) : (
                <LogItem
                  key={item.detail.id}
                  detail={item.detail}
                  selected={item.detail.id === selectedId}
                  onSelect={() => setSelectedId(item.detail.id)}
                />
              )
            )
          )}
        </div>

        {/* Detail — desktop kanan, mobile di bawah list */}
        <DetailPanel detail={selectedDetail} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  );
}
