const crypto = require('crypto');
const { scheduleBackup } = require('./backup');

/**
 * Run `change` inside a transaction. It must return the statements ({sql, params}) that would
 * revert it; they are logged so the last change can be undone, and a backup is scheduled.
 */
function withUndo(db, label, change) {
  let result;
  db.transaction(() => {
    const out = change();
    const inverse = Array.isArray(out) ? out : out.inverse;
    result = Array.isArray(out) ? undefined : out.result;
    if (inverse.length) {
      db.prepare('INSERT INTO undo_log (batch_id, label, statements) VALUES (?,?,?)')
        .run(crypto.randomUUID(), label, JSON.stringify(inverse));
    }
  })();
  scheduleBackup(db);
  return result;
}

module.exports = { withUndo };
