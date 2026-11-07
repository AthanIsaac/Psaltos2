import { ADMIN_API } from '../config.js';
import { useEffect, useState } from 'react';

const API = ADMIN_API;

export default function Overview() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/manifest/summary`)
      .then(r => r.json())
      .then(setSummary)
      .catch(() => setError('Backend not reachable — make sure the backend server is running.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="admin-muted">Loading…</p>;
  if (error) return <p className="admin-error">{error}</p>;

  if (!summary.exists) {
    return (
      <div>
        <h2>Library Inventory</h2>
        <p className="admin-muted">No manifest found. Run the inventory script first:</p>
        <pre className="admin-code">python3 scripts/01_inventory.py</pre>
        <p className="admin-muted">This will scan AllHymns/ and produce <code>data/manifest.csv</code>.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Library Overview</h2>
      <div className="admin-stat-grid">
        <StatCard label="Total files" value={summary.total.toLocaleString()} />
        <StatCard label="Tape files" value={summary.tapes.toLocaleString()} />
        <StatCard label="Video files" value={summary.videos.toLocaleString()} />
        <StatCard label="Cantors" value={summary.cantors.length} />
      </div>
      <h3>Files per cantor</h3>
      <table className="admin-table">
        <thead>
          <tr><th>Cantor folder</th><th>Files</th></tr>
        </thead>
        <tbody>
          {summary.cantors.sort((a, b) => b.count - a.count).map(c => (
            <tr key={c.name}>
              <td>{c.name}</td>
              <td>{c.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}
