import { NavLink, Outlet } from 'react-router-dom';
import './admin.css';

const NAV_ITEMS = [
  { to: '/admin/triage', label: 'Folder Triage' },
  { to: '/admin/duplicates', label: 'Audio Duplicates' },
  { to: '/admin/naming', label: 'Naming Queue' },
  { to: '/admin/seasons', label: 'Seasons' },
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
