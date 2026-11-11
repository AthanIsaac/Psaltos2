import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Combobox from './Combobox.js';
import Palette from './Palette.js';
import PreviewPlayer from './PreviewPlayer.js';
import { api, post, put, formatDuration } from './libraryApi.js';
import './triage.css';
import './naming.css';

const ROW_H = 34;
const EMPTY_FORM = {
  english_title: '', coptic_name: '', coptic_title: '', english_name: '', hymn_id: null,
  season_id: '', year_text: '', version_label: '', context_note: '', notes: '', tags: [],
};

const SHORTCUTS = [
  ['Typing a title', 'Pick a suggestion with ↓ and Enter; it fills both names'],
  ['Enter', 'Save this file and go to the next one'],
  ['⌘Enter', 'Save and stay on this file'],
  ['Tab', 'Next field (English title → Coptic name → Season → …)'],
  ['Alt + ↓ ↑', 'Next / previous file without saving'],
  ['Alt + D', 'Same hymn and version as the file above'],
  ['Alt + Enter', 'Use the title guessed from the file name'],
  ['Alt + A', 'Apply the saved hymn to the similar files offered'],
  ['Alt + P', 'Play / pause   (Alt + ← → seeks 10 s)'],
  ['Esc', 'Leave the form and use the list keys below'],
  ['↑ ↓', 'Move between files (audio plays automatically)'],
  ['Shift + ↑ ↓  /  X', 'Select several files for a bulk change'],
  ['Enter / E', 'Edit the current file'],
  ['S', 'Jump to the season field'],
  ['D', 'Same hymn and version as the file above'],
  ['G', 'Go to a folder'],
  ['/', 'Filter by file name'],
  ['Space', 'Play / pause   ( , and . seek 10 s;  0–9 jump;  \' speed )'],
  ['⌘K', 'Mark as junk, skip, tape, multi-hymn…'],
  ['⌘Z', 'Undo the last change'],
  ['R', 'Reload the list'],
];

const norm = (s) => (s || '').normalize('NFC').toLowerCase();

const statusLabel = { todo: 'Not named', review: 'Needs review', done: 'Done', junk: 'Junk', skipped: 'Skipped', tape: 'Tape', multi: 'Multi-hymn', video: 'Video' };

function formFromRecording(r) {
  if (!r) return EMPTY_FORM;
  return {
    english_title: r.english_title || '', coptic_name: r.coptic_name || '', coptic_title: r.coptic_title || '',
    english_name: r.english_name || '', hymn_id: r.hymn_id || null,
    season_id: r.season || '', year_text: r.year_text || '', version_label: r.version_label || '',
    context_note: r.context_note || '', notes: r.notes || '', tags: r.tags || [],
  };
}

export default function Naming() {
  const [params] = useSearchParams();
  const [tree, setTree] = useState(null);
  const [hymnData, setHymnData] = useState({ hymns: [], seeds: [] });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [folder, setFolder] = useState(params.get('folder') || localStorage.getItem('naming_folder') || '');
  const [cantor, setCantor] = useState('');
  const [statusPill, setStatusPill] = useState('open');
  const [needsSeason, setNeedsSeason] = useState(false);
  const [text, setText] = useState('');
  const [autoplay, setAutoplay] = useState(() => localStorage.getItem('naming_autoplay') !== '0');
  const [cursor, setCursor] = useState(0);
  const [selection, setSelection] = useState(() => new Set());
  const [form, setForm] = useState(EMPTY_FORM);
  const [suggestions, setSuggestions] = useState([]);
  const [saved, setSaved] = useState(null);
  const [palette, setPalette] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [toast, setToast] = useState(null);
  const [playToken, setPlayToken] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [undoLabel, setUndoLabel] = useState(null);
  const [bulk, setBulk] = useState({ hymn: null, hymnText: '', season_id: '', year_text: '', version_label: '' });

  const playerRef = useRef(null);
  const listRef = useRef(null);
  const filterRef = useRef(null);
  const titleRef = useRef(null);
  const copticRef = useRef(null);
  const seasonRef = useRef(null);
  const inputModeRef = useRef(false);
  // Which rows each filter shows is decided when you pick the filter or reload, not on every save,
  // so a saved row stays where it is and "next" always means the next row.
  const [snapshot, setSnapshot] = useState(() => new Map());
  const takeSnapshot = useCallback((list) => setSnapshot(new Map(list.map(r => [r.id, { status: r.status, needs: r.needs_season }]))), []);
  const savingRef = useRef(false);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => setToast(null), 2600);
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────

  const loadHymns = useCallback(() => api('/hymns').then(setHymnData).catch(() => {}), []);
  const loadUndo = useCallback(() => api('/undo').then(u => setUndoLabel(u.label)).catch(() => {}), []);

  useEffect(() => {
    api('/tree').then(setTree).catch(e => setError(`Could not reach the library API (${e.message}). Restart the backend and reload.`));
    loadHymns();
    loadUndo();
  }, [loadHymns, loadUndo]);

  useEffect(() => { localStorage.setItem('naming_folder', folder); }, [folder]);
  useEffect(() => { localStorage.setItem('naming_autoplay', autoplay ? '1' : '0'); }, [autoplay]);

  const reload = useCallback(async (keepId) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ status: statusPill === 'flagged' ? 'flagged' : 'active' });
      if (folder) q.set('folder', folder);
      if (cantor) q.set('cantor', cantor);
      const data = await api(`/queue?${q}`);
      takeSnapshot(data.recordings);
      setRows(data.recordings);
      setSelection(new Set());
      setCursor(prev => {
        if (keepId) { const i = data.recordings.findIndex(r => r.id === keepId); if (i >= 0) return i; }
        return Math.min(prev, Math.max(0, data.recordings.length - 1));
      });
      setError(null);
    } catch (e) { setError(`Could not load the queue (${e.message}).`); }
    setLoading(false);
  }, [folder, cantor, statusPill === 'flagged', takeSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { reload(); }, [reload]);

  // ── Derived lists ───────────────────────────────────────────────────────────

  const visible = useMemo(() => {
    const t = norm(text);
    return rows.filter(r => {
      const was = snapshot.get(r.id) || { status: r.status, needs: r.needs_season };
      if (t && !norm(r.filename).includes(t)) return false;
      if (needsSeason && !was.needs) return false;
      switch (statusPill) {
        case 'open': return was.status === 'todo' || was.status === 'review';
        case 'review': return was.status === 'review';
        case 'done': return was.status === 'done';
        default: return true;
      }
    });
  }, [rows, snapshot, text, needsSeason, statusPill]);

  const progress = useMemo(() => {
    const active = rows.filter(r => ['todo', 'review', 'done'].includes(r.status));
    return { done: active.filter(r => r.status === 'done').length, total: active.length, review: active.filter(r => r.status === 'review').length };
  }, [rows]);

  const current = visible[Math.min(cursor, visible.length - 1)] || null;
  const currentIndex = current ? visible.indexOf(current) : -1;
  const seasons = useMemo(() => tree?.seasons || [], [tree]);
  const seasonById = useMemo(() => Object.fromEntries(seasons.map(s => [s.id, s])), [seasons]);

  // ── Current file: form, suggestions ─────────────────────────────────────────

  useEffect(() => {
    setForm(formFromRecording(current));
    setSuggestions([]);
    if (!current) return;
    let cancelled = false;
    api(`/suggest?id=${current.id}`).then(s => { if (!cancelled) setSuggestions(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!current) return;
    if (autoplay) setPlayToken(t => t + 1);
    if (inputModeRef.current) setTimeout(() => titleRef.current?.focus(), 0);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the cursor row on screen
  useEffect(() => {
    const el = listRef.current;
    if (!el || currentIndex < 0) return;
    const top = currentIndex * ROW_H;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_H - el.clientHeight;
  }, [currentIndex]);

  const setField = (patch) => setForm(f => ({ ...f, ...patch }));

  // ── Autocomplete sources ────────────────────────────────────────────────────

  const hymnItem = useCallback((h, extra = {}) => ({
    key: `h${h.id}`,
    primary: h.english_title || h.english_name || h.coptic_name,
    secondary: [h.english_title ? h.coptic_name : '', h.coptic_title].filter(Boolean).join(' · '),
    badge: [extra.reason, h.count ? `×${h.count}` : ''].filter(Boolean).join('  '),
    strong: !!extra.strong,
    data: { hymn: h },
  }), []);

  const suggestionItems = useMemo(() => suggestions.map(h =>
    hymnItem(h, { reason: h.reasons[0], strong: h.reasons[0]?.includes('same name') })), [suggestions, hymnItem]);

  const englishItems = useMemo(() => {
    const q = norm(form.english_title).trim();
    if (!q) return suggestionItems;
    const scored = [];
    for (const h of hymnData.hymns) {
      const fields = [h.english_title, h.english_name, h.coptic_title].map(norm);
      const hit = fields.findIndex(f => f.includes(q));
      if (hit >= 0) scored.push([fields[hit].startsWith(q) ? 0 : 1, h]);
    }
    return scored.sort((a, b) => a[0] - b[0] || b[1].count - a[1].count).slice(0, 8).map(([, h]) => hymnItem(h));
  }, [form.english_title, hymnData.hymns, suggestionItems, hymnItem]);

  const copticItems = useMemo(() => {
    const q = norm(form.coptic_name).trim();
    if (!q) {
      const fromHints = current?.hint_coptic_name ? [{ key: 'hint', primary: current.hint_coptic_name, badge: 'earlier', data: { seed: current.hint_coptic_name } }] : [];
      return [...suggestionItems.filter(i => i.data.hymn.coptic_name), ...fromHints];
    }
    const items = [];
    const seen = new Set();
    for (const h of hymnData.hymns) {
      if (h.coptic_name && norm(h.coptic_name).includes(q)) { items.push(hymnItem(h)); seen.add(h.coptic_name); }
    }
    for (const s of hymnData.seeds) {
      if (s.field === 'coptic_name' && !seen.has(s.text) && norm(s.text).includes(q)) { items.push({ key: `s${s.text}`, primary: s.text, badge: 'seen before', data: { seed: s.text } }); seen.add(s.text); }
    }
    return items.slice(0, 8);
  }, [form.coptic_name, hymnData, suggestionItems, hymnItem, current?.hint_coptic_name]);

  const pickHymn = useCallback((item, from) => {
    if (item.data.hymn) {
      const h = item.data.hymn;
      setField({ hymn_id: h.id, english_title: h.english_title, coptic_name: h.coptic_name, coptic_title: h.coptic_title, english_name: h.english_name });
    } else if (item.data.seed) {
      setField({ coptic_name: item.data.seed });
    }
    // Move on to whatever is still missing; if nothing is, stay put so Enter saves
    setTimeout(() => {
      const hymn = item.data.hymn;
      if (from === 'english' && !(hymn?.coptic_name)) copticRef.current?.focus();
      else if (!form.season_id || seasonById[form.season_id]?.is_catchall) seasonRef.current?.focus();
    }, 0);
  }, [form.season_id, seasonById]);

  // ── Saving and moving ───────────────────────────────────────────────────────

  const patchRow = useCallback((updated) => setRows(prev => prev.map(r => (r.id === updated.id ? updated : r))), []);

  const move = useCallback((delta, extend = false) => {
    if (!visible.length) return;
    const next = Math.max(0, Math.min(visible.length - 1, currentIndex + delta));
    if (extend) {
      setSelection(prev => {
        const n = new Set(prev.size ? prev : [visible[currentIndex].id]);
        n.add(visible[next].id);
        return n;
      });
    } else setSelection(new Set());
    setCursor(next);
  }, [visible, currentIndex]);

  const commit = useCallback(async ({ advance = true } = {}) => {
    if (!current || savingRef.current) return;
    savingRef.current = true;
    try {
      const r = await put(`/recordings/${current.id}`, form);
      patchRow(r.recording);
      loadHymns();
      loadUndo();
      // Offer the same hymn to unnamed files that share this one's file name
      if (r.hymn_id) {
        api(`/similar?id=${current.id}`).then(sim => {
          setSaved(sim.length ? { title: form.english_title || form.coptic_name, hymnId: r.hymn_id, items: sim, checked: new Set(sim.map(s => s.id)) } : null);
        }).catch(() => setSaved(null));
      } else setSaved(null);
      if (advance) move(1);
      else setForm(formFromRecording(r.recording));
    } catch (e) { showToast(`Could not save: ${e.message}`); }
    savingRef.current = false;
  }, [current, form, patchRow, loadHymns, loadUndo, move, showToast]);

  const applySaved = useCallback(async () => {
    if (!saved) return;
    const ids = saved.items.filter(i => saved.checked.has(i.id)).map(i => i.id);
    if (!ids.length) return;
    try {
      await post('/recordings/bulk', { ids, hymn_id: saved.hymnId });
      const hymn = hymnData.hymns.find(h => h.id === saved.hymnId);
      setRows(prev => prev.map(r => (ids.includes(r.id) ? { ...r, status: 'review', hymn_id: saved.hymnId, english_title: hymn?.english_title, coptic_name: hymn?.coptic_name, coptic_title: hymn?.coptic_title, english_name: hymn?.english_name } : r)));
      showToast(`Applied “${saved.title}” to ${ids.length} files — they need review`);
      setSaved(null);
      loadHymns();
      loadUndo();
    } catch (e) { showToast(`Failed: ${e.message}`); }
  }, [saved, hymnData.hymns, loadHymns, loadUndo, showToast]);

  const setStatus = useCallback(async (status) => {
    if (!current) return;
    try {
      const r = await post(`/recordings/${current.id}/status`, { status });
      patchRow(r.recording);
      loadUndo();
      showToast(status === 'todo' ? 'Returned to the queue' : `Marked ${status}`);
      if (status !== 'todo') move(1);
    } catch (e) { showToast(`Failed: ${e.message}`); }
  }, [current, patchRow, loadUndo, move, showToast]);

  const undo = useCallback(async () => {
    try {
      const r = await post('/undo');
      showToast(r.label ? `Undid: ${r.label}` : 'Nothing to undo');
      await Promise.all([reload(current?.id), loadHymns(), loadUndo()]);
    } catch (e) { showToast(`Failed: ${e.message}`); }
  }, [reload, current, loadHymns, loadUndo, showToast]);

  const ditto = useCallback(() => {
    const prev = visible[currentIndex - 1];
    if (!prev || !prev.hymn_id) { showToast('The file above has no hymn yet'); return; }
    setField({ hymn_id: prev.hymn_id, english_title: prev.english_title || '', coptic_name: prev.coptic_name || '', coptic_title: prev.coptic_title || '', english_name: prev.english_name || '', version_label: prev.version_label || form.version_label });
  }, [visible, currentIndex, form.version_label, showToast]);

  const applyBulk = useCallback(async () => {
    const ids = [...selection];
    const body = { ids };
    if (bulk.hymn) body.hymn_id = bulk.hymn.id;
    if (bulk.season_id) body.season_id = bulk.season_id;
    if (bulk.year_text) body.year_text = bulk.year_text;
    if (bulk.version_label) body.version_label = bulk.version_label;
    if (Object.keys(body).length === 1) return;
    try {
      await post('/recordings/bulk', body);
      setBulk({ hymn: null, hymnText: '', season_id: '', year_text: '', version_label: '' });
      await Promise.all([reload(current?.id), loadUndo()]);
      showToast(`Updated ${ids.length} files — they need review`);
    } catch (e) { showToast(`Failed: ${e.message}`); }
  }, [selection, bulk, reload, current, loadUndo, showToast]);

  // ── Keyboard ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e) => {
      if (palette || e.defaultPrevented) return;
      const target = e.target;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key;
      const stop = () => e.preventDefault();

      if (mod && key.toLowerCase() === 'k') { stop(); setPalette('actions'); return; }
      if (mod && key.toLowerCase() === 'z' && !typing) { stop(); undo(); return; }

      if (typing) {
        inputModeRef.current = target.closest('.editor') !== null;
        if (key === 'Escape') { target.blur(); inputModeRef.current = false; return; }
        if (!target.closest('.editor')) return; // the filter box and other inputs handle their own keys
        if (mod && key === 'Enter') { stop(); commit({ advance: false }); return; }
        if (key === 'Enter' && !e.altKey && !e.shiftKey && target.tagName !== 'TEXTAREA') { stop(); commit(); return; }
        if (e.altKey) {
          if (key === 'ArrowDown') { stop(); move(1); }
          else if (key === 'ArrowUp') { stop(); move(-1); }
          else if (key === 'ArrowLeft') { stop(); playerRef.current?.seek(-10); }
          else if (key === 'ArrowRight') { stop(); playerRef.current?.seek(10); }
          else if (key.toLowerCase() === 'd' || key === '∂') { stop(); ditto(); }
          else if (key.toLowerCase() === 'a' || key === 'å') { stop(); applySaved(); }
          else if (key.toLowerCase() === 'p' || key === 'π') { stop(); playerRef.current?.toggle(); }
          else if (key === 'Enter') { stop(); if (current) setField({ english_title: current.suggested_title }); }
        }
        return;
      }

      if (mod || e.altKey) return;
      switch (key) {
        case 'ArrowDown': stop(); move(1, e.shiftKey); break;
        case 'ArrowUp': stop(); move(-1, e.shiftKey); break;
        case 'x': stop(); if (current) setSelection(prev => { const n = new Set(prev); n.has(current.id) ? n.delete(current.id) : n.add(current.id); return n; }); break;
        case 'Escape': setSelection(new Set()); setShowHelp(false); break;
        case 'Enter': case 'e': stop(); inputModeRef.current = true; titleRef.current?.focus(); break;
        case 's': stop(); inputModeRef.current = true; seasonRef.current?.focus(); break;
        case 'd': stop(); ditto(); break;
        case 'g': stop(); setPalette('folder'); break;
        case '/': stop(); filterRef.current?.focus(); break;
        case 'r': stop(); reload(current?.id); break;
        case ' ': stop(); playerRef.current?.toggle(); break;
        case ',': stop(); playerRef.current?.seek(-10); break;
        case '.': stop(); playerRef.current?.seek(10); break;
        case "'": stop(); playerRef.current?.cycleSpeed(); break;
        case '?': stop(); setShowHelp(v => !v); break;
        default: if (/^[0-9]$/.test(key)) { stop(); playerRef.current?.seekFraction(Number(key) / 10); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [palette, commit, move, ditto, applySaved, undo, reload, current]);

  // ── Windowed list ───────────────────────────────────────────────────────────

  const [viewHeight, setViewHeight] = useState(600);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => setViewHeight(el.clientHeight);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [tree]);

  if (error) return <div className="admin-error">{error}</div>;
  if (!tree) return <p className="admin-muted">Loading…</p>;

  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 8);
  const end = Math.min(visible.length, Math.ceil((scrollTop + viewHeight) / ROW_H) + 8);
  const folderName = folder ? folder.split('/').pop() : 'All folders';
  const multi = selection.size > 1;
  const missing = [!form.english_title.trim() && 'English title', !form.coptic_name.trim() && 'Coptic name', (!form.season_id || seasonById[form.season_id]?.is_catchall) && 'a real season'].filter(Boolean);
  const pillCount = (p) => ({
    open: rows.filter(r => r.status === 'todo' || r.status === 'review').length,
    review: progress.review,
    done: progress.done,
    all: progress.total,
  }[p]);

  const seasonItemsFor = (query) => {
    const q = norm(query).trim();
    return seasons
      .filter(s => !q || norm(s.id).startsWith(q) || norm(s.name_en).includes(q))
      .map(s => ({ key: s.id, primary: s.name_en, badge: s.is_catchall ? 'needs real season' : s.id, data: { season: s } }));
  };

  return (
    <div className="naming">
      <header className="naming-bar">
        <button className="btn" onClick={() => setPalette('folder')} title="G">📁 {folderName}</button>
        <div className="naming-pills">
          {['open', 'review', 'done', 'all'].map(p => (
            <button key={p} className={`pill${statusPill === p ? ' active' : ''}`} onClick={() => { takeSnapshot(rows); setStatusPill(p); setCursor(0); }}>
              {{ open: 'To do', review: 'Needs review', done: 'Done', all: 'All' }[p]} {pillCount(p) ?? ''}
            </button>
          ))}
          <button className={`pill${statusPill === 'flagged' ? ' active' : ''}`} onClick={() => { setStatusPill('flagged'); setCursor(0); }}>Flagged</button>
        </div>
        <select value={cantor} onChange={e => setCantor(e.target.value)} aria-label="Cantor">
          <option value="">All cantors</option>
          {tree.cantors.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
        </select>
        <label className="pill-check"><input type="checkbox" checked={needsSeason} onChange={e => { takeSnapshot(rows); setNeedsSeason(e.target.checked); setCursor(0); }} /> Needs a season</label>
        <label className="pill-check"><input type="checkbox" checked={autoplay} onChange={e => setAutoplay(e.target.checked)} /> Autoplay</label>
        <input ref={filterRef} className="triage-search" placeholder="Filter by file name ( / )" value={text} onChange={e => setText(e.target.value)} />
        <div className="naming-progress" title="Confirmed files in this folder">
          <div style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          <span>{progress.done} / {progress.total} done{progress.review ? ` · ${progress.review} to review` : ''}</span>
        </div>
        <button className="btn" onClick={undo} disabled={!undoLabel} title={undoLabel ? `Undo: ${undoLabel}` : ''}>Undo</button>
        <button className="btn" onClick={() => setShowHelp(true)}>Keys ?</button>
      </header>

      <div className="naming-body">
        <section className="naming-list" aria-label="Files">
          <div className="naming-list-head">
            <span></span><span>File</span><span>Time</span><span>Hymn</span><span>Season</span>
          </div>
          <div className="naming-rows" ref={listRef} onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
            <div style={{ height: visible.length * ROW_H, position: 'relative' }}>
              {visible.slice(start, end).map((r, i) => {
                const index = start + i;
                const season = r.season && seasonById[r.season];
                return (
                  <div
                    key={r.id}
                    className={`naming-row${index === currentIndex ? ' current' : ''}${selection.has(r.id) ? ' selected' : ''}`}
                    style={{ top: index * ROW_H, height: ROW_H }}
                    onClick={(e) => {
                      if (e.shiftKey && current) {
                        const a = Math.min(currentIndex, index), b = Math.max(currentIndex, index);
                        setSelection(new Set(visible.slice(a, b + 1).map(x => x.id)));
                      } else if (e.metaKey || e.ctrlKey) {
                        setSelection(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; });
                      } else setSelection(new Set());
                      setCursor(index);
                    }}
                  >
                    <span className={`status-dot status-${r.status}`} title={statusLabel[r.status]} />
                    <span className="naming-file" title={r.rel_path}>
                      {r.filename}
                      {!r.preview_ok && <span className="badge badge-bad">unreadable</span>}
                    </span>
                    <span className="naming-dur">{formatDuration(r.duration_s)}</span>
                    <span className="naming-hymn">
                      {r.english_title || r.coptic_name || <i className="muted">{r.suggested_title}</i>}
                      {r.version_label && <span className="chip chip-tag">{r.version_label}</span>}
                    </span>
                    <span>{season ? <span className={`chip ${season.is_catchall ? 'chip-warn' : 'chip-season'}`}>{season.name_en}</span> : <span className="chip chip-warn">no season</span>}</span>
                  </div>
                );
              })}
            </div>
            {!visible.length && <p className="admin-muted" style={{ padding: 16 }}>{loading ? 'Loading…' : 'Nothing here. Try another folder or filter.'}</p>}
          </div>
        </section>

        <aside className="editor" aria-label="Editor">
          {current && !multi && (
            <>
              <PreviewPlayer ref={playerRef} file={current} autoPlayToken={playToken} />

              <div className="editor-hints">
                <div className="hint-path" title={current.original_path}>{current.rel_path.split('/').slice(-3).join(' / ')}</div>
                <div className="hint-actions">
                  <button className="btn-small" onClick={() => navigator.clipboard.writeText(current.original_path).then(() => showToast('Path copied'))}>Copy path</button>
                  <button className="btn-small" onClick={() => api(`/reveal/${current.id}`, { method: 'POST' }).catch(() => showToast('Could not reveal file'))}>Reveal in Finder</button>
                  <span className={`status-text status-${current.status}`}>{statusLabel[current.status]}</span>
                </div>
                {current.hint_coptic_name && (
                  <button className="hint-chip" onClick={() => setField({ coptic_name: current.hint_coptic_name })} title="Use as the Coptic name">
                    Earlier Coptic name: <b>{current.hint_coptic_name}</b>
                  </button>
                )}
                {current.hint_notes && <div className="hint-note">Earlier note: {current.hint_notes}</div>}
                {current.suggested_title && !form.english_title && (
                  <button className="hint-chip" onClick={() => setField({ english_title: current.suggested_title })} title="Alt+Enter">
                    From the file name: <b>{current.suggested_title}</b>
                  </button>
                )}
              </div>

              <div className="editor-form">
                <Combobox
                  ref={titleRef}
                  label="English title *"
                  value={form.english_title}
                  onChange={v => setField({ english_title: v })}
                  items={englishItems}
                  onPick={item => pickHymn(item, 'english')}
                  placeholder={current.suggested_title || 'A Song for the Resurrection (Tone 2)'}
                />
                <Combobox
                  ref={copticRef}
                  label="Coptic name * (first words of the text)"
                  value={form.coptic_name}
                  onChange={v => setField({ coptic_name: v })}
                  items={copticItems}
                  onPick={item => pickHymn(item, 'coptic')}
                  placeholder="ⲁⲗⲏⲑⲱⲥ ⲧⲉⲛⲛⲁϩϯ ⲁⲛⲟⲛ"
                  lang="cop"
                />
                <SeasonField
                  ref={seasonRef}
                  seasons={seasons}
                  value={form.season_id}
                  source={current.season_source}
                  onChange={id => setField({ season_id: id })}
                  itemsFor={seasonItemsFor}
                />

                <div className="form-row">
                  <div className="field">
                    <label className="field-label">Version / set</label>
                    <input value={form.version_label} onChange={e => setField({ version_label: e.target.value })} placeholder="e.g. 1980s set" />
                  </div>
                  <div className="field">
                    <label className="field-label">Year</label>
                    <input value={form.year_text} onChange={e => setField({ year_text: e.target.value })} placeholder={current.year || current.hint_year || '1985, 1980s'} />
                  </div>
                </div>

                <button className="link-btn" onClick={() => setShowMore(v => !v)}>{showMore ? '▾ Fewer fields' : '▸ More fields (Coptic title, English name, notes, tags)'}</button>
                {showMore && (
                  <>
                    <div className="field">
                      <label className="field-label">Coptic title (descriptive)</label>
                      <input value={form.coptic_title} onChange={e => setField({ coptic_title: e.target.value })} lang="cop" />
                    </div>
                    <div className="field">
                      <label className="field-label">English name (first words, in English)</label>
                      <input value={form.english_name} onChange={e => setField({ english_name: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="field-label">Context note (e.g. “slightly different in Lent”)</label>
                      <input value={form.context_note} onChange={e => setField({ context_note: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="field-label">Notes</label>
                      <textarea rows={2} value={form.notes} onChange={e => setField({ notes: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="field-label">Tags</label>
                      <div className="tag-toggles">
                        {tree.tags.map(t => {
                          const inherited = current.inherited_tags.includes(t.id);
                          const on = inherited || form.tags.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              className={`chip chip-tag-btn${on ? ' on' : ''}`}
                              disabled={inherited}
                              title={inherited ? 'Set on the folder' : ''}
                              onClick={() => setField({ tags: form.tags.includes(t.id) ? form.tags.filter(x => x !== t.id) : [...form.tags, t.id] })}
                            >{t.label}</button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {form.hymn_id && hymnData.hymns.find(h => h.id === form.hymn_id) && (() => {
                  const h = hymnData.hymns.find(x => x.id === form.hymn_id);
                  const changed = ['english_title', 'coptic_name'].some(f => norm(form[f]).trim() !== norm(h[f]).trim() && form[f].trim() && h[f]);
                  return changed ? (
                    <div className="hymn-warning">
                      This hymn is used by {h.count} file{h.count === 1 ? '' : 's'}. Saving the edited names creates a new hymn.{' '}
                      <button className="link-btn" onClick={async () => {
                        try { await put(`/hymns/${h.id}`, { english_title: form.english_title, coptic_name: form.coptic_name, coptic_title: form.coptic_title, english_name: form.english_name }); await loadHymns(); await reload(current.id); loadUndo(); showToast('Renamed everywhere'); }
                        catch (e) { showToast(`Failed: ${e.message}`); }
                      }}>Rename it everywhere instead</button>
                    </div>
                  ) : null;
                })()}

                <div className="editor-actions">
                  <span className={`missing${missing.length ? '' : ' ok'}`}>{missing.length ? `Still needs: ${missing.join(', ')}` : 'Ready ✓'}</span>
                  <button className="btn" onClick={() => setPalette('actions')} title="⌘K">Mark��</button>
                  <button className="btn btn-primary" onClick={() => commit()} title="Enter">Save &amp; next ↵</button>
                </div>
              </div>

              {saved && (
                <div className="similar-banner">
                  <div>
                    <b>{saved.items.length}</b> unnamed file{saved.items.length > 1 ? 's' : ''} have the same name as the one you just saved.
                    Give them “{saved.title}” too? (they’ll be marked for review)
                  </div>
                  <ul>
                    {saved.items.slice(0, 12).map(s => (
                      <li key={s.id}>
                        <label>
                          <input type="checkbox" checked={saved.checked.has(s.id)} onChange={() => setSaved(prev => { const c = new Set(prev.checked); c.has(s.id) ? c.delete(s.id) : c.add(s.id); return { ...prev, checked: c }; })} />
                          {s.filename} <span className="muted">· {s.folder.split('/').slice(-2).join(' / ')}</span>
                        </label>
                      </li>
                    ))}
                    {saved.items.length > 12 && <li className="muted">and {saved.items.length - 12} more</li>}
                  </ul>
                  <div className="similar-actions">
                    <button className="btn btn-primary" onClick={applySaved}>Apply to {saved.checked.size} (Alt+A)</button>
                    <button className="btn" onClick={() => setSaved(null)}>Dismiss</button>
                  </div>
                </div>
              )}
            </>
          )}

          {multi && (
            <div className="editor-form">
              <h3>{selection.size} files selected</h3>
              <p className="admin-muted">Set the same value on all of them. They’ll be marked “needs review” so you still confirm each one.</p>
              <Combobox
                label="Hymn"
                value={bulk.hymnText}
                onChange={v => setBulk(b => ({ ...b, hymnText: v, hymn: null }))}
                items={hymnData.hymns.filter(h => norm(`${h.english_title} ${h.coptic_name}`).includes(norm(bulk.hymnText).trim())).slice(0, 8).map(h => hymnItem(h))}
                onPick={item => setBulk(b => ({ ...b, hymn: item.data.hymn, hymnText: item.data.hymn.english_title || item.data.hymn.coptic_name }))}
                placeholder="Search existing hymns"
              />
              <SeasonField seasons={seasons} value={bulk.season_id} onChange={id => setBulk(b => ({ ...b, season_id: id }))} itemsFor={seasonItemsFor} label="Season" />
              <div className="form-row">
                <div className="field"><label className="field-label">Version / set</label><input value={bulk.version_label} onChange={e => setBulk(b => ({ ...b, version_label: e.target.value }))} /></div>
                <div className="field"><label className="field-label">Year</label><input value={bulk.year_text} onChange={e => setBulk(b => ({ ...b, year_text: e.target.value }))} /></div>
              </div>
              <div className="editor-actions">
                <button className="btn" onClick={() => setSelection(new Set())}>Clear selection</button>
                <button className="btn btn-primary" onClick={applyBulk}>Apply to {selection.size}</button>
              </div>
            </div>
          )}
          {!current && <p className="admin-muted" style={{ padding: 16 }}>Pick a folder with “G”, or change the filters.</p>}
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

      {palette === 'folder' && (
        <Palette
          title="Go to folder"
          items={[{ id: '', label: 'All folders', hint: '' }, ...tree.folders
            .slice().sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
            .map(f => ({ id: f.path, label: f.name, hint: `${f.parent ? f.parent.split('/').pop().slice(0, 28) : f.cantor_id.slice(0, 2)} · ${f.total.files}` }))]}
          onClose={() => setPalette(null)}
          onPick={(it) => { setPalette(null); setFolder(it.id); setCursor(0); }}
        />
      )}
      {palette === 'actions' && current && (
        <Palette
          title={`Actions for “${current.filename.slice(0, 40)}”`}
          items={[
            { id: 'junk', label: 'Mark as junk', hint: 'not a hymn / unusable' },
            { id: 'skipped', label: 'Skip for now', hint: 'come back later (Flagged)' },
            { id: 'tape', label: 'Mark as tape', hint: 'unsplit recording' },
            { id: 'multi', label: 'Mark as multi-hymn', hint: 'several hymns in one file' },
            { id: 'video', label: 'Mark as video' },
            { id: 'todo', label: 'Return to the queue', hint: 'undo a flag' },
            { id: 'clear', label: 'Clear the hymn from this form' },
          ]}
          onClose={() => setPalette(null)}
          onPick={(it) => {
            setPalette(null);
            if (it.id === 'clear') setField({ hymn_id: null, english_title: '', coptic_name: '', coptic_title: '', english_name: '' });
            else setStatus(it.id);
          }}
        />
      )}
    </div>
  );
}

// Season picker that shows the current season as a placeholder and filters as you type ("13", "kiahk")
const SeasonField = forwardRef(function SeasonField({ seasons, value, source, onChange, itemsFor, label = 'Season *' }, ref) {
  const [query, setQuery] = useState('');
  const selected = seasons.find(s => s.id === value);
  return (
    <div className="season-field">
      <Combobox
        ref={ref}
        label={label}
        value={query}
        onChange={setQuery}
        items={itemsFor(query)}
        autoHighlight={query.trim().length > 0}
        onPick={item => { onChange(item.data.season.id); setQuery(''); }}
        onBlurValue={() => setQuery('')}
        placeholder={selected ? selected.name_en : 'Type a number or name'}
      />
      {selected && (
        <div className={`season-current${selected.is_catchall ? ' warn' : ''}`}>
          {selected.name_en}
          {selected.is_catchall ? ' — a catch-all; pick the real season' : source === 'folder' ? ' (from the folder)' : ''}
        </div>
      )}
    </div>
  );
});
