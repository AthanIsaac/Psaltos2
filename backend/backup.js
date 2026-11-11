// Automatic backups of everything you decide in the admin UI.
//
//  data/backups/decisions.json            latest decisions, readable and small; commit it to git
//  data/backups/snapshots/decisions-*.json  timestamped copies (recent ones kept)
//  data/backups/snapshots/psaltos-*.db      full copies of the database (recent ones kept)
//
// Only your choices are exported. File lists, durations, previews and fingerprints can all
// be rebuilt with import-library.js and process-media.js, then `npm run restore` re-applies
// the decisions.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR } = require('./db');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, 'backups');
const SNAPSHOT_DIR = path.join(BACKUP_DIR, 'snapshots');
const LATEST = path.join(BACKUP_DIR, 'decisions.json');
const DEBOUNCE_MS = 15000;
const KEEP_JSON_SNAPSHOTS = 60;
const KEEP_DB_SNAPSHOTS = 8;

function exportDecisions(db) {
  const all = (sql) => db.prepare(sql).all();

  const folderTags = all('SELECT folder_path, tag_id FROM folder_tags ORDER BY folder_path, tag_id');
  const tagsByFolder = new Map();
  for (const t of folderTags) {
    if (!tagsByFolder.has(t.folder_path)) tagsByFolder.set(t.folder_path, []);
    tagsByFolder.get(t.folder_path).push(t.tag_id);
  }
  const folders = all('SELECT path, season_id, flag, year_text FROM folders ORDER BY path')
    .map(f => ({ path: f.path, season_id: f.season_id, flag: f.flag, year_text: f.year_text || '', tags: tagsByFolder.get(f.path) || [] }))
    .filter(f => f.season_id || f.flag || f.year_text || f.tags.length);

  // Recordings: only those you've touched (status changed from the import, or any field filled in)
  const recordings = all(`
    SELECT id, rel_path, status, merged_into, hymn_id, season_id, year_text, version_label, context_note, notes
    FROM recordings
    WHERE status != COALESCE(import_status, status)
       OR hymn_id IS NOT NULL OR season_id IS NOT NULL
       OR COALESCE(year_text, '') != '' OR COALESCE(version_label, '') != ''
       OR COALESCE(context_note, '') != '' OR COALESCE(notes, '') != ''
    ORDER BY rel_path`);

  const body = {
    version: 1,
    seasons: all('SELECT id, name_en, name_coptic, name_ar, sort_order, is_catchall FROM seasons ORDER BY sort_order, id'),
    tags: all('SELECT id, label, sort_order FROM tags ORDER BY sort_order, id'),
    folders,
    hymns: all('SELECT id, english_title, coptic_name, coptic_title, english_name FROM hymns ORDER BY id'),
    recordings,
    // Other locations of merged duplicates, and pairs you said only sound alike
    extra_paths: all('SELECT recording_id, rel_path, original_path FROM recording_paths WHERE is_primary = 0 ORDER BY recording_id, rel_path'),
    audio_decisions: all('SELECT a_id, b_id, decision FROM audio_matches WHERE decision IS NOT NULL ORDER BY a_id, b_id'),
    placements: all('SELECT recording_id, season_id, is_base, note FROM placements ORDER BY recording_id, season_id'),
    recording_tags: all('SELECT recording_id, tag_id FROM recording_tags ORDER BY recording_id, tag_id'),
    recording_attributes: all('SELECT recording_id, key, value FROM recording_attributes ORDER BY recording_id, key'),
    // Names you typed yourself; the seeded ones are re-created by the import
    suggestions: all("SELECT field, text, uses FROM suggestions WHERE source = 'entered' ORDER BY field, text"),
  };
  return body;
}

const fingerprint = (body) => crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

function writeAtomic(file, text) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

function prune(dir, prefix, keep) {
  const files = fs.readdirSync(dir).filter(f => f.startsWith(prefix)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) fs.unlinkSync(path.join(dir, f));
}

let lastFingerprint = null;

/** Write the latest decisions file and a timestamped snapshot. Skips if nothing changed. */
function writeBackup(db, { force = false, withDb = false } = {}) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const body = exportDecisions(db);
  const fp = fingerprint(body);
  if (!force && fp === lastFingerprint) return { written: false };
  lastFingerprint = fp;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const text = JSON.stringify({ ...body, exported_at: new Date().toISOString() }, null, 1);
  writeAtomic(LATEST, text);
  writeAtomic(path.join(SNAPSHOT_DIR, `decisions-${stamp}.json`), text);
  prune(SNAPSHOT_DIR, 'decisions-', KEEP_JSON_SNAPSHOTS);
  return { written: true, stamp, counts: { folders: body.folders.length, recordings: body.recordings.length, hymns: body.hymns.length }, withDb };
}

/** A full database copy, made with SQLite's online backup so it is safe while the server runs. */
async function writeDbSnapshot(db) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  await db.backup(path.join(SNAPSHOT_DIR, `psaltos-${stamp}.db`));
  prune(SNAPSHOT_DIR, 'psaltos-', KEEP_DB_SNAPSHOTS);
}

let timer = null;
let lastDbSnapshot = 0;

/** Call after any change. Backs up ~15 seconds later; further changes in that window share the same backup. */
function scheduleBackup(db) {
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    try {
      writeBackup(db);
      if (Date.now() - lastDbSnapshot > 30 * 60 * 1000) { // a full database copy at most every 30 minutes
        lastDbSnapshot = Date.now();
        await writeDbSnapshot(db);
      }
    } catch (err) { console.error('[backup] failed:', err.message); }
  }, DEBOUNCE_MS);
  timer.unref?.();
}

/** Back up on startup and when the process stops, so nothing is lost between changes and exit. */
function installBackupHooks(db) {
  const flush = () => { try { writeBackup(db); } catch (err) { console.error('[backup] failed:', err.message); } };
  setTimeout(flush, 3000).unref?.();
  process.on('exit', flush);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(0)); // 'exit' then writes the backup
  process.once('SIGUSR2', () => { flush(); process.kill(process.pid, 'SIGUSR2'); }); // nodemon restart
}

module.exports = { exportDecisions, writeBackup, writeDbSnapshot, scheduleBackup, installBackupHooks, LATEST, BACKUP_DIR };
