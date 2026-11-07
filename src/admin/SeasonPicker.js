import { useState, useRef, useEffect } from 'react';

/**
 * Typeahead season picker.
 * Props: seasons, value (season id), onChange(id), placeholder
 */
export default function SeasonPicker({ seasons, value, onChange, placeholder = 'Type to search season…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selected = seasons.find(s => s.id === value);

  const matches = query.trim()
    ? seasons.filter(s =>
        s.name_en.toLowerCase().includes(query.toLowerCase()) ||
        s.id.toLowerCase().includes(query.toLowerCase())
      )
    : seasons;

  function pick(season) {
    onChange(season.id);
    setQuery('');
    setOpen(false);
    setHighlighted(0);
  }

  function clear(e) {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      setHighlighted(0);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (matches[highlighted]) {
        e.preventDefault();
        pick(matches[highlighted]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted];
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  // Reset highlight when matches change
  useEffect(() => { setHighlighted(0); }, [query]);

  return (
    <div className="sp-root" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setOpen(false); setQuery(''); } }}>
      {!open && selected ? (
        <div className="sp-value" tabIndex={0} onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }} onFocus={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}>
          <span className="sp-value-text">{selected.name_en}</span>
          <button className="sp-clear" onClick={clear} tabIndex={-1} title="Clear">×</button>
        </div>
      ) : (
        <input
          ref={inputRef}
          className="sp-input"
          value={query}
          placeholder={selected ? selected.name_en : placeholder}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
      )}
      {open && (
        <div className="sp-dropdown" ref={listRef}>
          {matches.length === 0 && <div className="sp-no-results">No seasons match "{query}"</div>}
          {matches.map((s, i) => (
            <div
              key={s.id}
              className={`sp-option${i === highlighted ? ' highlighted' : ''}`}
              onMouseDown={() => pick(s)}
              onMouseEnter={() => setHighlighted(i)}
            >
              <span className="sp-option-name">{s.name_en}</span>
              <span className="sp-option-id">{s.id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
