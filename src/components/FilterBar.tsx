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
    <div className="flex flex-wrap items-center gap-2 border-b border-[#1e2430] bg-[#12161d] px-3 py-2">
      <label
        htmlFor="url-filter"
        className="text-xs font-medium text-zinc-400"
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
          placeholder="10.10.0.2:5000, devapi.soulparking.co.id"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-[#2c3542] bg-[#0d1016] px-2.5 py-1.5 font-mono text-xs text-zinc-100 transition-colors placeholder:text-zinc-600 hover:border-[#3d4a5c] focus:border-[#4d9fff]/70 focus:outline-none focus:ring-1 focus:ring-[#4d9fff]/30"
        />
        <button
          onClick={apply}
          className="rounded-md bg-[#1c222d] px-2.5 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-[#2c3542] transition-colors hover:bg-[#232b38] hover:text-white"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
