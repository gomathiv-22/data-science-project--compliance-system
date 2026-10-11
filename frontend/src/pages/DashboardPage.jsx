/**
 * src/pages/DashboardPage.jsx
 * Central enterprise workspace with prominent Compliance Reminders bar near top,
 * metrics row (Total Docs, Docs Analyzed, High Risk, Upcoming Deadlines),
 * recent documents repository table, and quick upload modal.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { UploadModal } from '../components/UploadModal';
import { ComplianceRemindersBar } from '../components/ComplianceRemindersBar';
import {
  Upload, FileText, AlertTriangle, Clock, CheckCircle2,
  Calendar, ArrowUpRight, Trash2, RefreshCw, ShieldAlert,
  FolderOpen
} from 'lucide-react';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard');
      setData(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Unable to retrieve compliance metrics. Ensure backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCompleteObligation = async (itemId) => {
    try {
      await api.post(`/deadlines/${itemId}/complete`);
      fetchDashboardData();
    } catch (err) {
      console.error('Could not complete obligation:', err);
    }
  };

  const handleDeleteDocument = async (docId, originalName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove '${originalName}' from compliance tracking?`)) {
      return;
    }
    try {
      await api.delete(`/documents/${docId}`);
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleUploadSuccess = (docId) => {
    setUploadModalOpen(false);
    fetchDashboardData();
    navigate(`/report/${docId}`);
  };

  if (loading && !data) {
    return (
      <div className="main-container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500 }}>
          Synchronizing statutory compliance registers...
        </p>
      </div>
    );
  }

  const metrics = data?.metrics || {
    total_documents: 0,
    documents_analyzed: 0,
    active_obligations: 0,
    overdue_count: 0,
    high_risk_count: 0,
  };

  const documents = data?.documents || [];
  const deadlines = data?.deadlines || [];

  const filteredDocs = documents.filter((doc) => {
    if (categoryFilter === 'all') return true;
    return (doc.category || '').toLowerCase().includes(categoryFilter.toLowerCase());
  });

  return (
    <div className="main-container">
      {/* Top Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Statutory Compliance Register</h2>
          <p>
            Surveillance of regulatory filings, inspection notices, and audit obligations for{' '}
            <strong style={{ color: 'var(--color-navy-950)' }}>{data?.user?.business_name || 'your enterprise'}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={fetchDashboardData} title="Refresh records">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            id="open-upload-modal-btn"
            className="btn-primary btn-terracotta"
            style={{ width: 'auto', padding: '0.65rem 1.25rem' }}
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload size={16} />
            <span>Upload Notice / Filing</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="form-alert error" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. PROMINENT COMPLIANCE REMINDERS AREA NEAR TOP (EXACTLY AS REQUESTED) */}
      <ComplianceRemindersBar deadlines={deadlines} />

      {/* 2. SUMMARY METRICS ROW (Total Documents, Documents Analyzed, High Risk, Upcoming Deadlines) */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Documents</div>
          <div className="metric-value">{metrics.total_documents}</div>
          <div className="metric-sub">Stored in compliance vault</div>
        </div>

        <div className="metric-card safe">
          <div className="metric-label">Documents Analyzed</div>
          <div className="metric-value">{metrics.documents_analyzed}</div>
          <div className="metric-sub">Audit trail verified</div>
        </div>

        <div className="metric-card overdue">
          <div className="metric-label">High Risk Documents</div>
          <div className="metric-value" style={{ color: metrics.high_risk_count > 0 ? 'var(--status-overdue-pill)' : 'inherit' }}>
            {metrics.high_risk_count}
          </div>
          <div className="metric-sub">Statutory penalty warnings</div>
        </div>

        <div className="metric-card urgent">
          <div className="metric-label">Upcoming Deadlines</div>
          <div className="metric-value" style={{ color: metrics.active_obligations > 0 ? 'var(--color-terracotta-600)' : 'inherit' }}>
            {metrics.active_obligations}
          </div>
          <div className="metric-sub">Active regulatory filings</div>
        </div>
      </div>

      {/* Asymmetric Content Grid: Documents Table (60%) + Upcoming Deadlines (40%) */}
      <div className="dashboard-content-grid">
        {/* Left Column: Recent Documents Table */}
        <div className="content-section-card">
          <div className="section-card-header">
            <h3>
              <FileText size={18} color="var(--color-navy-700)" />
              <span>Recent Regulatory Documents</span>
            </h3>

            {/* Filter */}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['all', 'Tax', 'Labour', 'Environmental'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: categoryFilter === cat ? 'var(--color-navy-900)' : 'var(--bg-subtle)',
                    color: categoryFilter === cat ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="data-table-wrap">
            {filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
                <FolderOpen size={36} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                <p style={{ fontWeight: 600, fontSize: '0.92rem' }}>No regulatory documents uploaded yet.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Upload GST notices, EPF demands, or SPCB orders to start automated compliance tracking.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category</th>
                    <th>Statutory Deadline</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => {
                    const isDocOverdue = doc.status === 'overdue';
                    return (
                      <tr key={doc.id} style={{ cursor: 'pointer' }}>
                        <td className="doc-name-cell">
                          <Link to={`/report/${doc.id}`} style={{ color: 'inherit', display: 'block' }}>
                            {doc.original_filename}
                          </Link>
                        </td>
                        <td>
                          <span className={`category-pill ${(doc.category || '').toLowerCase()}`}>
                            {doc.category || 'General'}
                          </span>
                        </td>
                        <td>
                          {doc.due_date ? (
                            <span style={{ fontWeight: 600, color: isDocOverdue ? 'var(--status-overdue-pill)' : 'inherit' }}>
                              {doc.due_date}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>No explicit date</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${doc.status}`}>
                            {doc.status === 'done' ? 'Compliant / Audited' : doc.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                            <Link
                              to={`/report/${doc.id}`}
                              className="btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                            >
                              <span>Report</span>
                              <ArrowUpRight size={13} />
                            </Link>
                            <button
                              onClick={(e) => handleDeleteDocument(doc.id, doc.original_filename, e)}
                              style={{ color: 'var(--text-muted)', padding: '0.35rem' }}
                              title="Delete record"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Deadlines Tracker */}
        <div className="content-section-card">
          <div className="section-card-header">
            <h3>
              <Clock size={18} color="var(--color-terracotta-600)" />
              <span>Upcoming Deadlines ({deadlines.length})</span>
            </h3>
            <Link to="/deadlines" style={{ fontSize: '0.72rem', color: 'var(--color-navy-700)', fontWeight: 600 }}>
              View all
            </Link>
          </div>

          <div className="deadlines-list">
            {deadlines.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} color="var(--status-safe-text)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>No pending statutory deadlines.</p>
                <p style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>All active requirements are fulfilled.</p>
              </div>
            ) : (
              deadlines.map((item) => {
                const days = item.days_remaining;
                const isOverdue = days !== null && days < 0;
                const isUrgent = days !== null && days <= 3 && days >= 0;

                return (
                  <div key={item.id} className={`deadline-row-item ${isOverdue ? 'is-overdue' : ''}`}>
                    <div className="deadline-item-main">
                      <div className="deadline-title">{item.title}</div>
                      <div className="deadline-item-meta">
                        <span className={`category-pill ${(item.category || '').toLowerCase()}`}>
                          {item.category || 'Statutory'}
                        </span>
                        <span>Due: {item.deadline_date}</span>
                        <span
                          className={`countdown-tag ${
                            isOverdue ? 'overdue' : isUrgent ? 'urgent' : 'warning'
                          }`}
                        >
                          {isOverdue
                            ? `Overdue by ${Math.abs(days)}d`
                            : days === 0
                            ? 'Due Today'
                            : `${days}d remaining`}
                        </span>
                      </div>
                    </div>

                    <button
                      className="btn-complete-task"
                      onClick={() => handleCompleteObligation(item.id)}
                      title="Mark as filed / completed"
                    >
                      <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Complete
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal Component */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
};
