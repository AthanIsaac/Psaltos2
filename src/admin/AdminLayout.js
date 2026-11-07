import { NavLink, Outlet } from 'react-router-dom';
import './admin.css';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/seasons', label: 'Season Manager' },
  { to: '/admin/duplicates', label: 'Duplicate Review' },
  { to: '/admin/tapes', label: 'Tape Splitter' },
  { to: '/admin/season-assign', label: 'Season Assigner' },
  { to: '/admin/enrich', label: 'Metadata Enricher' },
];

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <div className="admin-nav-title">Psaltos Admin</div>
        {NAV_ITEMS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
