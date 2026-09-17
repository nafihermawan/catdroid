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
      if (literal) return `<span class="text-cyan-300">${literal}</span>`;
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

/**
 * Bersihkan nama activity dari logcat sebelum ditampilkan: buang penanda
 * Markdown (`##`) serta spasi di ujung. Server sudah mengirim nama class
 * (`SPNScheduleActivity`), jadi fungsi ini murni jaring pengaman tampilan.
 */
export function sanitizeActivityName(rawTag: string): string {
  const cleanName = String(rawTag ?? '')
    .replace(/^#+\s*/, '')
    .trim();
  return cleanName || 'Unknown Activity';
}
