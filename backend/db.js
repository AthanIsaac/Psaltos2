// Library database: the source of truth for the admin cataloguing workflow.
// Original files are never moved or modified; every recording keeps its original path.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');

// Where audio lives. Paths in the database are relative to this, so moving to S3 later
// means changing this one base (plus uploading the files at the same relative keys).
const AUDIO_ROOT = process.env.AUDIO_ROOT || path.join(REPO_ROOT, 'AllHymns');
const PREVIEW_DIR = process.env.PREVIEW_DIR || path.join(DATA_DIR, 'previews');
const DB_FILE = process.env.LIBRARY_DB || path.join(DATA_DIR, 'psaltos.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_coptic TEXT DEFAULT '',
  name_ar TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cantors (
  id TEXT PRIMARY KEY,              -- top-level folder name
  display_name TEXT NOT NULL
);

-- Every directory that contains media, plus its ancestors, for the triage tree
CREATE TABLE IF NOT EXISTS folders (
  path TEXT PRIMARY KEY,            -- relative to AUDIO_ROOT
  cantor_id TEXT NOT NULL REFERENCES cantors(id),
  parent TEXT,                      -- parent folder path, NULL for a cantor root
  name TEXT NOT NULL,
  season_id TEXT REFERENCES seasons(id),   -- suggested base season for files inside
  flag TEXT                         -- NULL | junk | lessons | tape | video | other
);
CREATE INDEX IF NOT EXISTS folders_parent ON folders(parent);

CREATE TABLE IF NOT EXISTS hymns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  english_title TEXT DEFAULT '',    -- descriptive, e.g. "A Song for the Resurrection (Tone 2)"
  coptic_name TEXT DEFAULT '',      -- first words of the text
  coptic_title TEXT DEFAULT '',
  english_name TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,              -- file_id from the manifest
  cantor_id TEXT NOT NULL REFERENCES cantors(id),
  folder TEXT NOT NULL REFERENCES folders(path),
  rel_path TEXT NOT NULL UNIQUE,    -- primary location, relative to AUDIO_ROOT
  original_path TEXT NOT NULL,      -- absolute path as first inventoried
  filename TEXT NOT NULL,
  ext TEXT NOT NULL,
  size_bytes INTEGER,
  sha256 TEXT,
  kind TEXT NOT NULL DEFAULT 'audio',      -- audio | video
  -- todo | done | skipped | junk | tape | multi | video | merged
  status TEXT NOT NULL DEFAULT 'todo',
  merged_into TEXT REFERENCES recordings(id),
  hymn_id INTEGER REFERENCES hymns(id),
  season_id TEXT REFERENCES seasons(id),   -- base season
  version_label TEXT DEFAULT '',           -- e.g. "1980s"
  context_note TEXT DEFAULT '',            -- e.g. "slightly different in Lent"
  notes TEXT DEFAULT '',
  -- hints from earlier manual work (cache.json); shown, never applied automatically
  hint_coptic_title TEXT DEFAULT '',
  hint_notes TEXT DEFAULT '',
  hint_dest_folder TEXT DEFAULT '',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS recordings_folder ON recordings(folder);
CREATE INDEX IF NOT EXISTS recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS recordings_hymn ON recordings(hymn_id);
CREATE INDEX IF NOT EXISTS recordings_sha ON recordings(sha256);

-- Every known location of a recording (primary plus exact duplicates merged into it)
CREATE TABLE IF NOT EXISTS recording_paths (
  recording_id TEXT NOT NULL REFERENCES recordings(id),
  rel_path TEXT NOT NULL,
  original_path TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (recording_id, rel_path)
);

-- Seasons a recording appears in. The base season is mirrored here with is_base = 1;
-- extra placements are added later, each with its own note.
CREATE TABLE IF NOT EXISTS placements (
  recording_id TEXT NOT NULL REFERENCES recordings(id),
  season_id TEXT NOT NULL REFERENCES seasons(id),
  is_base INTEGER NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  PRIMARY KEY (recording_id, season_id)
);

-- Autocomplete: seeds from earlier work, plus every name entered as you go
CREATE TABLE IF NOT EXISTS suggestions (
  field TEXT NOT NULL,              -- english_title | coptic_name | coptic_title | english_name
  text TEXT NOT NULL,
  source TEXT NOT NULL,             -- cache.json | entered
  uses INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (field, text)
);

-- Results of the background media job
CREATE TABLE IF NOT EXISTS media (
  recording_id TEXT PRIMARY KEY REFERENCES recordings(id),
  duration_s REAL,
  preview_ok INTEGER NOT NULL DEFAULT 0,
  waveform BLOB,                    -- 1000 bytes of peak levels (0-255)
  fingerprint BLOB,                 -- Chromaprint raw ints (Int32 little endian), first 120 s
  error TEXT,
  processed_at TEXT
);

-- Every change, so any action can be undone
CREATE TABLE IF NOT EXISTS undo_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  ts TEXT DEFAULT CURRENT_TIMESTAMP,
  label TEXT,
  statements TEXT NOT NULL          -- JSON: [{sql, params}] that revert the change
);
`;

// Additions made after the first release. Each runs once, guarded by a column/table check.
const TAGS_SCHEMA = `
-- Free-form labels such as live / instructional. Folders carry defaults that files inherit.
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS recording_tags (
  recording_id TEXT NOT NULL REFERENCES recordings(id),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (recording_id, tag_id)
);
CREATE TABLE IF NOT EXISTS folder_tags (
  folder_path TEXT NOT NULL REFERENCES folders(path),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (folder_path, tag_id)
);
`;

const STARTER_TAGS = [
  ['live', 'Live'],
  ['instructional', 'Instructional'],
];

function addColumn(db, table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function migrate(db) {
  // Year or period the recording was made, free text: "1985", "1980s", "2000s"
  addColumn(db, 'recordings', 'year_text', "TEXT DEFAULT ''");
  addColumn(db, 'folders', 'year_text', "TEXT DEFAULT ''");   // default for files inside
  // Guesses read from file and folder names; shown as suggestions, never applied automatically
  addColumn(db, 'recordings', 'hint_year', "TEXT DEFAULT ''");
  addColumn(db, 'recordings', 'hint_tags', "TEXT DEFAULT ''");
  // The old importer's "copticName" is the first words of the hymn text, i.e. the Coptic *name*
  const cols = db.prepare('PRAGMA table_info(recordings)').all().map(c => c.name);
  if (cols.includes('hint_coptic_title') && !cols.includes('hint_coptic_name')) {
    db.exec('ALTER TABLE recordings RENAME COLUMN hint_coptic_title TO hint_coptic_name');
  }
  db.exec("UPDATE suggestions SET field = 'coptic_name' WHERE source = 'cache.json' AND field = 'coptic_title'");

  // A catch-all season (e.g. MISC) holds files that still need a real season. Mark existing
  // MISC-like seasons once, when the column is first added; after that it's set in the season editor.
  const hadCatchall = db.prepare('PRAGMA table_info(seasons)').all().some(c => c.name === 'is_catchall');
  addColumn(db, 'seasons', 'is_catchall', 'INTEGER NOT NULL DEFAULT 0');
  if (!hadCatchall) db.exec("UPDATE seasons SET is_catchall = 1 WHERE lower(name_en) IN ('misc', 'miscellaneous')");

  // Status the recording had when imported, so backups only need to record what you changed
  addColumn(db, 'recordings', 'import_status', 'TEXT');
  db.exec('UPDATE recordings SET import_status = status WHERE import_status IS NULL');
  db.exec(TAGS_SCHEMA);
  // Pairs of recordings that sound the same, found by comparing audio fingerprints
  db.exec(`CREATE TABLE IF NOT EXISTS audio_matches (
    a_id TEXT NOT NULL REFERENCES recordings(id),
    b_id TEXT NOT NULL REFERENCES recordings(id),
    offset_s REAL,          -- how far into b the audio of a starts (negative: the other way round)
    ber REAL,               -- bit error rate of the overlap (0 = identical, ~0.5 = unrelated)
    overlap_s REAL,
    kind TEXT,              -- same | contained | partial
    decision TEXT,          -- NULL | merged | different
    PRIMARY KEY (a_id, b_id)
  )`);
  // Catch-all for one-off facts (e.g. "venue" = "St. Mark's") so new details never need a schema change
  db.exec(`CREATE TABLE IF NOT EXISTS recording_attributes (
    recording_id TEXT NOT NULL REFERENCES recordings(id),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (recording_id, key)
  )`);
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (id, label, sort_order) VALUES (?,?,?)');
  STARTER_TAGS.forEach(([id, label], i) => insertTag.run(id, label, i));
}

function openDb(file = DB_FILE) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

let shared = null;
/** One shared connection for the server process */
function getDb() {
  if (!shared) shared = openDb();
  return shared;
}

module.exports = { getDb, openDb, AUDIO_ROOT, PREVIEW_DIR, DB_FILE, DATA_DIR, REPO_ROOT };
