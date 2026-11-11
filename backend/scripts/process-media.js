#!/usr/bin/env node
/**
 * Background media job. For every recording it produces, once:
 *   - the duration (ffprobe)
 *   - a small mono preview mp3 that browsers can play and seek (data/previews/<id>.mp3)
 *   - a 1000-point waveform for the player
 *   - a Chromaprint fingerprint of the first 2 minutes (for duplicate detection)
 * Originals are only read. Resumable: finished recordings are skipped, so you can stop
 * (Ctrl+C) and start again at any time.
 *
 *   node scripts/process-media.js              process everything outstanding
 *   node scripts/process-media.js --limit 20   try a few first
 *   node scripts/process-media.js --retry      also retry recordings that failed before
 *   node scripts/process-media.js --status     show progress and exit
 *   --concurrency N                            parallel workers (default: half the CPU cores)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { openDb, PREVIEW_DIR } = require('../db');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};

const WAVEFORM_POINTS = 1000;
const FINGERPRINT_SECONDS = 120;

const run = (cmd, argv, opts = {}) => new Promise((resolve, reject) => {
  execFile(cmd, argv, { maxBuffer: 64 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
    if (err) reject(new Error(`${cmd} failed: ${(stderr || err.message).toString().trim().split('\n').slice(-2).join(' ')}`));
    else resolve(stdout);
  });
});

async function probeDuration(file) {
  const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  const d = parseFloat(out);
  return Number.isFinite(d) ? d : null;
}

// Mono, low bitrate: plenty for recognising a hymn, and ~1/10th the size of a wav
async function makePreview(src, dest, tolerant = false) {
  const tmp = `${dest}.tmp.mp3`;
  // Tolerant mode skips damaged frames so partly corrupt files still give a usable preview
  const input = tolerant ? ['-err_detect', 'ignore_err', '-fflags', '+discardcorrupt+genpts', '-i', src] : ['-i', src];
  await run('ffmpeg', ['-nostdin', '-y', '-v', 'error', ...input, '-map', '0:a:0', '-vn',
    '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '64k', tmp]);
  fs.renameSync(tmp, dest);
}

// Peak level per bucket, scaled 0-255, computed by streaming decoded samples
function makeWaveform(previewFile, durationSeconds) {
  return new Promise((resolve, reject) => {
    const RATE = 4000;
    const total = Math.max(1, Math.floor(durationSeconds * RATE));
    const perBucket = Math.max(1, Math.ceil(total / WAVEFORM_POINTS));
    const peaks = new Uint8Array(WAVEFORM_POINTS);
    let sample = 0;
    let leftover = null;

    const ff = spawn('ffmpeg', ['-nostdin', '-v', 'error', '-i', previewFile, '-ac', '1', '-ar', String(RATE), '-f', 's16le', '-']);
    let stderr = '';
    ff.stderr.on('data', d => { stderr += d; });
    ff.stdout.on('data', (chunk) => {
      if (leftover) { chunk = Buffer.concat([leftover, chunk]); leftover = null; }
      const usable = chunk.length - (chunk.length % 2);
      if (usable < chunk.length) leftover = chunk.subarray(usable);
      for (let i = 0; i < usable; i += 2) {
        const level = Math.min(255, Math.abs(chunk.readInt16LE(i)) >> 7); // 32768 >> 7 = 256
        const bucket = Math.min(WAVEFORM_POINTS - 1, Math.floor(sample / perBucket));
        if (level > peaks[bucket]) peaks[bucket] = level;
        sample++;
      }
    });
    ff.on('error', reject);
    ff.on('close', (code) => code === 0 ? resolve(Buffer.from(peaks)) : reject(new Error(`ffmpeg waveform failed: ${stderr.trim().split('\n').slice(-1)}`)));
  });
}

async function makeFingerprint(previewFile) {
  const out = await run('fpcalc', ['-raw', '-length', String(FINGERPRINT_SECONDS), '-json', previewFile]);
  const ints = JSON.parse(out).fingerprint;
  const buf = Buffer.alloc(ints.length * 4);
  ints.forEach((n, i) => buf.writeInt32LE(n | 0, i * 4));
  return buf;
}

function showStatus(db) {
  const c = (sql) => db.prepare(sql).get().n;
  const total = c("SELECT COUNT(*) n FROM recordings WHERE status != 'merged'");
  const done = c('SELECT COUNT(*) n FROM media WHERE preview_ok = 1');
  const failed = c('SELECT COUNT(*) n FROM media WHERE preview_ok = 0 AND error IS NOT NULL');
  console.log(`Processed ${done} / ${total} recordings (${failed} failed, ${total - done - failed} to do)`);
  return { total, done, failed };
}

async function main() {
  const db = openDb();
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  if (flag('status')) { showStatus(db); return; }

  const retry = flag('retry');
  const limit = option('limit', Infinity);
  const concurrency = Math.max(1, option('concurrency', Math.floor(os.cpus().length / 2)));

  const pending = db.prepare(`
    SELECT r.id, r.original_path, r.rel_path FROM recordings r
    LEFT JOIN media m ON m.recording_id = r.id
    WHERE r.status != 'merged'
      AND (m.recording_id IS NULL OR (m.preview_ok = 0 AND ${retry ? '1' : 'm.error IS NULL'}))
    ORDER BY r.size_bytes ASC`).all().slice(0, limit); // small files first, so progress is visible quickly

  const save = db.prepare(`INSERT INTO media (recording_id, duration_s, preview_ok, waveform, fingerprint, error, processed_at)
    VALUES (@id, @duration, @ok, @waveform, @fingerprint, @error, CURRENT_TIMESTAMP)
    ON CONFLICT(recording_id) DO UPDATE SET duration_s=@duration, preview_ok=@ok, waveform=@waveform,
      fingerprint=@fingerprint, error=@error, processed_at=CURRENT_TIMESTAMP`);

  console.log(`${pending.length} recordings to process with ${concurrency} workers`);
  let next = 0, finished = 0, failures = 0, stopping = false;
  const startedAt = Date.now();
  process.on('SIGINT', () => { if (stopping) process.exit(1); stopping = true; console.log('\nStopping after the current files (Ctrl+C again to force)…'); });

  async function processOne(rec) {
    const preview = path.join(PREVIEW_DIR, `${rec.id}.mp3`);
    const result = { id: rec.id, duration: null, ok: 0, waveform: null, fingerprint: null, error: null };
    try {
      if (!fs.existsSync(rec.original_path)) throw new Error('original file not found');
      result.duration = await probeDuration(rec.original_path).catch(() => null);
      if (!fs.existsSync(preview)) {
        await makePreview(rec.original_path, preview).catch(() => makePreview(rec.original_path, preview, true));
      }
      const previewDuration = (await probeDuration(preview)) || result.duration || 1;
      result.duration = result.duration || previewDuration;
      result.waveform = await makeWaveform(preview, previewDuration);
      result.fingerprint = await makeFingerprint(preview).catch(() => null); // very short clips can fail; not fatal
      result.ok = 1;
    } catch (err) {
      result.error = err.message.slice(0, 300);
      failures++;
      console.error(`FAILED ${rec.rel_path}: ${result.error}`);
    }
    save.run(result);
  }

  async function worker() {
    while (!stopping && next < pending.length) {
      await processOne(pending[next++]);
      finished++;
      if (finished % 25 === 0 || finished === pending.length) {
        const rate = finished / ((Date.now() - startedAt) / 1000);
        const eta = Math.round((pending.length - finished) / rate / 60);
        console.log(`${finished} / ${pending.length} done (${failures} failed), ~${eta} min left`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(stopping ? 'Stopped.' : 'Finished.');
  showStatus(db);
}

main().catch((err) => { console.error(err); process.exit(1); });
