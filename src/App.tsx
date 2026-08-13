import { useEffect, useMemo, useRef, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { LogViewer } from './components/LogViewer';
import { useLogcatStream } from './hooks/useLogcatStream';
import type { LogEntry } from './types';

function buildExportText(entries: LogEntry[]): string {
  const header = '## CatDroid export';
  const lines = entries.map((e) => {
    switch (e.type) {
      case 'activity':
        return `\n## ${e.name}`;
      case 'request':
        return `--> ${e.method} ${e.url}`;
      case 'response':
        return `<-- ${e.status} ${e.url}${e.durationMs != null ? ` (${e.durationMs}ms)` : ''}`;
      case 'body':
        return `BODY: ${e.body}`;
      case 'status':
        return `# ${e.message}`;
      case 'error':
        return `# ERROR: ${e.message}`;
      default:
        return '';
    }
  });
  return [header, ...lines].join('\n');
}

function ActionButton({
  onClick,
  children,
  title,
  danger,
  primary,
  disabled,
  dangerHover,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  primary?: boolean;
  disabled?: boolean;
  dangerHover?: boolean;
}) {
  const cls = primary
    ? 'bg-emerald-500 text-white hover:bg-emerald-400'
    : danger
      ? 'bg-red-500 text-white hover:bg-red-400'
      : dangerHover
        ? 'bg-transparent text-zinc-300 ring-1 ring-[#2c3542] hover:bg-red-500/10 hover:text-red-300 hover:ring-red-500/40'
        : 'bg-transparent text-zinc-300 ring-1 ring-[#2c3542] hover:bg-[#1c222d] hover:text-white';
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

export default function App() {
  const {
    entries,
    status,
    error,
    setError,
    keywordInput,
    setKeywordInput,
    start,
    stop,
    clear,
  } = useLogcatStream();

  const [autoScroll, setAutoScroll] = useState(true);
  const [clearFlash, setClearFlash] = useState(false);
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current != null) window.clearTimeout(clearTimerRef.current);
    };
  }, []);

  const handleClear = () => {
    clear();
    setClearFlash(true);
    if (clearTimerRef.current != null) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => setClearFlash(false), 500);
  };

  // Keyword filter bisa diubah dari UI (tidak hardcode di file).
  const keywords = useMemo(
    () =>
      keywordInput
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    [keywordInput]
  );

  const handleExport = () => {
    const text = buildExportText(entries);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logcat-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen flex-col bg-[#0b0e13] text-zinc-100">
      <header className="flex items-center gap-3 border-b border-[#1e2430] bg-[#12161d] px-3 py-2">
        <img src="/catdroid.png" alt="CatDroid logo" className="h-6 w-6 rounded-full object-cover" />
        <h1 className="-ml-2 text-sm font-semibold tracking-wide text-zinc-100">CatDroid</h1>
        <span
          className={`h-2 w-2 rounded-full ${
            status.running
              ? 'animate-pulse bg-red-500'
              : status.connected
                ? 'bg-emerald-500'
                : 'bg-zinc-600'
          }`}
          title={
            status.running
              ? 'capturing'
              : status.connected
                ? 'connected'
                : 'server offline'
          }
        />
        <div className="ml-auto flex items-center gap-1.5">
          <ActionButton onClick={handleExport} title="Unduh hasil log sebagai file .log">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 2.5v7m0 0 3-3m-3 3L5 6.5M3 12.5h10" />
            </svg>
          </ActionButton>
        </div>
      </header>

      <FilterBar keywords={keywords} onChange={setKeywordInput} />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 border-b border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-300"
        >
          <span className="flex-1 leading-relaxed">✕ {error}</span>
          <button
            onClick={() => setError(null)}
            className="rounded bg-red-900/50 px-2 py-0.5 text-[11px] font-medium text-red-200 ring-1 ring-red-800/60 hover:bg-red-800/60"
          >
            Dismiss
          </button>
        </div>
      )}

      <LogViewer
        entries={entries}
        keywords={keywords}
        autoScroll={autoScroll}
        onToggleAutoScroll={() => setAutoScroll((a) => !a)}
        toolbarActions={
          <div className="flex items-center gap-2">
            {!status.running ? (
              <ActionButton
                onClick={start}
                title={status.connected ? 'Mulai capture logcat' : 'Server belum terhubung'}
                primary
                disabled={!status.connected}
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M4 3v10l9-5-9-5z" />
                </svg>
              </ActionButton>
            ) : (
              <ActionButton onClick={stop} title="Hentikan capture logcat" danger>
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <rect x="3" y="3" width="10" height="10" rx="1.5" />
                </svg>
              </ActionButton>
            )}
            <ActionButton onClick={handleClear} title="Bersihkan tampilan log" danger={clearFlash} dangerHover>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9h6.6l.7-9" />
              </svg>
            </ActionButton>
          </div>
        }
      />
    </div>
  );
}
