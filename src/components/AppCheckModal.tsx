import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import type { AppCheckResult } from '../types';

const CHECK_KEYS = ['adb', 'device', 'installed', 'running', 'okhttp'] as const;

// Harus sama dengan durasi transisi keluar kotak modal (200ms).
const LEAVE_MS = 200;

interface Props {
  open: boolean;
  checking: boolean;
  result: AppCheckResult | null;
  error: string | null;
  /** Waktu (epoch ms) pengecekan terakhir selesai — null kalau belum pernah. */
  checkedAt: number | null;
  onRecheck: () => void;
  onClose: () => void;
}

/**
 * Modal hasil cek kompatibilitas app target. `error` (kegagalan request)
 * menang atas `result` supaya yang tampil selalu kondisi terakhir.
 */
export function AppCheckModal({
  open,
  checking,
  result,
  error,
  checkedAt,
  onRecheck,
  onClose,
}: Props) {
  // `mounted` menahan elemen di DOM selama animasi keluar; `shown` yang
  // memicu transisi masuk/keluar.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Dua rAF: pastikan frame dengan state awal sudah ter-paint sebelum
  // transisi masuk dipicu, supaya animasinya benar-benar berjalan.
  useEffect(() => {
    if (!mounted) return;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setShown(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!mounted) return null;

  const compatible = !error && result?.compatible === true;
  const banner = error
    ? {
        text: error,
        cls: 'border-amber-500 bg-amber-500/10 text-amber-300',
      }
    : result
      ? compatible
        ? {
            text: 'Semua pemeriksaan lolos!',
            cls: 'border-emerald-500 bg-emerald-500/10 text-emerald-300',
          }
        : {
            text: `Cek ${result.appPackage} belum lolos`,
            cls: 'border-amber-500 bg-amber-500/10 text-amber-300',
          }
      : null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm transition-opacity duration-150 ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-check-title"
        tabIndex={-1}
        className={`w-full max-w-lg overflow-hidden rounded-xl border border-slate-700/80 bg-[#1e293b] font-sans text-slate-200 shadow-2xl transition duration-200 focus:outline-none ${
          shown
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-2 scale-95 opacity-0'
        }`}
      >
        <div className="flex items-start gap-4 px-5 pt-5">
          <div className="min-w-0 flex-1 space-y-3">
            <h2 id="app-check-title" className="text-sm font-semibold text-slate-100">
              App Diagnostic Check
            </h2>
            {banner && (
              <p
                role="status"
                className={`rounded-r border-l-4 px-3 py-2 font-mono text-xs ${banner.cls}`}
              >
                {banner.text}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700/50 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!error && (
          <div className="space-y-3 p-5">
            {result ? (
              <>
                <ul className="space-y-3">
                  {CHECK_KEYS.map((key) => {
                    const item = result[key];
                    return (
                      <li key={key} className="flex items-start gap-2.5">
                        {item.ok ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                        )}
                        <span
                          className={`font-mono text-xs ${
                            item.ok ? 'text-slate-300' : 'font-semibold text-slate-200'
                          }`}
                        >
                          {item.message}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {result.suggestions.length > 0 && (
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-3 font-mono text-xs leading-relaxed text-slate-400">
                    <div className="flex items-center gap-1.5 font-sans text-[11px] font-medium text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Saran
                    </div>
                    {result.suggestions.map((suggestion, i) => (
                      <p key={i}>{suggestion}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-400" />
                <span className="font-mono text-xs text-slate-400">Checking…</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/50 px-5 py-3">
          <span className="font-mono text-[11px] text-slate-500">
            {checkedAt
              ? `Last checked ${new Date(checkedAt).toLocaleTimeString('en-GB')}`
              : 'Not checked yet'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRecheck}
              disabled={checking}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Re-check
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-sky-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
