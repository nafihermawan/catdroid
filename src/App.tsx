import { useMemo, useState } from 'react';
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
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  primary?: boolean;
  disabled?: boolean;
}) {
  const cls = primary
    ? 'bg-[#2f7fe6] text-white hover:bg-[#4d9fff]'
    : danger
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
        <h1 className="text-sm font-semibold tracking-wide text-zinc-100">CatDroid</h1>
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
          {!status.running && (
            <ActionButton
              onClick={start}
              title={status.connected ? 'Mulai capture logcat' : 'Server belum terhubung'}
              primary
              disabled={!status.connected}
            >
              Start
            </ActionButton>
          )}
          {status.running && (
            <ActionButton onClick={stop} title="Hentikan capture logcat" danger>
              Stop
            </ActionButton>
          )}
          <ActionButton onClick={clear} title="Bersihkan tampilan log">
            Clear
          </ActionButton>
          <ActionButton onClick={handleExport} title="Unduh hasil log sebagai file .log">
            Export
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
      />
    </div>
  );
}
