// Cataloguing API for the admin UI, backed by the SQLite library (see db.js).
// Originals are only ever read; every edit is recorded so it can be undone.
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { getDb, PREVIEW_DIR, AUDIO_ROOT } = require('../db');
const { withUndo: withUndoOn } = require('../undo');
const { buildFolderIndex } = require('../folderEffective');
const { scheduleBackup, installBackupHooks } = require('../backup');

const router = express.Router();
const db = getDb();
installBackupHooks(db);

const ALIASES_FILE = path.resolve(__dirname, '../../data/season_aliases.json');
const aliases = fs.existsSync(ALIASES_FILE) ? JSON.parse(fs.readFileSync(ALIASES_FILE, 'utf8')) : {};

const FLAGS = ['junk', 'lessons', 'tape', 'video', 'other'];

// ── Undo ──────────────────────────────────────────────────────────────────────

const withUndo = (label, change) => withUndoOn(db, label, change);

router.get('/undo', (req, res) => {
  const last = db.prepare('SELECT id, label FROM undo_log ORDER BY id DESC LIMIT 1').get();
  res.json({ label: last?.label || null });
});

router.post('/undo', (req, res) => {
  const last = db.prepare('SELECT * FROM undo_log ORDER BY id DESC LIMIT 1').get();
  if (!last) return res.json({ ok: true, label: null });
  db.transaction(() => {
    for (const { sql, params } of JSON.parse(last.statements)) db.prepare(sql).run(...params);
    db.prepare('DELETE FROM undo_log WHERE id = ?').run(last.id);
  })();
  scheduleBackup(db);
  res.json({ ok: true, label: last.label });
});

// ── Tree ──────────────────────────────────────────────────────────────────────

const YEAR_RE = /(?<!\d)((?:19[5-9]|20[0-2])\d)(?!\d)/;
const TAG_KEYWORDS = {
  instructional: /lesson|teach|explanation|exposition|class|tutorial|درس|شرح|تعليم|تفسير/i,
  live: /\blive\b|convention|conference|concert|performance|recital|مؤتمر|حفل/i,
};

// Arabic folder names that map to seasons (the aliases file only has English keywords)
const ARABIC_ALIASES = {
  'الباسيلي': '07a-st-basil-liturgy',
  'الغريغوري': '07b-st-gregory-liturgy',
  'الغريغورى': '07b-st-gregory-liturgy',
  'الكيرلسي': '07c-st-cyril-liturgy',
  'كيهك': '10-kiahk',
  'الكيهكية': '10-kiahk',
  'الصوم الكبير': '13-great-lent',
  'القيامة': '18-resurrection',
  'شعانين': '15-palm-sunday',
  'شعانيني': '15-palm-sunday',
  'صوم الرسل': '22-apostles-fast',
  'صوم السيدة العذراء': '23-st-marys-fast',
  'التسبحة': '03-vespers-praises',
};

const STOP_WORDS = new Set(['the', 'and', 'of', 'for', 'files', 'file', 'cd', 'part', 'hymns', 'more', 'other', 'recordings']);
const words = (text) => (text.toLowerCase().match(/[a-z؀-ۿ]+/g) || []).filter(w => w.length >= 3 && !STOP_WORDS.has(w));

// Same word, allowing one slip in longer words ("Kiyahk" ~ "Kiahk", "Ressurrection" ~ "Resurrection")
function similar(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 5) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// Each season is recognised by phrases: its full name, or any alias keyword/phrase.
// All words of a phrase must appear, so "Great Friday" doesn't match "Great Lent".
let seasonPhrases = null;
function phrasesFor(seasons) {
  if (seasonPhrases) return seasonPhrases;
  seasonPhrases = seasons.map(s => ({ id: s.id, phrases: [words(s.name_en)].filter(p => p.length) }));
  const byId = new Map(seasonPhrases.map(p => [p.id, p]));
  for (const [alias, id] of Object.entries(aliases)) {
    const w = words(alias);
    if (w.length) byId.get(id)?.phrases.push(w);
  }
  return seasonPhrases;
}

// Guess a season (and year/tags) from a folder's name. A leading "07b"-style number only
// adds weight when the name also matches, because numbering differs between cantors.
function suggestFor(name, seasons, isCantorRoot) {
  const out = { season_id: null, reason: null, flag: null, year: '', tags: [] };
  if (isCantorRoot) return out;

  const folderWords = words(name);
  const prefix = name.match(/^(\d+[a-z]?)(?=[\s._-]|$)/i)?.[1]?.toLowerCase();

  let best = null;
  for (const { id, phrases } of phrasesFor(seasons)) {
    // Longest phrase fully present in the folder name
    const hit = phrases
      .filter(p => p.every(w => folderWords.some(fw => similar(fw, w))))
      .sort((a, b) => b.length - a.length)[0];
    if (!hit) continue;
    const numberAgrees = prefix && id.toLowerCase().startsWith(`${prefix}-`);
    const score = hit.length + (numberAgrees ? 2 : 0);
    if (!best || score > best.score) best = { id, score, hit, numberAgrees, tie: false };
    else if (score === best.score) best.tie = true;
  }
  if (best && !best.tie) {
    out.season_id = best.id;
    out.reason = `${best.numberAgrees ? 'number + ' : ''}"${best.hit.join(' ')}"`;
  }
  if (!out.season_id) {
    const key = Object.keys(ARABIC_ALIASES).filter(k => name.includes(k)).sort((a, b) => b.length - a.length)[0];
    if (key) { out.season_id = ARABIC_ALIASES[key]; out.reason = `"${key}"`; }
  }

  if (/\blessons?\b|درس|شرح/i.test(name)) out.flag = 'lessons';
  const y = name.match(YEAR_RE);
  if (y) out.year = y[1];
  out.tags = Object.entries(TAG_KEYWORDS).filter(([, re]) => re.test(name)).map(([t]) => t);
  return out;
}

function loadTree() {
  const seasons = db.prepare('SELECT * FROM seasons ORDER BY sort_order, id').all();
  const tags = db.prepare('SELECT * FROM tags ORDER BY sort_order, label').all();
  const cantors = db.prepare('SELECT * FROM cantors ORDER BY id').all();

  const { byPath, ownTags, effective } = buildFolderIndex(db);
  const folderRows = [...byPath.values()];

  const direct = new Map();
  for (const r of db.prepare(`
    SELECT r.folder,
           COUNT(*) AS n,
           SUM(r.kind = 'video') AS video,
           SUM(r.status = 'tape') AS tape,
           SUM(m.preview_ok = 0 AND m.error IS NOT NULL) AS unreadable
    FROM recordings r LEFT JOIN media m ON m.recording_id = r.id
    WHERE r.status != 'merged' GROUP BY r.folder`).all()) {
    direct.set(r.folder, r);
  }

  const out = new Map();
  for (const f of byPath.values()) {
    const d = direct.get(f.path) || { n: 0, video: 0, tape: 0, unreadable: 0 };
    const eff = effective(f);
    out.set(f.path, {
      path: f.path, name: f.name, parent: f.parent, cantor_id: f.cantor_id, children: f.children,
      own: { season_id: f.season_id, flag: f.flag, year_text: f.year_text || '', tags: ownTags.get(f.path) || [] },
      effective: eff,
      suggest: suggestFor(f.name, seasons, !f.parent),
      direct: { files: d.n, video: d.video || 0, tape: d.tape || 0, unreadable: d.unreadable || 0 },
      total: { files: 0, covered: 0, video: 0, tape: 0, unreadable: 0 },
    });
  }
  // Roll counts up the tree. A file is "covered" once its folder has a season or a flag.
  for (const f of out.values()) {
    const covered = f.effective.season_id || f.effective.flag ? f.direct.files : 0;
    for (let cur = f; cur; cur = cur.parent ? out.get(cur.parent) : null) {
      cur.total.files += f.direct.files;
      cur.total.covered += covered;
      cur.total.video += f.direct.video;
      cur.total.tape += f.direct.tape;
      cur.total.unreadable += f.direct.unreadable;
    }
  }
  // A folder holding nothing but videos or unsplit tapes should be flagged, not given a season
  for (const f of out.values()) {
    if (f.total.files > 0 && f.total.video === f.total.files) f.suggest.flag = 'video';
    else if (f.total.files > 0 && f.total.tape === f.total.files) f.suggest.flag = 'tape';
    if (f.suggest.flag === 'video' || f.suggest.flag === 'tape') f.suggest.season_id = null;
  }
  return { seasons, tags, cantors, folders: [...out.values()] };
}

router.get('/tree', (req, res) => res.json(loadTree()));

// ── Folder edits ──────────────────────────────────────────────────────────────

// Statements that restore a folder's own values and tags to what they are now
function folderSnapshot(folderPath) {
  const f = db.prepare('SELECT season_id, flag, year_text FROM folders WHERE path = ?').get(folderPath);
  const tags = db.prepare('SELECT tag_id FROM folder_tags WHERE folder_path = ?').all(folderPath).map(t => t.tag_id);
  return [
    { sql: 'UPDATE folders SET season_id = ?, flag = ?, year_text = ? WHERE path = ?', params: [f.season_id, f.flag, f.year_text, folderPath] },
    { sql: 'DELETE FROM folder_tags WHERE folder_path = ?', params: [folderPath] },
    ...tags.map(t => ({ sql: 'INSERT INTO folder_tags (folder_path, tag_id) VALUES (?, ?)', params: [folderPath, t] })),
  ];
}

/**
 * Bulk edit folders. Only the fields present in the body are changed.
 *   { paths: [...], season_id?: id|null, flag?: name|null, year_text?: string,
 *     add_tags?: [ids], remove_tags?: [ids], accept_suggestions?: true }
 */
router.put('/folders', (req, res) => {
  const { paths, season_id, flag, year_text, add_tags = [], remove_tags = [], accept_suggestions } = req.body;
  if (!Array.isArray(paths) || !paths.length) return res.status(400).json({ error: 'paths required' });
  if (season_id && !db.prepare('SELECT 1 FROM seasons WHERE id = ?').get(season_id)) return res.status(400).json({ error: 'unknown season' });
  if (flag && !FLAGS.includes(flag)) return res.status(400).json({ error: 'unknown flag' });
  for (const t of [...add_tags, ...remove_tags]) {
    if (!db.prepare('SELECT 1 FROM tags WHERE id = ?').get(t)) return res.status(400).json({ error: `unknown tag ${t}` });
  }

  const tree = accept_suggestions ? new Map(loadTree().folders.map(f => [f.path, f])) : null;
  const summary = [];
  if ('season_id' in req.body) summary.push(season_id ? 'season' : 'clear season');
  if ('flag' in req.body) summary.push(flag ? `flag ${flag}` : 'clear flag');
  if ('year_text' in req.body) summary.push('year');
  if (add_tags.length || remove_tags.length) summary.push('tags');
  if (accept_suggestions) summary.push('accepted suggestions');
  const label = `${summary.join(', ')} on ${paths.length} folder${paths.length > 1 ? 's' : ''}`;

  withUndo(label, () => {
    const inverse = [];
    for (const p of paths) {
      if (!db.prepare('SELECT 1 FROM folders WHERE path = ?').get(p)) continue;
      inverse.push(...folderSnapshot(p));

      if ('season_id' in req.body) db.prepare('UPDATE folders SET season_id = ? WHERE path = ?').run(season_id || null, p);
      if ('flag' in req.body) db.prepare('UPDATE folders SET flag = ? WHERE path = ?').run(flag || null, p);
      if ('year_text' in req.body) db.prepare('UPDATE folders SET year_text = ? WHERE path = ?').run((year_text || '').trim(), p);
      for (const t of add_tags) db.prepare('INSERT OR IGNORE INTO folder_tags (folder_path, tag_id) VALUES (?, ?)').run(p, t);
      for (const t of remove_tags) db.prepare('DELETE FROM folder_tags WHERE folder_path = ? AND tag_id = ?').run(p, t);

      if (accept_suggestions) {
        const f = tree.get(p);
        // Only fill gaps; never overwrite something already decided
        if (f && !f.effective.season_id && f.suggest.season_id) db.prepare('UPDATE folders SET season_id = ? WHERE path = ?').run(f.suggest.season_id, p);
        if (f && !f.effective.flag && f.suggest.flag) db.prepare('UPDATE folders SET flag = ? WHERE path = ?').run(f.suggest.flag, p);
        if (f && !f.effective.year_text && f.suggest.year) db.prepare('UPDATE folders SET year_text = ? WHERE path = ?').run(f.suggest.year, p);
        for (const t of f?.suggest.tags || []) {
          if (!f.effective.tags.includes(t)) db.prepare('INSERT OR IGNORE INTO folder_tags (folder_path, tag_id) VALUES (?, ?)').run(p, t);
        }
      }
    }
    return inverse;
  });
  res.json({ ok: true });
});

router.post('/tags', (req, res) => {
  const label = String(req.body.label || '').trim();
  if (!label) return res.status(400).json({ error: 'label required' });
  const id = label.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID();
  const order = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM tags').get().n;
  db.prepare('INSERT OR IGNORE INTO tags (id, label, sort_order) VALUES (?, ?, ?)').run(id, label, order);
  scheduleBackup(db);
  res.json({ id, label });
});

// ── Files in a folder ─────────────────────────────────────────────────────────

router.get('/files', (req, res) => {
  const folder = String(req.query.folder || '');
  const recursive = req.query.recursive === '1';
  const rows = db.prepare(`
    SELECT r.id, r.filename, r.ext, r.size_bytes, r.kind, r.status, r.folder, r.rel_path, r.original_path,
           r.hint_coptic_name, r.hint_notes, r.hint_year, r.hint_tags,
           m.duration_s, m.preview_ok, m.error
    FROM recordings r LEFT JOIN media m ON m.recording_id = r.id
    WHERE r.status != 'merged' AND ${recursive ? '(r.folder = @folder OR r.folder LIKE @prefix)' : 'r.folder = @folder'}
    LIMIT 1000`).all({ folder, prefix: `${folder}/%` });
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  rows.sort((a, b) => collator.compare(a.folder + '/' + a.filename, b.folder + '/' + b.filename));
  res.json(rows.map(r => ({ ...r, preview_ok: !!r.preview_ok })));
});

// ── Audio ─────────────────────────────────────────────────────────────────────

// Small mono preview; sendFile handles Range requests so seeking works
router.get('/audio/:id', (req, res) => {
  const file = path.join(PREVIEW_DIR, `${req.params.id}.mp3`);
  if (!/^[0-9a-f-]{36}$/.test(req.params.id) || !fs.existsSync(file)) return res.status(404).json({ error: 'No preview' });
  res.type('audio/mpeg').sendFile(file);
});

// The untouched original ("open full")
router.get('/original/:id', (req, res) => {
  const rec = db.prepare('SELECT original_path FROM recordings WHERE id = ?').get(req.params.id);
  if (!rec || !fs.existsSync(rec.original_path)) return res.status(404).json({ error: 'Original not found' });
  res.sendFile(rec.original_path);
});

// Local convenience: show the original file in Finder (macOS) so it can be double-checked
router.post('/reveal/:id', (req, res) => {
  const rec = db.prepare('SELECT original_path FROM recordings WHERE id = ?').get(req.params.id);
  if (!rec || !fs.existsSync(rec.original_path) || !rec.original_path.startsWith(AUDIO_ROOT)) {
    return res.status(404).json({ error: 'Original not found' });
  }
  execFile('open', ['-R', rec.original_path], (err) => res.json({ ok: !err }));
});

router.get('/waveform/:id', (req, res) => {
  const row = db.prepare('SELECT waveform FROM media WHERE recording_id = ?').get(req.params.id);
  if (!row?.waveform) return res.status(404).json({ error: 'No waveform' });
  res.json([...row.waveform]);
});

module.exports = router;
