#!/usr/bin/env node
/**
 * Builds data/psaltos.db from the existing inventory. Safe to re-run: it only adds
 * rows that are missing and never overwrites decisions you've made in the admin UI.
 *
 *   node scripts/import-library.js
 */
const fs = require('fs');
const path = require('path');
const { openDb, AUDIO_ROOT, DATA_DIR, REPO_ROOT } = require('../db');

const nfc = (s) => s.normalize('NFC');

// Guesses from the path. Years: 1950-2029. Tags: keywords in English and Arabic.
const YEAR_RE = /(?<!\d)((?:19[5-9]|20[0-2])\d)(?!\d)/g;
const TAG_KEYWORDS = {
  instructional: /lesson|lessons|teach|teaching|explanation|exposition|class|tutorial|درس|شرح|تعليم|تفسير/i,
  live: /\blive\b|convention|conference|concert|performance|recital|مؤتمر|حفل|حفلة/i,
};
function guessFromPath(rel) {
  const years = [...new Set([...rel.matchAll(YEAR_RE)].map(m => m[1]))];
  const tags = Object.entries(TAG_KEYWORDS).filter(([, re]) => re.test(rel)).map(([t]) => t);
  return { year: years.length === 1 ? years[0] : '', tags: tags.join(',') };
}

// Minimal CSV parser (handles quoted fields with commas/newlines)
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.filter(r => r.length === header.length).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const readCsv = (file) => parseCsv(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));

// "01 Muallim Mikhail Girgis Ghabrial El Batanooni" -> "Mikhail Girgis"
const cantorDisplayName = (folder) => {
  const words = folder.replace(/^\d+\s+/, '').replace(/^Muallim\s+/i, '').split(/\s+/);
  return words.slice(0, 2).join(' ');
};

function main() {
  const db = openDb();
  const rootPrefix = AUDIO_ROOT.endsWith('/') ? AUDIO_ROOT : AUDIO_ROOT + '/';

  const manifest = readCsv('manifest.csv');
  const exact = readCsv('exact_dupes.csv');
  const seasons = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'seasons.json'), 'utf8'));
  const cachePath = path.join(DATA_DIR, 'seeds/cache.json');
  const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : null;

  const relOf = (abs) => nfc(abs.startsWith(rootPrefix) ? abs.slice(rootPrefix.length) : abs);

  // Resolve exact-duplicate chains: dropped file -> the file it was merged into
  const mergedInto = new Map();
  for (const r of exact) if (r.status === 'confirmed') mergedInto.set(r.drop_file_id, r.keep_file_id);
  const resolve = (id) => { const seen = new Set(); while (mergedInto.has(id) && !seen.has(id)) { seen.add(id); id = mergedInto.get(id); } return id; };

  // Hints from the earlier manual importer, matched by cantor folder + relative path
  const hints = new Map();
  if (cache) {
    for (const c of cache.cantors) {
      for (const f of c.files) {
        hints.set(nfc(`${c.rootDirectory}/${f.path}`), f);
      }
    }
  }

  const insertSeason = db.prepare('INSERT OR IGNORE INTO seasons (id, name_en, name_coptic, name_ar, sort_order) VALUES (?,?,?,?,?)');
  const insertCantor = db.prepare('INSERT OR IGNORE INTO cantors (id, display_name) VALUES (?,?)');
  const insertFolder = db.prepare('INSERT OR IGNORE INTO folders (path, cantor_id, parent, name) VALUES (?,?,?,?)');
  const insertRec = db.prepare(`INSERT OR IGNORE INTO recordings
    (id, cantor_id, folder, rel_path, original_path, filename, ext, size_bytes, sha256, kind, status,
     hint_coptic_name, hint_notes, hint_dest_folder, hint_year, hint_tags)
    VALUES (@id,@cantor_id,@folder,@rel_path,@original_path,@filename,@ext,@size_bytes,@sha256,@kind,@status,
     @hint_coptic_name,@hint_notes,@hint_dest_folder,@hint_year,@hint_tags)`);
  const updateHints = db.prepare('UPDATE recordings SET hint_year=?, hint_tags=? WHERE id=?');
  const insertPath = db.prepare('INSERT OR IGNORE INTO recording_paths (recording_id, rel_path, original_path, is_primary) VALUES (?,?,?,?)');
  const insertSuggestion = db.prepare("INSERT OR IGNORE INTO suggestions (field, text, source) VALUES (?,?,'cache.json')");
  const markMerged = db.prepare("UPDATE recordings SET status='merged', merged_into=? WHERE id=? AND status!='merged'");

  let hinted = 0;

  const run = db.transaction(() => {
    for (const s of seasons) insertSeason.run(s.id, s.name_en, s.name_coptic || '', s.name_ar || '', s.sort_order || 0);

    for (const r of manifest) {
      const rel = relOf(r.original_path);
      const parts = rel.split('/');
      const cantorId = parts[0];
      insertCantor.run(cantorId, cantorDisplayName(cantorId));

      // Folder chain: the cantor's root folder, then each directory down to the file
      insertFolder.run(parts[0], cantorId, null, parts[0]);
      let parent = parts[0];
      for (let i = 1; i < parts.length - 1; i++) {
        const p = parts.slice(0, i + 1).join('/');
        insertFolder.run(p, cantorId, parent, parts[i]);
        parent = p;
      }

      const isVideo = r.is_video === '1';
      const hint = hints.get(rel);
      const guess = guessFromPath(rel);
      if (hint && (hint.copticName || hint.notes || hint.destFolder)) hinted++;

      insertRec.run({
        id: r.file_id,
        cantor_id: cantorId,
        folder: parent,
        rel_path: rel,
        original_path: r.original_path,
        filename: nfc(r.filename),
        ext: r.ext.toLowerCase(),
        size_bytes: Number(r.size_bytes) || null,
        sha256: r.sha256 || null,
        kind: isVideo ? 'video' : 'audio',
        status: isVideo ? 'video' : (r.is_tape === '1' ? 'tape' : 'todo'),
        hint_coptic_name: hint?.copticName?.trim() || '',
        hint_notes: hint?.notes?.trim() || '',
        hint_dest_folder: hint?.destFolder?.trim() || '',
        hint_year: guess.year,
        hint_tags: guess.tags,
      });
      updateHints.run(guess.year, guess.tags, r.file_id); // refresh guesses on re-runs; user data is untouched
      insertPath.run(r.file_id, rel, r.original_path, 1);
    }

    // Top-level folders belong under their cantor's root folder
    db.prepare('UPDATE folders SET parent = cantor_id WHERE parent IS NULL AND path != cantor_id').run();

    // Exact duplicates become one recording with several known locations; nothing is discarded
    const byId = new Map(manifest.map(r => [r.file_id, r]));
    let merged = 0;
    for (const [dropId] of mergedInto) {
      const keepId = resolve(dropId);
      const drop = byId.get(dropId);
      if (!drop || !byId.has(keepId) || keepId === dropId) continue;
      markMerged.run(keepId, dropId);
      insertPath.run(keepId, relOf(drop.original_path), drop.original_path, 0);
      merged++;
    }

    // Remember each new recording's imported status (existing rows keep theirs)
    db.prepare('UPDATE recordings SET import_status = status WHERE import_status IS NULL').run();

    // Autocomplete seeds: the Coptic titles entered by hand earlier
    let seeds = 0;
    if (cache) {
      for (const c of cache.cantors) for (const f of c.files) {
        const t = f.copticName?.trim();
        if (t) { insertSuggestion.run('coptic_name', nfc(t)); seeds++; }
      }
    }
    return { merged, seeds };
  });

  const { merged } = run();

  const count = (sql) => db.prepare(sql).get().n;
  console.log('Import complete');
  console.log('  recordings      ', count('SELECT COUNT(*) n FROM recordings'));
  console.log('    todo          ', count("SELECT COUNT(*) n FROM recordings WHERE status='todo'"));
  console.log('    tape          ', count("SELECT COUNT(*) n FROM recordings WHERE status='tape'"));
  console.log('    video         ', count("SELECT COUNT(*) n FROM recordings WHERE status='video'"));
  console.log('    merged (exact)', count("SELECT COUNT(*) n FROM recordings WHERE status='merged'"), `(of ${merged} duplicate pairs)`);
  console.log('  folders         ', count('SELECT COUNT(*) n FROM folders'));
  console.log('  seasons         ', count('SELECT COUNT(*) n FROM seasons'));
  console.log('  cantors         ', count('SELECT COUNT(*) n FROM cantors'));
  console.log('  seed suggestions', count("SELECT COUNT(*) n FROM suggestions WHERE source='cache.json'"));
  console.log('  files with hints', hinted);
  console.log('  year guessed    ', count("SELECT COUNT(*) n FROM recordings WHERE hint_year != ''"));
  console.log('  instructional   ', count("SELECT COUNT(*) n FROM recordings WHERE hint_tags LIKE '%instructional%'"));
  console.log('  live            ', count("SELECT COUNT(*) n FROM recordings WHERE hint_tags LIKE '%live%'"));
}

main();
