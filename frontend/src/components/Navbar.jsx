/**
 * src/components/Navbar.jsx
 * Enterprise top navigation with brand shield, 4-language selector, deadline notification bell,
 * compact profile block, and comprehensive enterprise subnavigation bar.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { 
  ShieldCheck, Globe, Bell, ChevronDown, Check, CheckCheck, 
  AlertTriangle, Clock, LogOut, FileText,
  LayoutDashboard, FolderArchive, FileSearch, Languages,
  CheckSquare, ShieldAlert, CalendarClock, ClipboardCheck, Sliders
} from 'lucide-react';

const SUPPORTED_LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

export const Navbar = () => {
  const { user, logout, activeLanguage, changeLanguage, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Dropdown states
  const [langOpen, setLangOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const langRef = useRef(null);
  const bellRef = useRef(null);
  const profileRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.warn('Could not fetch notifications:', err);
    }
  };

  // Poll notifications every 60s and on window focus
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleSignOut = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const activeLangObj = SUPPORTED_LANGS.find((l) => l.code === activeLanguage) || SUPPORTED_LANGS[0];

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/dashboard" className="navbar-brand" id="nav-brand-link">
          <div className="brand-icon">
            <ShieldCheck size={20} strokeWidth={2.4} />
          </div>
          <div className="brand-text">
            <h1>
              MSME Compliance Desk <span className="brand-badge">Regulatory Portal</span>
            </h1>
          </div>
        </Link>

        {/* Right actions */}
        <div className="navbar-actions">
          {/* 1. Language selector (English, Tamil, Malayalam, Telugu) */}
          <div className="lang-selector-wrap" ref={langRef}>
            <button
              id="lang-selector-btn"
              className="lang-selector-btn"
              onClick={() => setLangOpen(!langOpen)}
              title="Select statutory language"
            >
              <Globe size={15} />
              <span>{activeLangObj.native}</span>
              <ChevronDown size={13} />
            </button>

            {langOpen && (
              <div className="lang-dropdown-menu">
                {SUPPORTED_LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    className={`lang-dropdown-item ${activeLanguage === lang.code ? 'active' : ''}`}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setLangOpen(false);
                    }}
                  >
                    <span>{lang.native} ({lang.label})</span>
                    {activeLanguage === lang.code && <Check size={14} color="var(--color-navy-700)" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAuthenticated && (
            <>
              {/* 2. Notification Bell */}
              <div className="notification-bell-wrap" ref={bellRef} style={{ position: 'relative' }}>
                <button
                  id="notification-bell-btn"
                  className="notification-bell-btn"
                  onClick={() => setBellOpen(!bellOpen)}
                  title="Compliance Deadlines & Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className={`bell-badge ${notifications.some(n => !n.is_read && n.type === 'danger') ? 'urgent' : ''}`}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="notifications-panel" id="notifications-panel">
                    <div className="notifications-header">
                      <h4>Statutory Deadlines & Alerts ({unreadCount} unread)</h4>
                      {unreadCount > 0 && (
                        <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="notifications-list">
                      {notifications.length === 0 ? (
                        <div className="notifications-empty">
                          <CheckCheck size={28} color="var(--status-safe-text)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                          All compliance obligations are up to date.
                        </div>
                      ) : (
                        notifications.map((item) => {
                          const isOverdue = item.message.toLowerCase().includes('overdue');
                          return (
                            <div
                              key={item.id}
                              className={`notification-item ${!item.is_read ? 'unread' : ''} ${isOverdue ? 'is-overdue' : ''}`}
                            >
                              <div className="notification-content">
                                <div className="notification-meta">
                                  <span className={`notification-category ${(item.category || '').toLowerCase()}`}>
                                    {item.category || 'Compliance'}
                                  </span>
                                  {item.days_remaining !== null && item.days_remaining !== undefined && (
                                    <span className={`notification-days ${item.days_remaining < 0 ? 'overdue' : item.days_remaining <= 3 ? 'urgent' : ''}`}>
                                      {item.days_remaining < 0
                                        ? `Overdue by ${Math.abs(item.days_remaining)}d`
                                        : item.days_remaining === 0
                                        ? 'Due Today'
                                        : `${item.days_remaining}d left`}
                                    </span>
                                  )}
                                </div>
                                <p className="notification-text">{item.message}</p>
                                {item.document_name && (
                                  <p className="notification-date">
                                    <FileText size={11} style={{ display: 'inline', marginRight: 4 }} />
                                    {item.document_name}
                                  </p>
                                )}
                              </div>
                              {!item.is_read && (
                                <button
                                  className="notification-mark-read"
                                  onClick={(e) => handleMarkRead(item.id, e)}
                                  title="Mark as read"
                                >
                                  <Check size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Compact Profile Block with Tucked-at-the-Bottom Sign Out Link */}
              <div className="profile-block-wrap" ref={profileRef}>
                <button
                  id="profile-menu-btn"
                  className="profile-block-btn"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <div className="profile-avatar">
                    {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="profile-info-text">
                    <div className="profile-name">{user?.full_name || 'Enterprise'}</div>
                    <div className="profile-business">{user?.business_name || 'MSME Unit'}</div>
                  </div>
                  <ChevronDown size={13} style={{ color: '#94A3B8' }} />
                </button>

                {profileOpen && (
                  <div className="profile-dropdown-menu" id="profile-dropdown-menu">
                    <div className="profile-dropdown-header">
                      <div className="p-name">{user?.full_name}</div>
                      <div className="p-email">{user?.email}</div>
                    </div>

                    <div className="profile-dropdown-section">
                      <label>Enterprise Entity</label>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-navy-950)' }}>
                        {user?.business_name || 'Registered MSME'}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-light)', padding: '0.4rem 1rem' }}>
                      <Link
                        to="/settings"
                        onClick={() => setProfileOpen(false)}
                        style={{ fontSize: '0.82rem', color: 'var(--color-navy-700)', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0' }}
                      >
                        <Sliders size={13} />
                        <span>Settings</span>
                      </Link>
                    </div>

                    {/* Small, tucked-at-the-bottom Sign Out link */}
                    <div className="profile-signout-container">
                      <button
                        id="signout-link"
                        className="signout-link"
                        onClick={handleSignOut}
                      >
                        <LogOut size={12} />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Enterprise Full Navigation Tabs */}
      {isAuthenticated && (
        <nav className="subnavbar" id="subnavbar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `subnav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/documents" className={({ isActive }) => `subnav-link ${isActive ? 'active' : ''}`}>
            <FolderArchive size={14} />
            <span>Documents</span>
          </NavLink>
          <NavLink to="/analysis" className={({ isActive }) => `subnav-link ${isActive ? 'active' : ''}`}>
            <FileSearch size={14} />
            <span>Analysis</span>
          </NavLink>
          <NavLink to="/translation" className={({ isActive }) => `subnav-link ${isActive ? 'active' : ''}`}>
            <Languages size={14} />
            <span>Translation</span>
          </NavLink>
          <NavLink to="/compliance" className={({ isActive }) => `subnav-link ${isActive ? 'active' : ''}`}>
            <CheckSquare size={14} />
            <span>Compliance</span>
          </NavLink>
          <NavLink to="/risk-analysis" className={({ isActive }) => `subnav-link ${isActive ? 'active' : ''}`}>
            <ShieldAlert size={14} />
            <span>Risk Analysis</span>
          </NavLink>
          <NavLink to="/deadlines" className={({ isActive }) => `subnav-link ${isActive ? 'active' : ''}`}>
            <CalendarClock size={14} />
            <span>Deadlines & Reminders</span>
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `subnav-link ${isActive ? 'active' : ''}`}>
            <ClipboardCheck size={14} />
            <span>Reports</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `subnav-link ${isActive ? 'active' : ''}`}>
            <Sliders size={14} />
            <span>Settings</span>
          </NavLink>
        </nav>
      )}
    </header>
  );
};
