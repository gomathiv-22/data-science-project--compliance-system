/**
 * src/pages/DeadlinesPage.jsx
 * Deadlines & Reminders Surveillance Cockpit with 7-3-1-0 day alerts.
 */

import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { CalendarClock, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DeadlinesPage = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchDeadlines = async () => {
    try {
      setLoading(true);
      const res = await api.get('/deadlines');
      setDeadlines(res.data.deadlines || []);
    } catch (err) {
      console.error('Failed to load deadlines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const handleComplete = async (id) => {
    try {
      await api.post(`/deadlines/${id}/complete`);
      fetchDeadlines();
    } catch (err) {
      console.error('Failed to mark complete:', err);
    }
  };

  const filtered = deadlines.filter((d) => {
    if (filter === 'active') return d.status !== 'completed';
    if (filter === 'overdue') return d.days_remaining !== null && d.days_remaining < 0;
    if (filter === 'completed') return d.status === 'completed';
    return true;
  });

  return (
    <div className="main-container">
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Deadlines & Statutory Reminders</h2>
          <p>Automated daily scanning across 7-day, 3-day, and 1-day threshold triggers.</p>
        </div>

        <button className="btn-secondary" onClick={fetchDeadlines}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['all', 'active', 'overdue', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-sm)',
              background: filter === f ? 'var(--color-navy-900)' : '#fff',
              color: filter === f ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border-medium)',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} Deadlines
          </button>
        ))}
      </div>

      {/* Deadlines List Table */}
      <div className="content-section-card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Compliance Matter</th>
                <th>Category</th>
                <th>Due Date</th>
                <th>Surveillance Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    No deadlines matching filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const days = d.days_remaining;
                  const isOverdue = days !== null && days < 0;
                  const isUrgent = days !== null && days <= 3 && days >= 0;

                  return (
                    <tr key={d.id} className={isOverdue ? 'is-overdue' : ''}>
                      <td className="doc-name-cell">
                        <div>{d.title}</div>
                        {d.document_name && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            {d.document_name}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`category-pill ${(d.category || '').toLowerCase()}`}>
                          {d.category || 'General'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: isOverdue ? 'var(--status-overdue-pill)' : 'inherit' }}>
                          {d.deadline_date || '—'}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`countdown-tag ${
                            isOverdue ? 'overdue' : isUrgent ? 'urgent' : 'normal'
                          }`}
                        >
                          {isOverdue
                            ? `Overdue by ${Math.abs(days)}d`
                            : days === 0
                            ? 'Due Today'
                            : `${days}d remaining`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                          {d.document_id && (
                            <Link to={`/report/${d.document_id}`} className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}>
                              <span>Report</span>
                              <ArrowUpRight size={13} />
                            </Link>
                          )}
                          {d.status !== 'completed' && (
                            <button className="btn-complete-task" onClick={() => handleComplete(d.id)}>
                              <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4 }} />
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
