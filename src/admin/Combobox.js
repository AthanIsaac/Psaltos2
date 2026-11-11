import { forwardRef, useEffect, useId, useRef, useState } from 'react';

/**
 * Text input with a dropdown of suggestions that stays in the Tab order.
 *  - Arrow keys move through the list, Enter picks the highlighted item.
 *  - With nothing highlighted, Enter is left alone so the page can save the form.
 *  - items: [{ key, primary, secondary?, badge?, strong?, data }]; `strong` items start highlighted.
 */
const Combobox = forwardRef(function Combobox(
  { value, onChange, items, onPick, placeholder, label, autoHighlight = false, openOnFocus = true, className = '', onBlurValue, ...rest },
  ref
) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1);
  const listRef = useRef(null);
  const listId = useId();

  // Start on the strongest suggestion; otherwise nothing is highlighted (or the first, for pickers)
  useEffect(() => {
    const strong = items.findIndex(i => i.strong);
    setIndex(strong >= 0 ? strong : (autoHighlight && items.length ? 0 : -1));
  }, [items, autoHighlight]);

  useEffect(() => { listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' }); }, [index]);

  const showList = open && items.length > 0;

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      if (!items.length) return;
      e.preventDefault(); e.stopPropagation();
      setOpen(true);
      setIndex(i => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      if (!items.length) return;
      e.preventDefault(); e.stopPropagation();
      setIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && showList && index >= 0 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault(); e.stopPropagation();
      setOpen(false);
      onPick(items[index]);
    } else if (e.key === 'Escape' && showList) {
      e.preventDefault(); e.stopPropagation();
      setOpen(false);
    }
    rest.onKeyDown?.(e);
  }

  return (
    <div className={`combobox ${className}`}>
      {label && <label className="field-label">{label}</label>}
      <input
        {...rest}
        ref={ref}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={e => { if (openOnFocus) setOpen(true); rest.onFocus?.(e); e.target.select?.(); }}
        onBlur={e => { setOpen(false); onBlurValue?.(e.target.value); rest.onBlur?.(e); }}
        onKeyDown={onKeyDown}
      />
      {showList && (
        // mousedown must not blur the input, or the click would land after the list closes
        <ul id={listId} className="combobox-list" ref={listRef} role="listbox" onMouseDown={e => e.preventDefault()}>
          {items.map((it, i) => (
            <li
              key={it.key}
              role="option"
              aria-selected={i === index}
              className={`combobox-item${i === index ? ' active' : ''}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => { setOpen(false); onPick(it); }}
            >
              <span className="combobox-primary">{it.primary}</span>
              {it.secondary && <span className="combobox-secondary">{it.secondary}</span>}
              {it.badge && <span className="combobox-badge">{it.badge}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default Combobox;
