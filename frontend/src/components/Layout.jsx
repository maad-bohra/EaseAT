import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import {
  IconGraduationCap,
  IconHome,
  IconBook,
  IconGrid,
  IconCheckSquare,
  IconCalendar,
  IconLandmark,
  IconBell,
  IconSparkles,
  IconUserCircle,
  IconSettings,
  IconMenu,
  IconX,
} from './icons.jsx';

const LINKS = [
  ['/', 'Dashboard', IconHome],
  ['/subjects', 'Subjects', IconBook],
  ['/timetable', 'Timetable', IconGrid],
  ['/attendance', 'Attendance', IconCheckSquare],
  ['/calendar', 'Calendar', IconCalendar],
  ['/academic-calendar', 'Academic calendar', IconLandmark],
  ['/notifications', 'Notifications', IconBell],
  ['/assistant', 'Assistant', IconSparkles],
  ['/profile', 'Profile', IconUserCircle],
  ['/settings', 'Settings', IconSettings],
];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      api.notifications
        .list({ limit: 1 })
        .then((data) => active && setUnread(data.unread))
        .catch(() => {});
    load();
    const id = window.setInterval(load, 60000);
    window.addEventListener('attendly:notifications', load);
    return () => {
      active = false;
      window.clearInterval(id);
      window.removeEventListener('attendly:notifications', load);
    };
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="shell">
      <div className="topbar">
        <button type="button" className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <IconMenu size={20} />
        </button>
        <div className="brand" style={{ fontSize: '1.05rem' }}>
          <span className="brand-mark">
            <IconGraduationCap size={16} />
          </span>
          Attendly
        </div>
      </div>

      {menuOpen && <div className="nav-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-mark">
              <IconGraduationCap size={19} />
            </span>
            <span className="brand-text">
              Attendly
              <span>attendance, counted properly</span>
            </span>
          </div>
          <button type="button" className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <IconX size={18} />
          </button>
        </div>
        <nav className="nav">
          {LINKS.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={18} />
              {label}
              {to === '/notifications' && unread > 0 && <em className="nav-badge">{unread}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="sidebar-foot-avatar">{initials(user?.name)}</span>
          <div className="sidebar-foot-meta">
            <strong>{user?.name}</strong>
            <button type="button" className="sidebar-signout" onClick={() => { signOut(); navigate('/login'); }}>
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
