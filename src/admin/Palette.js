import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Keyboard-driven picker: type to filter, arrows to move, Enter to choose, Esc to close.
 * items: [{ id, label, hint?, checked? }]
 * With `onCreate`, typing a name that matches nothing offers to create it.
 * With `text`, it becomes a plain one-line input (used for the year).
 */
export default function Palette({ title, items = [], onPick, onClose, onCreate, text, initialText = '' }) {
  const [query, setQuery] = useState(text ? initialText : '');
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const matches = useMemo(() => {
    if (text) return [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    // Items whose id or label starts with the query come first ("13" -> 13-great-lent)
    const starts = [], contains = [];
    for (const it of items) {
      const label = it.label.toLowerCase(), id = String(it.id).toLowerCase();
      if (id.startsWith(q) || label.startsWith(q)) starts.push(it);
      else if (id.includes(q) || label.includes(q)) contains.push(it);
    }
    return [...starts, ...contains];
  }, [items, query, text]);

  const canCreate = !text && onCreate && query.trim() && !matches.some(m => m.label.toLowerCase() === query.trim().toLowerCase());
  const rowCount = matches.length + (canCreate ? 1 : 0);

  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => { listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' }); }, [index]);

  function onKeyDown(e) {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(rowCount - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (text) onPick(query.trim());
      else if (index < matches.length) onPick(matches[index]);
      else if (canCreate) onCreate(query.trim());
    }
  }

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-label={title} onMouseDown={e => e.stopPropagation()}>
        <div className="palette-title">{title}</div>
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={text ? 'Type, then Enter (empty clears)' : 'Type to filter…'}
        />
        {!text && (
          <ul className="palette-list" ref={listRef}>
            {matches.map((it, i) => (
              <li
                key={it.id}
                className={`palette-item${i === index ? ' active' : ''}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => onPick(it)}
              >
                {it.checked !== undefined && <span className="palette-check">{it.checked ? '✓' : ''}</span>}
                <span>{it.label}</span>
                {it.hint && <span className="palette-hint">{it.hint}</span>}
              </li>
            ))}
            {canCreate && (
              <li
                className={`palette-item${index === matches.length ? ' active' : ''}`}
                onMouseEnter={() => setIndex(matches.length)}
                onClick={() => onCreate(query.trim())}
              >
                + Create “{query.trim()}”
              </li>
            )}
            {rowCount === 0 && <li className="palette-empty">No matches</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
