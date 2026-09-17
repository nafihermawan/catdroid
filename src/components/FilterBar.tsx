import { useState } from 'react';

interface Props {
  /** Keywords dipisahkan koma. Baris log hanya ditampilkan jika mengandung salah satunya. */
  keywords: string[];
  /** Callback dengan teks keyword (dipisah koma) saat user mengetik. */
  onChange: (value: string) => void;
}

export function FilterBar({ keywords, onChange }: Props) {
  const [draft, setDraft] = useState(keywords.join(', '));

  const apply = () => {
    onChange(draft);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-800 px-3 py-2">
      <label
        htmlFor="url-filter"
        className="font-mono text-xs font-medium text-slate-400"
      >
        Server / URL Filter
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:max-w-md">
        <input
          id="url-filter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply();
          }}
          placeholder="10.10.0.2:5000, api.example.com"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-slate-100 transition-colors placeholder:text-slate-600 hover:border-slate-600 focus:border-sky-500/70 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
        />
        <button
          onClick={apply}
          className="rounded-md bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-slate-700 transition-colors hover:bg-slate-600 hover:text-white"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
