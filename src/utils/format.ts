// Utilitas format yang dipakai di LogViewer & DetailPanel.

// Syntax highlight JSON sederhana — warnai token tanpa dependensi.
// Mengembalikan HTML string; hanya dipakai untuk konten yang sudah
// di-escape, jadi aman dari XSS.
export function highlightJson(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc(text).replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (match, key, colon, literal) => {
      if (key) {
        return colon
          ? `<span class="text-sky-300">${key}</span>${colon}`
          : `<span class="text-emerald-300">${key}</span>`;
      }
      if (literal) return `<span class="text-orange-300">${literal}</span>`;
      return `<span class="text-amber-300">${match}</span>`;
    }
  );
}

export function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** Warna status code untuk badge/teks. */
export function statusTone(status: number | null): string {
  if (status == null) return 'text-zinc-500';
  if (status >= 200 && status < 300) return 'text-emerald-400';
  if (status >= 300 && status < 400) return 'text-sky-400';
  if (status >= 400 && status < 500) return 'text-amber-400';
  return 'text-red-400';
}
