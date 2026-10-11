/**
 * src/pages/ReportsPage.jsx
 * Compliance Audit Reports Registry.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { ClipboardCheck, FileText, ArrowUpRight, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

export const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports');
      setReports(res.data.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="main-container">
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Statutory Compliance Audit Reports</h2>
          <p>Full executive summaries, actionable statutory checklists, and penalty assessments.</p>
        </div>

        <button className="btn-secondary" onClick={fetchReports}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {reports.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
            <ClipboardCheck size={36} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
            <p style={{ fontWeight: 600 }}>No audited reports generated yet.</p>
          </div>
        ) : (
          reports.map((r) => (
            <div key={r.document_id} className="content-section-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span className={`category-pill ${(r.category || '').toLowerCase()}`}>
                    {r.category || 'General'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      background: r.risk_level === 'URGENT' || r.risk_level === 'HIGH' ? '#FEE2E2' : '#F1F5F9',
                      color: r.risk_level === 'URGENT' || r.risk_level === 'HIGH' ? '#991B1B' : '#475569',
                    }}
                  >
                    Risk: {r.risk_level || 'MEDIUM'}
                  </span>
                </div>

                <h4 style={{ fontSize: '1rem', color: 'var(--color-navy-950)', marginBottom: '0.4rem', lineHeight: 1.35 }}>
                  {r.filename}
                </h4>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {r.summary ? (r.summary.length > 140 ? r.summary.slice(0, 140) + '...' : r.summary) : 'No summary available.'}
                </p>

                {r.due_date && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-terracotta-600)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                    <Clock size={13} />
                    <span>Statutory Due Date: {r.due_date}</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Audited on {r.upload_date ? r.upload_date.split('T')[0] : '—'}
                </span>
                <Link
                  to={`/report/${r.document_id}`}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  <span>Open Audit Report</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
