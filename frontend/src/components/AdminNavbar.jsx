import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Shared premium admin navbar.
 * Props:
 *   title      — page heading  (e.g. "👥 User Management")
 *   subtitle   — optional sub-text below the title
 *   backTo     — Link target for "← back" button (default: /admin/dashboard, pass false to hide)
 *   backLabel  — label for the back button (default: "Dashboard")
 *   actions    — optional ReactNode rendered on the right side
 */
export default function AdminNavbar({
  title,
  subtitle,
  backTo = '/admin/dashboard',
  backLabel = 'Dashboard',
  actions,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [narrow, setNarrow] = React.useState(() => window.innerWidth < 900);

  React.useEffect(() => {
    const handler = () => setNarrow(window.innerWidth < 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header style={styles.header}>
      {/* ── top bar ── */}
      <div style={styles.topBar}>

        {/* Left: Home pill + back + title */}
        <div style={styles.left}>
          {/* Home Site pill — always visible */}
          <Link to="/home" style={styles.homePill}>
            🏠 Home Site
          </Link>

          {backTo !== false && (
            <Link to={backTo} style={styles.backBtn}>
              ← {backLabel}
            </Link>
          )}

          <div style={styles.titleBlock}>
            <h1 style={styles.title}>{title}</h1>
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>

        {/* Right: actions + user + logout + hamburger */}
        <div style={styles.right}>
          {actions && <div style={styles.actionsSlot}>{actions}</div>}

          <div style={{ ...styles.userBlock, display: narrow ? 'none' : 'flex' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={styles.userName}>{user?.first_name} {user?.last_name}</div>
              <div style={styles.userRole}>ADMINISTRATOR</div>
            </div>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          </div>

          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ ...styles.hamburger, display: narrow ? 'flex' : 'none' }}
            aria-label="Toggle menu"
          >
            <span style={{ ...styles.bar, transform: menuOpen ? 'rotate(45deg) translate(5px, 6px)' : 'none' }} />
            <span style={{ ...styles.bar, opacity: menuOpen ? 0 : 1 }} />
            <span style={{ ...styles.bar, transform: menuOpen ? 'rotate(-45deg) translate(5px, -6px)' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── mobile slide-in drawer ── */}
      {menuOpen && (
        <div style={styles.mobileOverlay} onClick={() => setMenuOpen(false)}>
          <div style={styles.mobileMenu} onClick={e => e.stopPropagation()}>
            {/* User info */}
            <div style={styles.mobileHeader}>
              <div>
                <div style={styles.mobileUserName}>{user?.first_name} {user?.last_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--primary-color,#3498db)', fontWeight: 600, marginTop: '2px' }}>
                  ADMINISTRATOR
                </div>
              </div>
              <button onClick={handleLogout} style={styles.mobileLogout}>Logout</button>
            </div>

            {/* Home + back links in drawer */}
            <nav style={styles.mobileNav}>
              <Link
                to="/home"
                onClick={() => setMenuOpen(false)}
                style={{ ...styles.mobileNavLink, color: '#2ecc71', fontWeight: '700', borderLeft: '3px solid #2ecc71' }}
              >
                🏠 Home Site
              </Link>
              {backTo !== false && (
                <Link
                  to={backTo}
                  onClick={() => setMenuOpen(false)}
                  style={{ ...styles.mobileNavLink, borderLeft: '3px solid var(--primary-color,#3498db)' }}
                >
                  ← {backLabel}
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

const styles = {
  header: {
    background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 100%)',
    color: 'white',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    fontFamily: "'Inter','Segoe UI',sans-serif",
  },
  topBar: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '14px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: 0,
  },
  homePill: {
    color: '#2ecc71',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '700',
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1.5px solid #2ecc71',
    backgroundColor: 'rgba(46,204,113,0.12)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.2s',
    letterSpacing: '0.2px',
  },
  backBtn: {
    color: '#7f8c8d',
    textDecoration: 'none',
    fontSize: '13px',
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  titleBlock: {
    minWidth: 0,
    overflow: 'hidden',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '-0.3px',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subtitle: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: '#7f8c8d',
    whiteSpace: 'nowrap',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
  actionsSlot: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userBlock: {
    alignItems: 'center',
    gap: '12px',
  },
  userName: {
    fontWeight: '600',
    fontSize: '13px',
  },
  userRole: {
    fontSize: '10px',
    color: 'var(--primary-color, #3498db)',
    fontWeight: '700',
    letterSpacing: '0.8px',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'white',
    padding: '7px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  },
  hamburger: {
    flexDirection: 'column',
    gap: '5px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  bar: {
    width: '24px',
    height: '2px',
    backgroundColor: 'white',
    borderRadius: '2px',
    display: 'block',
    transition: 'transform 0.25s, opacity 0.25s',
  },
  // Mobile drawer
  mobileOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 999,
  },
  mobileMenu: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '260px',
    height: '100%',
    background: 'linear-gradient(180deg, #1a252f, #2c3e50)',
    zIndex: 1000,
    padding: '24px 20px',
    overflowY: 'auto',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
  },
  mobileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '18px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  mobileUserName: {
    color: 'white',
    fontWeight: '600',
    fontSize: '14px',
    marginBottom: '2px',
  },
  mobileLogout: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'white',
    padding: '5px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  mobileNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  mobileNavLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '11px 14px',
    borderRadius: '8px',
    transition: 'background 0.2s',
    display: 'block',
    borderLeft: '3px solid transparent',
  },
};
