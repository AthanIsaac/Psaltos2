const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DATA_DIR = path.resolve(__dirname, '../../data');
const SEASONS_FILE = path.join(DATA_DIR, 'seasons.json');
const ALIASES_FILE = path.join(DATA_DIR, 'season_aliases.json');
const MANIFEST_FILE = path.join(DATA_DIR, 'manifest.csv');
const EXACT_DUPES_FILE = path.join(DATA_DIR, 'exact_dupes.csv');
const NEAR_DUPES_FILE = path.join(DATA_DIR, 'near_dupes.csv');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Simple CSV parser for our controlled format (no embedded newlines)
function parseCsv(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Handle quoted fields
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { values.push(current); current = ''; }
      else { current += ch; }
    }
    values.push(current);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] !== undefined ? values[i] : ''; });
    return row;
  });
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

function writeCsv(filePath, rows) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v === undefined || v === null ? '' : v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map(h => escape(row[h])).join(','));
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'assignments.json');

function readAssignments() {
  if (!fs.existsSync(ASSIGNMENTS_FILE)) return { folder_seasons: {}, file_overrides: {} };
  return JSON.parse(fs.readFileSync(ASSIGNMENTS_FILE, 'utf8'));
}

// Cached manifest rows (reload if file changes)
let _manifestCache = null;
let _manifestMtime = 0;
function getManifest() {
  if (!fs.existsSync(MANIFEST_FILE)) return [];
  const mtime = fs.statSync(MANIFEST_FILE).mtimeMs;
  if (!_manifestCache || mtime !== _manifestMtime) {
    _manifestCache = readCsv(MANIFEST_FILE);
    _manifestMtime = mtime;
  }
  return _manifestCache;
}

// Resolve a file's effective season: file override > most-specific folder assignment
function effectiveSeason(row, assignments) {
  const fo = assignments.file_overrides[row.file_id];
  if (fo) return fo.season_id;
  // Walk up from file's directory looking for a folder assignment
  let dir = path.dirname(row.original_path);
  while (true) {
    if (assignments.folder_seasons[dir] !== undefined) return assignments.folder_seasons[dir];
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// ── Organizer: folder tree ────────────────────────────────────────────────────

router.get('/manifest/cantors', (req, res) => {
  const rows = getManifest();
  const map = {};
  for (const r of rows) map[r.cantor_raw] = (map[r.cantor_raw] || 0) + 1;
  res.json(Object.entries(map).map(([name, count]) => ({ name, count })));
});

router.get('/manifest/folders', (req, res) => {
  const { cantor } = req.query;
  if (!cantor) return res.status(400).json({ error: 'cantor required' });
  const rows = getManifest().filter(r => r.cantor_raw === cantor);
  const assignments = readAssignments();

  // Build folder map: dir -> { totalFiles, assignedFiles, season }
  const folders = {};
  for (const row of rows) {
    const dir = path.dirname(row.original_path);
    if (!folders[dir]) folders[dir] = { path: dir, totalFiles: 0, assignedFiles: 0 };
    folders[dir].totalFiles++;
    if (effectiveSeason(row, assignments)) folders[dir].assignedFiles++;
  }

  // Compute depth relative to cantor root
  const cantorRoot = rows[0] ? path.join(path.dirname(rows[0].original_path.replace(/\\/g, '/')).split('/').slice(0, -rows[0].original_path.split('/').indexOf(cantor.split('/')[0]) + 1).join('/'), cantor) : null;
  const allPaths = Object.keys(folders).sort();
  // Find common prefix (cantor root)
  const prefix = allPaths.reduce((acc, p) => {
    while (!p.startsWith(acc)) acc = acc.slice(0, acc.lastIndexOf(path.sep));
    return acc;
  }, allPaths[0] || '');

  const result = allPaths.map(p => ({
    ...folders[p],
    relative: p.slice(prefix.length + 1) || path.basename(p),
    depth: p.slice(prefix.length).split(path.sep).filter(Boolean).length - 1,
    season: assignments.folder_seasons[p] || null,
  }));

  res.json({ folders: result, prefix });
});

// ── Organizer: assignments ────────────────────────────────────────────────────

router.get('/assignments', (req, res) => res.json(readAssignments()));

router.put('/assignments/folder', (req, res) => {
  const { folderPath, seasonId } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'folderPath required' });
  const a = readAssignments();
  if (seasonId === null || seasonId === '') {
    delete a.folder_seasons[folderPath];
  } else {
    a.folder_seasons[folderPath] = seasonId;
  }
  writeJson(ASSIGNMENTS_FILE, a);
  _manifestCache = null; // bust cache so counts refresh
  res.json({ ok: true });
});

router.put('/assignments/file', (req, res) => {
  const { fileId, seasonId, removed } = req.body;
  if (!fileId) return res.status(400).json({ error: 'fileId required' });
  const a = readAssignments();
  if (seasonId === null && removed === undefined) {
    delete a.file_overrides[fileId];
  } else {
    a.file_overrides[fileId] = { season_id: seasonId ?? null, removed: removed ?? false };
  }
  writeJson(ASSIGNMENTS_FILE, a);
  res.json({ ok: true });
});

// ── Organizer: season file view ───────────────────────────────────────────────

router.get('/season-counts', (req, res) => {
  const { cantor } = req.query;
  if (!cantor) return res.status(400).json({ error: 'cantor required' });
  const rows = getManifest().filter(r => r.cantor_raw === cantor);
  const assignments = readAssignments();
  const counts = {};
  for (const r of rows) {
    const fo = assignments.file_overrides[r.file_id];
    if (fo?.removed) continue;
    const s = effectiveSeason(r, assignments);
    if (s) counts[s] = (counts[s] || 0) + 1;
  }
  res.json(counts);
});

router.get('/season-files', (req, res) => {
  const { cantor, season } = req.query;
  if (!cantor || !season) return res.status(400).json({ error: 'cantor and season required' });
  const rows = getManifest().filter(r => r.cantor_raw === cantor);
  const assignments = readAssignments();
  const files = rows
    .filter(r => {
      const fo = assignments.file_overrides[r.file_id];
      if (fo?.removed) return false;
      return effectiveSeason(r, assignments) === season;
    })
    .map(r => {
      const fo = assignments.file_overrides[r.file_id] || {};
      return {
        file_id: r.file_id,
        filename: r.filename,
        original_path: r.original_path,
        ext: r.ext,
        size_bytes: r.size_bytes,
        duration_s: r.duration_s,
        season_override: fo.season_id || null,
        order: fo.order ?? null,
      };
    });

  // Sort: explicit order first, then by original path
  files.sort((a, b) => {
    if (a.order !== null && b.order !== null) return a.order - b.order;
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    return a.original_path.localeCompare(b.original_path);
  });

  res.json(files);
});

router.get('/unassigned-files', (req, res) => {
  const { cantor } = req.query;
  if (!cantor) return res.status(400).json({ error: 'cantor required' });
  const rows = getManifest().filter(r => r.cantor_raw === cantor);
  const assignments = readAssignments();
  const unassigned = rows.filter(r => {
    const fo = assignments.file_overrides[r.file_id];
    if (fo?.removed) return false;
    return !effectiveSeason(r, assignments);
  }).map(r => ({
    file_id: r.file_id,
    filename: r.filename,
    original_path: r.original_path,
    ext: r.ext,
    size_bytes: r.size_bytes,
    duration_s: r.duration_s,
    cantor_raw: r.cantor_raw,
    season_raw: r.season_raw,
  }));
  res.json({ count: unassigned.length, files: unassigned });
});

// ── Seasons ──────────────────────────────────────────────────────────────────


router.get('/seasons', (req, res) => {
  const seasons = readJson(SEASONS_FILE) || [];
  res.json(seasons);
});

router.post('/seasons', (req, res) => {
  const { id, name_en, name_coptic, name_ar } = req.body;
  if (!id || !name_en) return res.status(400).json({ error: 'id and name_en required' });

  const seasons = readJson(SEASONS_FILE) || [];
  if (seasons.find(s => s.id === id)) {
    return res.status(409).json({ error: 'Season with this id already exists' });
  }
  const maxOrder = seasons.reduce((m, s) => Math.max(m, s.sort_order || 0), 0);
  const season = { id, name_en, name_coptic: name_coptic || '', name_ar: name_ar || '', sort_order: maxOrder + 1 };
  seasons.push(season);
  writeJson(SEASONS_FILE, seasons);
  res.status(201).json(season);
});

router.put('/seasons/:id', (req, res) => {
  const seasons = readJson(SEASONS_FILE) || [];
  const idx = seasons.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Season not found' });
  seasons[idx] = { ...seasons[idx], ...req.body, id: seasons[idx].id };
  writeJson(SEASONS_FILE, seasons);
  res.json(seasons[idx]);
});

router.delete('/seasons/:id', (req, res) => {
  const seasons = readJson(SEASONS_FILE) || [];
  const idx = seasons.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Season not found' });
  seasons.splice(idx, 1);
  writeJson(SEASONS_FILE, seasons);
  res.json({ ok: true });
});

router.put('/seasons-order', (req, res) => {
  const { ids } = req.body;  // ordered array of season ids
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  const seasons = readJson(SEASONS_FILE) || [];
  const map = Object.fromEntries(seasons.map(s => [s.id, s]));
  const reordered = ids.map((id, i) => ({ ...map[id], sort_order: i + 1 })).filter(Boolean);
  writeJson(SEASONS_FILE, reordered);
  res.json(reordered);
});

// ── Season aliases ────────────────────────────────────────────────────────────

router.get('/aliases', (req, res) => {
  res.json(readJson(ALIASES_FILE) || {});
});

router.put('/aliases', (req, res) => {
  writeJson(ALIASES_FILE, req.body);
  res.json({ ok: true });
});

// ── Manifest summary ──────────────────────────────────────────────────────────

router.get('/manifest/summary', (req, res) => {
  if (!fs.existsSync(MANIFEST_FILE)) {
    return res.json({ exists: false, total: 0, cantors: [], tapes: 0, videos: 0 });
  }
  const rows = readCsv(MANIFEST_FILE);
  const cantorCounts = {};
  let tapes = 0, videos = 0;
  for (const r of rows) {
    cantorCounts[r.cantor_raw] = (cantorCounts[r.cantor_raw] || 0) + 1;
    if (r.is_tape === '1') tapes++;
    if (r.is_video === '1') videos++;
  }
  res.json({
    exists: true,
    total: rows.length,
    tapes,
    videos,
    cantors: Object.entries(cantorCounts).map(([name, count]) => ({ name, count })),
  });
});

// ── Duplicates ────────────────────────────────────────────────────────────────

router.get('/dupes/exact', (req, res) => {
  res.json(readCsv(EXACT_DUPES_FILE));
});

router.put('/dupes/exact/:sha256/:drop_file_id', (req, res) => {
  const rows = readCsv(EXACT_DUPES_FILE);
  const row = rows.find(r => r.sha256 === req.params.sha256 && r.drop_file_id === req.params.drop_file_id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  Object.assign(row, req.body);
  writeCsv(EXACT_DUPES_FILE, rows);
  res.json(row);
});

router.get('/dupes/near', (req, res) => {
  res.json(readCsv(NEAR_DUPES_FILE));
});

router.put('/dupes/near/:file_id_a/:file_id_b', (req, res) => {
  const rows = readCsv(NEAR_DUPES_FILE);
  const row = rows.find(r => r.file_id_a === req.params.file_id_a && r.file_id_b === req.params.file_id_b);
  if (!row) return res.status(404).json({ error: 'Not found' });
  Object.assign(row, req.body);
  writeCsv(NEAR_DUPES_FILE, rows);
  res.json(row);
});

// ── Local audio streaming ─────────────────────────────────────────────────────
// Only for local admin use — serves files by absolute path from this machine

router.get('/audio/local', (req, res) => {
  const { filePath } = req.query;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fs.statSync(resolved);
  const ext = path.extname(resolved).toLowerCase();
  const mimeMap = {
    '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
    '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.aac': 'audio/aac',
    '.wma': 'audio/x-ms-wma', '.mp4': 'video/mp4',
  };
  const contentType = mimeMap[ext] || 'application/octet-stream';

  const range = req.headers.range;
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });
    fs.createReadStream(resolved, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(resolved).pipe(res);
  }
});

module.exports = router;
