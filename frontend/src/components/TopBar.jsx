/**
 * src/components/TopBar.jsx
 * Top header bar for the main content area in the portal layout.
 * Houses the compliance deadline alert bell.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Bell, Check, CheckCheck,
  FileText, Shield, Sparkles
} from 'lucide-react';

export const TopBar = () => {
  const { user, isAuthenticated } = useAuth();

  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const bellRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
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

  return (
    <header className="portal-topbar" id="app-topbar">
      {/* Left: Enterprise Status Indicator */}
      <div className="topbar-left">
        <div className="topbar-status-pill">
          <span className="topbar-status-dot" />
          <span className="topbar-status-text">
            Statutory Surveillance Active &bull; {user?.business_name || 'Enterprise Workspace'}
          </span>
        </div>
      </div>

      {/* Right: Notification Bell */}
      <div className="topbar-right">
        {/* Notification Bell */}
        <div className="notification-bell-wrap" ref={bellRef} style={{ position: 'relative' }}>
          <button
            id="notification-bell-btn"
            className="topbar-bell-btn"
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
      </div>
    </header>
  );
};
