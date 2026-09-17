import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, Smartphone } from 'lucide-react';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import type { ExchangeDetail, LogEntry } from '../types';
import { sanitizeActivityName } from '../utils/format';
import { DetailPanel } from './DetailPanel';

// Breakpoint mengikuti `md` Tailwind. Prop `orientation` butuh nilai JS,
// jadi tidak bisa ditentukan lewat class CSS.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia('(min-width: 768px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

interface Props {
  entries: LogEntry[];
  keywords: string[];
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  toolbarActions?: ReactNode;
}

const textMuted = 'text-slate-500';

// Agregasi baris request/response/body per exchange + activity terakhir,
// supaya panel detail bisa menampilkan request & response body.
function buildExchanges(entries: LogEntry[]): Map<number, ExchangeDetail> {
  const map = new Map<number, ExchangeDetail>();
  let lastActivity: string | null = null;

  for (const e of entries) {
    if (e.type === 'activity') {
      lastActivity = sanitizeActivityName(e.name ?? '');
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

interface ActivityGroup {
  /** `seq` event activity — key stabil untuk state collapse antar render. */
  key: number;
  /** null = request yang terjadi sebelum activity pertama terdeteksi. */
  name: string | null;
  exchanges: ExchangeDetail[];
}

// Kelompokkan exchange per activity mengikuti urutan stream. Group kosong
// tetap dibuat supaya activity tanpa request tidak jadi divider yatim.
function buildGroups(
  entries: LogEntry[],
  exchanges: Map<number, ExchangeDetail>
): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  let current: ActivityGroup | null = null;

  for (const e of entries) {
    if (e.type === 'activity') {
      current = {
        key: e.seq,
        name: sanitizeActivityName(e.name ?? ''),
        exchanges: [],
      };
      groups.push(current);
      continue;
    }
    // Hanya baris request jadi anchor — response sudah tergabung di detail.
    if (e.type !== 'request' || e.exchangeId == null) continue;
    const detail = exchanges.get(e.exchangeId);
    if (!detail) continue;
    if (!current) {
      current = { key: e.seq, name: null, exchanges: [] };
      groups.push(current);
    }
    current.exchanges.push(detail);
  }

  return groups;
}

// ── Item log: dua baris ala DevTools Network ─────────────────────────
// Baris 1: [METHOD] [status] [duration]  | Baris 2: origin (redup) + endpoint
// Pisahkan origin dari path/query supaya endpoint-nya langsung kebaca.
function splitUrl(url: string): { base: string; action: string } {
  const m = url.match(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]+)(.*)$/i);
  return m ? { base: m[1], action: m[2] } : { base: '', action: url };
}

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
  const { base, action } = splitUrl(detail.url ?? '');

  const statusText =
    status == null
      ? ''
      : status >= 200 && status < 300
        ? 'text-emerald-400'
        : status >= 300 && status < 400
          ? 'text-cyan-400'
          : status >= 400 && status < 500
            ? 'text-amber-400'
            : 'text-rose-400';

  const methodColor =
    method === 'GET'
      ? 'text-sky-400'
      : method === 'POST'
        ? 'text-emerald-400'
        : method === 'PUT'
          ? 'text-amber-400'
          : method === 'PATCH'
            ? 'text-cyan-400'
            : method === 'DELETE'
              ? 'text-rose-400'
              : 'text-slate-400';

  return (
    <button
      onClick={onSelect}
      className={`flex w-full flex-col gap-0.5 border-b border-slate-800/40 py-2 pl-6 pr-3 text-left transition-colors ${
        selected
          ? 'bg-sky-500/10 ring-1 ring-inset ring-sky-500/30'
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
      <span className="flex min-w-0 items-baseline font-mono text-[11px] leading-tight">
        {detail.url ? (
          <>
            <span className="min-w-0 truncate text-slate-500">{base}</span>
            <span className="min-w-0 flex-1 truncate text-slate-100">{action}</span>
          </>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </span>
    </button>
  );
}

// Header grup activity: badge nama class + jumlah request + chevron collapse.
function ActivityGroupHeader({
  name,
  count,
  collapsed,
  onToggle,
}: {
  name: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const empty = count === 0;
  return (
    <div className="-mx-2 my-2 flex select-none items-center gap-2 border-l-2 border-sky-500/80 bg-slate-800/60 py-2 pl-3 pr-3 text-xs">
      <Smartphone className="h-3.5 w-3.5 shrink-0 text-sky-400" />
      <span className="truncate font-mono text-xs font-semibold tracking-wide text-slate-100">
        {name}
      </span>
      <span
        className={`ml-auto shrink-0 font-mono text-[11px] tabular-nums ${
          empty ? 'text-slate-600' : 'text-slate-400'
        }`}
      >
        {count} request{count === 1 ? '' : 's'}
      </span>
      <button
        type="button"
        onClick={onToggle}
        disabled={empty}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand requests' : 'Collapse requests'}
        title={collapsed ? 'Expand requests' : 'Collapse requests'}
        className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-700/60 hover:text-slate-200 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

// Penanda untuk activity yang tidak memicu request sama sekali.
function EmptyGroupNote() {
  return (
    <div className="flex items-center gap-1.5 py-2 pl-8 font-mono text-[11px] italic text-slate-500">
      <span aria-hidden>↳</span>
      <span>No network activity captured</span>
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
    <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300">
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
          checked ? 'bg-sky-500/70' : 'bg-slate-700'
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

export function LogViewer({ entries, keywords, autoScroll, onToggleAutoScroll, toolbarActions }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = useIsDesktop();
  const [showFiltered, setShowFiltered] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

  // Simpan/pulihkan lebar panel antar reload (localStorage).
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'catdroid-panel-sizes',
    panelIds: ['traffic-list', 'details-inspector'],
  });

  const exchanges = useMemo(() => buildExchanges(entries), [entries]);

  const toggleGroup = (key: number) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Group per activity + terapkan keyword filter ke exchange-nya.
  // `count` di header selalu jumlah total request grup (bukan hasil filter),
  // jadi "0 requests" berarti activity itu memang tidak memanggil API.
  const { sections, rowCount } = useMemo(() => {
    const lower = keywords.map((k) => k.toLowerCase()).filter(Boolean);
    let rows = 0;

    const sections = buildGroups(entries, exchanges).map((group) => {
      const visible = showFiltered
        ? group.exchanges.filter((d) => {
            if (lower.length === 0) return true;
            const text = `${d.method ?? ''} ${d.url ?? ''} ${d.status ?? ''}`.toLowerCase();
            return lower.some((k) => text.includes(k));
          })
        : group.exchanges;
      const collapsed = collapsedGroups.has(group.key);

      if (group.name !== null) rows += 1;
      if (!collapsed) rows += visible.length;

      return { group, visible, collapsed };
    });

    return { sections, rowCount: rows };
  }, [entries, exchanges, keywords, showFiltered, collapsedGroups]);

  const selectedDetail = selectedId != null ? exchanges.get(selectedId) ?? null : null;

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [rowCount, autoScroll]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-800 bg-slate-800 px-3 py-1.5">
        {toolbarActions}
        <div className="flex items-center gap-4">
          <ToolbarToggle checked={autoScroll} onChange={onToggleAutoScroll} label="Auto-scroll" />
          <ToolbarToggle checked={showFiltered} onChange={() => setShowFiltered((s) => !s)} label="Filter" />
        </div>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-slate-500">
          {rowCount} entries
        </span>
      </div>

      <Group
        id="catdroid-panel-sizes"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        orientation={isDesktop ? 'horizontal' : 'vertical'}
        className="min-h-0 flex-1"
      >
        {/* Panel kiri — daftar log. Min 25%, default 50%, maks 75%. */}
        <Panel
          id="traffic-list"
          minSize="25%"
          defaultSize="50%"
          maxSize="75%"
          className="min-h-0"
        >
          <div
            ref={containerRef}
            className="h-full overflow-y-auto bg-slate-900 px-2 py-2"
          >
            {sections.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <p className="text-sm text-slate-400">Belum ada log yang terbaca.</p>
                <p className="max-w-sm text-xs leading-relaxed text-slate-500">
                  Click <span className="rounded bg-emerald-500/15 px-1 py-0.5 font-mono text-emerald-400">Play</span> untuk
                  mulai capture, lalu buka halaman di app. Request &amp; response OkHttp akan
                  muncul di sini dengan grouping per activity.
                </p>
              </div>
            ) : (
              sections.map(({ group, visible, collapsed }) => (
                <div key={group.key}>
                  {group.name !== null && (
                    <ActivityGroupHeader
                      name={group.name}
                      count={group.exchanges.length}
                      collapsed={collapsed}
                      onToggle={() => toggleGroup(group.key)}
                    />
                  )}
                  {!collapsed &&
                    (group.name !== null && group.exchanges.length === 0 ? (
                      <EmptyGroupNote />
                    ) : (
                      visible.map((detail) => (
                        <LogItem
                          key={detail.id}
                          detail={detail}
                          selected={detail.id === selectedId}
                          onSelect={() => setSelectedId(detail.id)}
                        />
                      ))
                    ))}
                </div>
              ))
            )}
          </div>
        </Panel>

        {/* Handle drag: bar 5px dengan grip 3px di tengah. */}
        <Separator
          className={`group relative z-20 flex items-center justify-center bg-slate-800 transition-colors hover:bg-sky-500/80 active:bg-sky-400 ${
            isDesktop ? 'w-[5px] cursor-col-resize' : 'h-[5px] cursor-row-resize'
          }`}
        >
          <span
            className={`rounded-full bg-slate-600 transition-colors group-hover:bg-white ${
              isDesktop ? 'h-6 w-[3px]' : 'h-[3px] w-6'
            }`}
          />
        </Separator>

        {/* Panel kanan — inspector. Min 25%, default 50%. */}
        <Panel id="details-inspector" minSize="25%" defaultSize="50%" className="min-h-0">
          <DetailPanel detail={selectedDetail} onClose={() => setSelectedId(null)} />
        </Panel>
      </Group>
    </div>
  );
}
