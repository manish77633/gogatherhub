"use client";
export function QuickPicks({ options, selected, onPick }: { options: string[]; selected?: string[]; onPick: (value: string) => void }) {
  return <div className="seller-quick-picks" aria-label="Suggested options">{options.map(option => <button key={option} type="button" className={selected?.includes(option) ? "is-selected" : ""} aria-pressed={selected ? selected.includes(option) : undefined} onClick={() => onPick(option)}>{option}</button>)}</div>;
}
