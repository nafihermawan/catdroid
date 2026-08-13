import { useCallback, useEffect, useRef, useState } from 'react';
import type { LogEntry, ServerEvent } from '../types';

export interface StreamStatus {
  connected: boolean;
  running: boolean;
}

/**
 * Hubungkan ke WebSocket backend, terima event logcat, dan expose kontrol
 * start/stop/clear. Konfigurasi (adb path, app package, keyword filter)
 * diambil dari backend lalu bisa diubah via UI.
 */
export function useLogcatStream() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<StreamStatus>({
    connected: false,
    running: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<{ adbPath: string; appPackage: string } | null>(null);
  const [keywordInput, setKeywordInput] = useState(
    '10.10.0.2:5000, devapi.soulparking.co.id'
  );

  const wsRef = useRef<WebSocket | null>(null);
  const seqRef = useRef(0);
  const entriesRef = useRef<LogEntry[]>([]);

  const appendEntry = useCallback((entry: Omit<LogEntry, 'seq' | 'timestamp'>) => {
    const full: LogEntry = {
      ...entry,
      seq: ++seqRef.current,
      timestamp: Date.now(),
    };
    entriesRef.current = [...entriesRef.current, full];
    setEntries(entriesRef.current);
  }, []);

  useEffect(() => {
    let disposed = false;
    const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!disposed) setStatus((s) => ({ ...s, connected: true }));
    };

    ws.onclose = () => {
      if (!disposed) {
        setStatus({ connected: false, running: false });
        setError('Koneksi ke server terputus. Jalankan ulang server lalu refresh halaman.');
      }
    };

    ws.onmessage = (msg) => {
      if (disposed) return;
      let event: ServerEvent;
      try {
        event = JSON.parse(msg.data as string) as ServerEvent;
      } catch {
        return;
      }

      switch (event.type) {
        case 'running':
          setStatus((s) => ({ ...s, running: event.running }));
          break;
        case 'status':
          appendEntry({ type: 'status', message: event.message });
          break;
        case 'error':
          setError(event.message);
          appendEntry({ type: 'error', message: event.message });
          break;
        case 'activity':
          appendEntry({ type: 'activity', name: event.name });
          break;
        case 'request':
          appendEntry({
            type: 'request',
            exchangeId: event.id,
            method: event.method,
            url: event.url,
            message: event.message,
          });
          break;
        case 'response':
          appendEntry({
            type: 'response',
            exchangeId: event.id,
            status: event.status,
            url: event.url,
            durationMs: event.durationMs,
            message: event.message,
          });
          break;
        case 'body':
          appendEntry({ type: 'body', exchangeId: event.id, body: event.body });
          break;
        case 'stopped':
          setStatus((s) => ({ ...s, running: false }));
          break;
      }
    };

    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});

    return () => {
      disposed = true;
      ws.close();
      wsRef.current = null;
    };
  }, [appendEntry]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/start', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setError(data.error || 'Gagal memulai capture.');
      }
    } catch {
      setError('Server tidak merespons. Pastikan server backend berjalan.');
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await fetch('/api/stop', { method: 'POST' });
    } catch {
      // abaikan — status akan di-update via event stopped
    }
  }, []);

  const clear = useCallback(() => {
    entriesRef.current = [];
    setEntries([]);
  }, []);

  return {
    entries,
    status,
    error,
    setError,
    config,
    keywordInput,
    setKeywordInput,
    start,
    stop,
    clear,
  };
}
