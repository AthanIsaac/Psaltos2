import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LIBRARY_API } from '../config.js';
import Palette from './Palette.js';
import PreviewPlayer from './PreviewPlayer.js';
import './triage.css';

const FLAGS = [
  { id: 'junk', label: 'Junk', hint: 'not a hymn / unusable' },
  { id: 'lessons', label: 'Lessons', hint: 'instruction, explanation' },
  { id: 'tape', label: 'Tape', hint: 'unsplit, handled later' },
  { id: 'video', label: 'Video', hint: 'handled later' },
  { id: 'other', label: 'Other', hint: 'interviews, misc.' },
];

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

async function api(path, options) {
  const res = await fetch(`${LIBRARY_API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

const formatDuration = (s) => {
  if (!s) return '';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

const SHORTCUTS = [
  ['↑ ↓', 'Move between folders'],
  ['→ ←', 'Expand / collapse'],
  ['Shift + ↑ ↓', 'Select a range'],
  ['Space', 'Add / remove folder from selection'],
  ['⌘A', 'Select every visible folder'],
  ['S', 'Set season (type "13" or "kiahk")'],
  ['A', 'Accept the suggestion (shift+A: every visible suggestion)'],
  ['T', 'Toggle tags (live, instructional…)'],
  ['Y', 'Set year / period'],
  ['F', 'Flag as junk, lessons, tape, video, other'],
  ['N', 'Open this folder in the naming queue'],
  ['Delete', 'Clear season and flag'],
  ['⌘Z', 'Undo the last change'],
  ['Enter', 'Play / pause the current file'],
  ['[  ]', 'Previous / next file'],
  [',  .', 'Back / forward 10 seconds'],
  ['0 – 9', 'Jump to 0% – 90% of the file'],
  ["'", 'Change playback speed'],
  ['/', 'Filter folders by name'],
  ['?', 'Show / hide this list'],
];

export default function Triage() {
  const navigate = useNavigate();
  const [tree, setTree] = useState(null);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [expanded, setExpanded] = useState(() => new Set(JSON.parse(localStorage.getItem('triage_expanded') || '[]')));
  const [cantorFilter, setCantorFilter] = useState('all');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [palette, setPalette] = useState(null);
  const [toast, setToast] = useState(null);
  const [undoLabel, setUndoLabel] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileIdx, setFileIdx] = useState(0);
  const [playToken, setPlayToken] = useState(0);
  const [includeSub, setIncludeSub] = useState(false);

  const playerRef = useRef(null);
  const filterRef = useRef(null);
  const rowRefs = useRef(new Map());

  // ── Data ────────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const [t, u] = await Promise.all([api('/tree'), api('/undo')]);
      setTree(t);
      setUndoLabel(u.label);
      setError(null);
    } catch (e) {
      setError(`Could not reach the library API (${e.message}). Is the backend running with the new routes? Restart it and reload.`);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { localStorage.setItem('triage_expanded', JSON.stringify([...expanded])); }, [expanded]);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => setToast(null), 2500);
  }, []);

  const folderMap = useMemo(() => new Map((tree?.folders || []).map(f => [f.path, f])), [tree]);
  const seasonName = useMemo(() => Object.fromEntries((tree?.seasons || []).map(s => [s.id, s.name_en])), [tree]);
  const tagLabel = useMemo(() => Object.fromEntries((tree?.tags || []).map(t => [t.id, t.label])), [tree]);

  // ── Visible rows ────────────────────────────────────────────────────────────

  const rows = useMemo(() => {
    if (!tree) return [];
    const q = query.trim().toLowerCase();
    const matchCache = new Map();
    const hasMatch = (f) => {
      if (!q) return true;
      if (matchCache.has(f.path)) return matchCache.get(f.path);
      const m = f.name.toLowerCase().includes(q) || f.children.some(c => hasMatch(folderMap.get(c)));
      matchCache.set(f.path, m);
      return m;
    };
    const isOpen = (f) => f.total.covered < f.total.files; // still has uncovered files inside
    const out = [];
    const walk = (f, depth) => {
      if (!hasMatch(f) || (onlyOpen && !isOpen(f))) return;
      out.push({ f, depth });
      if (expanded.has(f.path) || q) {
        f.children.map(c => folderMap.get(c)).sort((a, b) => collator.compare(a.name, b.name)).forEach(c => walk(c, depth + 1));
      }
    };
    tree.folders
      .filter(f => !f.parent && (cantorFilter === 'all' || f.cantor_id === cantorFilter))
      .sort((a, b) => collator.compare(a.name, b.name))
      .forEach(f => walk(f, 0));
    return out;
  }, [tree, folderMap, expanded, query, onlyOpen, cantorFilter]);

  // Keep the cursor on a visible row
  useEffect(() => {
    if (!rows.length) return;
    if (!cursor || !rows.some(r => r.f.path === cursor)) setCursor(rows[0].f.path);
  }, [rows, cursor]);

  useEffect(() => { rowRefs.current.get(cursor)?.scrollIntoView({ block: 'nearest' }); }, [cursor]);

  const cursorIndex = rows.findIndex(r => r.f.path === cursor);
  const cursorFolder = cursor ? folderMap.get(cursor) : null;

  // ── Files for the right-hand panel ──────────────────────────────────────────

  const showSub = includeSub || (cursorFolder && cursorFolder.direct.files === 0);
  useEffect(() => {
    if (!cursor) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await api(`/files?folder=${encodeURIComponent(cursor)}&recursive=${showSub ? 1 : 0}`);
        if (!cancelled) { setFiles(data); setFileIdx(0); }
      } catch { if (!cancelled) setFiles([]); }
    }, 120);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [cursor, showSub]);

  const currentFile = files[fileIdx] || null;

  // ── Selection and movement ──────────────────────────────────────────────────

  const targets = useCallback(() => (selected.size ? [...selected] : (cursor ? [cursor] : [])), [selected, cursor]);

  const moveCursor = useCallback((delta, extend = false) => {
    if (!rows.length) return;
    const next = rows[Math.max(0, Math.min(rows.length - 1, cursorIndex + delta))].f.path;
    if (extend) {
      const from = anchor ?? cursor;
      const a = rows.findIndex(r => r.f.path === from);
      const b = rows.findIndex(r => r.f.path === next);
      setSelected(new Set(rows.slice(Math.min(a, b), Math.max(a, b) + 1).map(r => r.f.path)));
      setAnchor(from);
    } else {
      setSelected(new Set());
      setAnchor(null);
    }
    setCursor(next);
  }, [rows, cursorIndex, anchor, cursor]);

  const toggleExpand = useCallback((path, force) => {
    setExpanded(prev => {
      const next = new Set(prev);
      const open = force ?? !next.has(path);
      if (open) next.add(path); else next.delete(path);
      return next;
    });
  }, []);

  // ── Edits ───────────────────────────────────────────────────────────────────

  const apply = useCallback(async (body, { advance = true } = {}) => {
    const paths = targets();
    if (!paths.length) return;
    const advanceTo = advance && !selected.size ? rows[cursorIndex + 1]?.f.path : null;
    try {
      await api('/folders', { method: 'PUT', body: JSON.stringify({ paths, ...body }) });
      await refresh();
      showToast(`Updated ${paths.length} folder${paths.length > 1 ? 's' : ''} — ⌘Z to undo`);
      if (advanceTo) setCursor(advanceTo);
    } catch (e) { showToast(`Failed: ${e.message}`); }
  }, [targets, selected, rows, cursorIndex, refresh, showToast]);

  const undo = useCallback(async () => {
    try {
      const r = await api('/undo', { method: 'POST' });
      await refresh();
      showToast(r.label ? `Undid: ${r.label}` : 'Nothing to undo');
    } catch (e) { showToast(`Failed: ${e.message}`); }
  }, [refresh, showToast]);

  const acceptAll = useCallback(async () => {
    const paths = rows.map(r => r.f).filter(f => (!f.effective.season_id && f.suggest.season_id) || (!f.effective.flag && f.suggest.flag)).map(f => f.path);
    if (!paths.length) { showToast('No suggestions to accept'); return; }
    if (!window.confirm(`Accept suggestions for ${paths.length} folders? You can undo this with ⌘Z.`)) return;
    try {
      await api('/folders', { method: 'PUT', body: JSON.stringify({ paths, accept_suggestions: true }) });
      await refresh();
      showToast(`Accepted suggestions for ${paths.length} folders — ⌘Z to undo`);
    } catch (e) { showToast(`Failed: ${e.message}`); }
  }, [rows, refresh, showToast]);

  const openPalette = useCallback((type) => {
    if (!cursor) return;
    setPalette(type);
  }, [cursor]);

  // ── Keyboard ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e) => {
      if (palette) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key;

      if (mod && key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
      if (mod && key.toLowerCase() === 'a') { e.preventDefault(); setSelected(new Set(rows.map(r => r.f.path))); return; }
      if (mod || e.altKey) return;

      const handled = (fn) => { e.preventDefault(); fn(); };
      switch (key) {
        case 'ArrowDown': return handled(() => moveCursor(1, e.shiftKey));
        case 'ArrowUp': return handled(() => moveCursor(-1, e.shiftKey));
        case 'ArrowRight': return handled(() => cursorFolder?.children.length && toggleExpand(cursor, true));
        case 'ArrowLeft': return handled(() => {
          if (cursorFolder && expanded.has(cursor) && cursorFolder.children.length) toggleExpand(cursor, false);
          else if (cursorFolder?.parent && rows.some(r => r.f.path === cursorFolder.parent)) { setCursor(cursorFolder.parent); setSelected(new Set()); }
        });
        case ' ': return handled(() => {
          setSelected(prev => { const n = new Set(prev); if (n.has(cursor)) n.delete(cursor); else n.add(cursor); return n; });
          setAnchor(cursor);
          if (rows[cursorIndex + 1]) setCursor(rows[cursorIndex + 1].f.path); // step down, keeping the selection
        });
        case 'Escape': return handled(() => { setSelected(new Set()); setShowHelp(false); });
        case 's': return handled(() => openPalette('season'));
        case 't': return handled(() => openPalette('tags'));
        case 'y': return handled(() => openPalette('year'));
        case 'f': return handled(() => openPalette('flag'));
        case 'n': return handled(() => cursor && navigate(`/admin/naming?folder=${encodeURIComponent(cursor)}`));
        case 'a': return handled(() => apply({ accept_suggestions: true }));
        case 'A': return handled(acceptAll);
        case 'Delete':
        case 'Backspace': return handled(() => apply({ season_id: null, flag: null }));
        case 'Enter': return handled(() => playerRef.current?.toggle());
        case '[': return handled(() => { setFileIdx(i => Math.max(0, i - 1)); setPlayToken(t => t + 1); });
        case ']': return handled(() => { setFileIdx(i => Math.min(files.length - 1, i + 1)); setPlayToken(t => t + 1); });
        case ',': return handled(() => playerRef.current?.seek(-10));
        case '.': return handled(() => playerRef.current?.seek(10));
        case "'": return handled(() => playerRef.current?.cycleSpeed());
        case '/': return handled(() => filterRef.current?.focus());
        case '?': return handled(() => setShowHelp(v => !v));
        default:
          if (/^[0-9]$/.test(key)) return handled(() => playerRef.current?.seekFraction(Number(key) / 10));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [palette, rows, cursor, cursorIndex, cursorFolder, expanded, files.length, navigate, moveCursor, toggleExpand, undo, openPalette, apply, acceptAll]);

  // ── Rendering helpers ───────────────────────────────────────────────────────

  if (error) return <div className="admin-error">{error}</div>;
  if (!tree) return <p className="admin-muted">Loading…</p>;

  const roots = tree.folders.filter(f => !f.parent);
  const totalFiles = roots.reduce((n, f) => n + f.total.files, 0);
  const coveredFiles = roots.reduce((n, f) => n + f.total.covered, 0);

  const seasonChip = (f) => {
    const { effective: eff, own, suggest } = f;
    if (eff.season_id) {
      const inherited = !own.season_id;
      return (
        <span className={`chip chip-season${inherited ? ' inherited' : ''}`} title={inherited ? `Inherited from ${eff.season_from.split('/').pop()}` : 'Set on this folder'}>
          {inherited && '↳ '}{seasonName[eff.season_id]}
        </span>
      );
    }
    if (suggest.season_id && !eff.flag) {
      return <span className="chip chip-suggest" title={`Suggested from ${suggest.reason} — press A to accept`}>{seasonName[suggest.season_id]}?</span>;
    }
    return null;
  };

  const flagChip = (f) => {
    const { effective: eff, own, suggest } = f;
    if (eff.flag) return <span className={`chip chip-flag flag-${eff.flag}${own.flag ? '' : ' inherited'}`}>{own.flag ? '' : '↳ '}{eff.flag}</span>;
    if (suggest.flag) return <span className="chip chip-suggest" title="Suggested — press A to accept">{suggest.flag}?</span>;
    return null;
  };

  const paletteItems = {
    season: [{ id: '__clear', label: '— No season —', hint: 'clear' }, ...tree.seasons.map(s => ({ id: s.id, label: s.name_en, hint: s.id }))],
    flag: [{ id: '__clear', label: '— No flag —', hint: 'clear' }, ...FLAGS],
  };
  const targetFolders = targets().map(p => folderMap.get(p)).filter(Boolean);
  const tagItems = tree.tags.map(t => ({ id: t.id, label: t.label, checked: targetFolders.length > 0 && targetFolders.every(f => f.own.tags.includes(t.id)) }));

  return (
    <div className="triage">
      <header className="triage-bar">
        <div className="triage-progress" title="Files whose folder has a season or flag">
          <div className="triage-progress-fill" style={{ width: `${totalFiles ? (coveredFiles / totalFiles) * 100 : 0}%` }} />
          <span>{coveredFiles.toLocaleString()} / {totalFiles.toLocaleString()} files covered</span>
        </div>
        <div className="triage-filters">
          <button className={`pill${cantorFilter === 'all' ? ' active' : ''}`} onClick={() => setCantorFilter('all')}>All cantors</button>
          {tree.cantors.map(c => (
            <button key={c.id} className={`pill${cantorFilter === c.id ? ' active' : ''}`} onClick={() => setCantorFilter(c.id)}>{c.display_name}</button>
          ))}
          <label className="pill-check"><input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} /> Only unfinished</label>
          <input ref={filterRef} className="triage-search" placeholder="Filter folders ( / )" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="triage-actions">
          <button className="btn" onClick={acceptAll} title="Shift+A">Accept all suggestions</button>
          <button className="btn" onClick={undo} disabled={!undoLabel} title={undoLabel ? `Undo: ${undoLabel}` : 'Nothing to undo'}>Undo</button>
          <button className="btn" onClick={() => setShowHelp(v => !v)}>Keys ?</button>
        </div>
      </header>

      <div className="triage-body">
        <section className="triage-tree" aria-label="Folders">
          <div className="tree-head">
            <span>Folder</span><span>Files</span><span>Season</span><span>Year</span><span>Tags</span><span>Flag</span>
          </div>
          <div className="tree-rows">
            {rows.map(({ f, depth }) => {
              const isCursor = f.path === cursor;
              const isSelected = selected.has(f.path);
              const done = f.total.files > 0 && f.total.covered === f.total.files;
              const eff = f.effective;
              return (
                <div
                  key={f.path}
                  ref={el => { if (el) rowRefs.current.set(f.path, el); else rowRefs.current.delete(f.path); }}
                  className={`tree-row${isCursor ? ' cursor' : ''}${isSelected ? ' selected' : ''}${done ? ' done' : ''}`}
                  onClick={(e) => {
                    if (e.shiftKey && cursor) {
                      const a = rows.findIndex(r => r.f.path === (anchor ?? cursor)), b = rows.findIndex(r => r.f.path === f.path);
                      setAnchor(anchor ?? cursor);
                      setSelected(new Set(rows.slice(Math.min(a, b), Math.max(a, b) + 1).map(r => r.f.path)));
                    } else if (e.metaKey || e.ctrlKey) {
                      setSelected(prev => { const n = new Set(prev); n.has(f.path) ? n.delete(f.path) : n.add(f.path); return n; });
                    } else { setSelected(new Set()); setAnchor(null); }
                    setCursor(f.path);
                  }}
                  onDoubleClick={() => f.children.length && toggleExpand(f.path)}
                >
                  <span className="tree-name" style={{ paddingLeft: depth * 16 }}>
                    <button
                      className="disclosure"
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); toggleExpand(f.path); }}
                      style={{ visibility: f.children.length ? 'visible' : 'hidden' }}
                      aria-label={expanded.has(f.path) ? 'Collapse' : 'Expand'}
                    >{expanded.has(f.path) || query ? '▾' : '▸'}</button>
                    <span className="tree-label" title={f.path}>{f.name}</span>
                  </span>
                  <span className="tree-count">
                    {f.total.files}
                    {f.total.covered > 0 && f.total.covered < f.total.files && <small> ({f.total.covered} done)</small>}
                    {f.total.unreadable > 0 && <span className="badge badge-bad" title="Unreadable files">{f.total.unreadable}!</span>}
                  </span>
                  <span>{seasonChip(f)}</span>
                  <span className="tree-year">{eff.year_text && <span className={f.own.year_text ? '' : 'muted'}>{eff.year_text}</span>}</span>
                  <span className="tree-tags">
                    {eff.tags.map(t => <span key={t} className={`chip chip-tag${f.own.tags.includes(t) ? '' : ' inherited'}`}>{tagLabel[t] || t}</span>)}
                  </span>
                  <span>{flagChip(f)}</span>
                </div>
              );
            })}
            {!rows.length && <p className="admin-muted" style={{ padding: 16 }}>No folders match.</p>}
          </div>
        </section>

        <aside className="triage-side">
          {cursorFolder && (
            <>
              <div className="side-folder">
                <div className="side-folder-name">{cursorFolder.name}</div>
                <div className="side-path" title={cursorFolder.path}>{cursorFolder.path}</div>
                <div className="side-meta">
                  {cursorFolder.direct.files} here · {cursorFolder.total.files} in total
                  {cursorFolder.suggest.season_id && !cursorFolder.effective.season_id && (
                    <> · suggested: <b>{seasonName[cursorFolder.suggest.season_id]}</b> ({cursorFolder.suggest.reason})</>
                  )}
                </div>
              </div>

              <PreviewPlayer ref={playerRef} file={currentFile} autoPlayToken={playToken} />

              {currentFile && (
                <div className="file-detail">
                  <div className="file-path" title={currentFile.original_path}>{currentFile.original_path}</div>
                  <div className="file-detail-actions">
                    <button className="btn-small" onClick={() => navigator.clipboard.writeText(currentFile.original_path).then(() => showToast('Path copied'))}>Copy path</button>
                    <button className="btn-small" onClick={() => api(`/reveal/${currentFile.id}`, { method: 'POST' }).catch(() => showToast('Could not reveal file'))}>Reveal in Finder</button>
                  </div>
                  {(currentFile.hint_coptic_name || currentFile.hint_notes) && (
                    <div className="file-hints">Earlier Coptic name: {currentFile.hint_coptic_name} {currentFile.hint_notes && `— ${currentFile.hint_notes}`}</div>
                  )}
                </div>
              )}

              <div className="file-list-head">
                <span>{files.length} file{files.length === 1 ? '' : 's'}{files.length >= 1000 ? '+' : ''}</span>
                {cursorFolder.direct.files > 0 && cursorFolder.total.files > cursorFolder.direct.files && (
                  <label className="pill-check"><input type="checkbox" checked={includeSub} onChange={e => setIncludeSub(e.target.checked)} /> include subfolders</label>
                )}
              </div>
              <ul className="file-list">
                {files.map((file, i) => (
                  <li
                    key={file.id}
                    className={`file-row${i === fileIdx ? ' current' : ''}${!file.preview_ok ? ' bad' : ''}`}
                    onClick={() => { setFileIdx(i); setPlayToken(t => t + 1); }}
                  >
                    <span className="file-name" title={file.rel_path}>{file.filename}</span>
                    <span className="file-dur">{formatDuration(file.duration_s)}</span>
                    <span className="file-ext">{file.ext.replace('.', '')}</span>
                    {file.status === 'tape' && <span className="badge">tape</span>}
                    {file.kind === 'video' && <span className="badge">video</span>}
                    {!file.preview_ok && <span className="badge badge-bad">unreadable</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>

      {toast && <div className="triage-toast" role="status">{toast}</div>}

      {showHelp && (
        <div className="palette-backdrop" onMouseDown={() => setShowHelp(false)}>
          <div className="palette help" onMouseDown={e => e.stopPropagation()}>
            <div className="palette-title">Keyboard shortcuts</div>
            <table><tbody>{SHORTCUTS.map(([k, d]) => <tr key={k}><td><kbd>{k}</kbd></td><td>{d}</td></tr>)}</tbody></table>
          </div>
        </div>
      )}

      {palette === 'season' && (
        <Palette
          title={`Season for ${targets().length} folder${targets().length > 1 ? 's' : ''}`}
          items={paletteItems.season}
          onClose={() => setPalette(null)}
          onPick={(it) => { setPalette(null); apply({ season_id: it.id === '__clear' ? null : it.id }); }}
        />
      )}
      {palette === 'flag' && (
        <Palette
          title="Flag"
          items={paletteItems.flag}
          onClose={() => setPalette(null)}
          onPick={(it) => { setPalette(null); apply({ flag: it.id === '__clear' ? null : it.id }); }}
        />
      )}
      {palette === 'tags' && (
        <Palette
          title="Tags — Enter toggles"
          items={tagItems}
          onClose={() => setPalette(null)}
          onPick={(it) => { setPalette(null); apply(it.checked ? { remove_tags: [it.id] } : { add_tags: [it.id] }, { advance: false }); }}
          onCreate={async (label) => {
            try {
              const tag = await api('/tags', { method: 'POST', body: JSON.stringify({ label }) });
              setPalette(null);
              await apply({ add_tags: [tag.id] }, { advance: false });
            } catch (e) { showToast(`Failed: ${e.message}`); }
          }}
        />
      )}
      {palette === 'year' && (
        <Palette
          text
          title="Year or period (e.g. 1985, 1980s, 2000s)"
          initialText={cursorFolder?.own.year_text || ''}
          onClose={() => setPalette(null)}
          onPick={(value) => { setPalette(null); apply({ year_text: value }); }}
        />
      )}
    </div>
  );
}
