/**
 * src/pages/CompliancePage.jsx
 * Statutory Compliance Obligations Register.
 */

import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { CheckSquare, CheckCircle2, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

export const CompliancePage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/compliance');
      setItems(res.data.items || []);
    } catch (err) {
      console.error('Failed to load compliance items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleComplete = async (id) => {
    try {
      await api.post(`/deadlines/${id}/complete`);
      fetchItems();
    } catch (err) {
      console.error('Error completing item:', err);
    }
  };

  const filtered = items.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCat = catFilter === 'all' || (item.category || '').toLowerCase().includes(catFilter.toLowerCase());
    return matchesStatus && matchesCat;
  });

  return (
    <div className="main-container">
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Statutory Compliance Obligations Register</h2>
          <p>Active legal requirements, inspection responses, and recurring MSME statutory filings.</p>
        </div>

        <button className="btn-secondary" onClick={fetchItems}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.4rem' }}>Status:</span>
          {['all', 'active', 'overdue', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                background: statusFilter === st ? 'var(--color-navy-900)' : 'var(--bg-subtle)',
                color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.4rem' }}>Category:</span>
          {['all', 'Tax', 'Labour', 'Environmental'].map((ct) => (
            <button
              key={ct}
              onClick={() => setCatFilter(ct)}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                background: catFilter === ct ? 'var(--color-navy-900)' : 'var(--bg-subtle)',
                color: catFilter === ct ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {ct === 'all' ? 'All' : ct}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="content-section-card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Compliance Obligation</th>
                <th>Category</th>
                <th>Statutory Due Date</th>
                <th>Risk Severity</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    No matching compliance obligations recorded.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isOverdue = item.days_remaining !== null && item.days_remaining < 0;
                  return (
                    <tr key={item.id}>
                      <td className="doc-name-cell">
                        <div>{item.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 400 }}>
                          {item.description ? item.description.slice(0, 100) + '...' : ''}
                        </div>
                      </td>
                      <td>
                        <span className={`category-pill ${(item.category || '').toLowerCase()}`}>
                          {item.category || 'Statutory'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: isOverdue ? 'var(--status-overdue-pill)' : 'inherit' }}>
                          {item.deadline_date || '—'}
                        </span>
                        {item.days_remaining !== null && (
                          <div style={{ fontSize: '0.72rem', color: isOverdue ? 'var(--status-overdue-pill)' : 'var(--text-muted)' }}>
                            {isOverdue ? `Overdue by ${Math.abs(item.days_remaining)}d` : `${item.days_remaining}d left`}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: item.risk_level === 'URGENT' || item.risk_level === 'HIGH' ? '#FEE2E2' : '#F1F5F9',
                            color: item.risk_level === 'URGENT' || item.risk_level === 'HIGH' ? '#991B1B' : '#475569',
                          }}
                        >
                          {item.risk_level || 'MEDIUM'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${item.status}`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {item.status !== 'completed' ? (
                          <button
                            className="btn-complete-task"
                            onClick={() => handleComplete(item.id)}
                          >
                            <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4 }} />
                            Mark Complete
                          </button>
                        ) : (
                          <span style={{ color: 'var(--status-safe-text)', fontSize: '0.8rem', fontWeight: 600 }}>
                            Completed
                          </span>
                        )}
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
