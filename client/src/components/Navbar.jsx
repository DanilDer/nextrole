import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/applications', label: 'Applications' },
  { to: '/resume', label: 'Resume' },
  { to: '/interviews', label: 'Interviews' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const firstName = user?.name?.split(' ')[0] ?? 'User';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/dashboard" className="navbar-logo">
          NextRole
        </NavLink>

        <button
          className="navbar-hamburger"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>

        <ul className={`navbar-links${menuOpen ? ' open' : ''}`}>
          {NAV_LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="navbar-user">
          <span className="navbar-username">{firstName}</span>
          <button className="btn-signout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
