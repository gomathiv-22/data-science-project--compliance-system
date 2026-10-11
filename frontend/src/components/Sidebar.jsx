/**
 * src/components/Sidebar.jsx
 * Permanent Left Vertical Sidebar navigation for MSME Compliance Desk.
 * Aligns all 9 regulatory modules vertically on the left side of the workspace.
 */

import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  LayoutDashboard,
  FolderArchive,
  FileSearch,
  Languages,
  CheckSquare,
  ShieldAlert,
  CalendarClock,
  ClipboardCheck,
  Sliders,
  LogOut,
  Building2
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/documents', label: 'Documents', icon: FolderArchive },
  { to: '/analysis', label: 'Analysis', icon: FileSearch },
  { to: '/translation', label: 'Translation', icon: Languages },
  { to: '/compliance', label: 'Compliance', icon: CheckSquare },
  { to: '/risk-analysis', label: 'Risk Analysis', icon: ShieldAlert },
  { to: '/deadlines', label: 'Deadlines & Reminders', icon: CalendarClock },
  { to: '/reports', label: 'Reports', icon: ClipboardCheck },
  { to: '/settings', label: 'Settings', icon: Sliders },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="portal-sidebar" id="app-sidebar">
      {/* Brand Header at Top of Sidebar */}
      <div className="sidebar-brand-wrapper">
        <Link to="/dashboard" className="sidebar-brand-link">
          <div className="sidebar-brand-icon">
            <ShieldCheck size={22} strokeWidth={2.4} />
          </div>
          <div className="sidebar-brand-info">
            <h1 className="sidebar-brand-title">MSME Compliance</h1>
            <span className="sidebar-brand-badge">Regulatory Portal</span>
          </div>
        </Link>
      </div>

      {/* Vertical Navigation Links */}
      <nav className="sidebar-nav-list" aria-label="Main Navigation">
        <div className="sidebar-nav-section-label">SURVEILLANCE MODULES</div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-nav-icon">
                <Icon size={18} strokeWidth={2} />
              </span>
              <span className="sidebar-nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Profile and Sign Out */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">
            {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
          </div>
          <div className="sidebar-user-details">
            <div className="sidebar-user-name" title={user?.full_name}>
              {user?.full_name || 'Enterprise User'}
            </div>
            <div className="sidebar-user-business" title={user?.business_name}>
              <Building2 size={11} style={{ display: 'inline', marginRight: 3 }} />
              {user?.business_name || 'Registered MSME'}
            </div>
          </div>
        </div>

        {/* Tucked Sign Out Button */}
        <div className="sidebar-signout-wrapper">
          <button
            id="sidebar-signout-btn"
            className="sidebar-signout-btn"
            onClick={handleSignOut}
            title="Sign out of enterprise account"
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
