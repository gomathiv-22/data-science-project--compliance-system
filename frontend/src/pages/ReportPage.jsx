/**
 * src/pages/ReportPage.jsx
 * Comprehensive Compliance Audit Report with instantaneous, in-place server-side
 * translation switcher (English, Tamil, Malayalam, Telugu) via Google Cloud Translate,
 * and an explicit Compliance Deadlines extracted table:
 * Action | Due Date | Priority | Status
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  ArrowLeft, Globe, ShieldAlert, CheckCircle2, AlertCircle,
  Clock, FileText, ChevronDown, Check, Scale, Bookmark, Building2,
  Calendar, Loader2, CalendarClock
} from 'lucide-react';

const SUPPORTED_LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

export const ReportPage = () => {
  const { id } = useParams();
  const { activeLanguage, changeLanguage } = useAuth();

  const [selectedLang, setSelectedLang] = useState(activeLanguage || 'en');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const [showRawText, setShowRawText] = useState(false);

  // Fetch report data for a specific language
  const fetchReport = async (langCode, isSwitch = false) => {
    try {
      if (isSwitch) setTranslating(true);
      else setLoading(true);

      const res = await api.get(`/report/${id}?lang=${langCode}`);
      setReportData(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err.response?.data?.error || 'Unable to retrieve statutory compliance audit report.');
    } finally {
      setLoading(false);
      setTranslating(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedLang);
  }, [id]);

  // Handle in-place language switch without page reload
  const handleLanguageChange = (newLang) => {
    if (newLang === selectedLang) return;
    setSelectedLang(newLang);
    changeLanguage(newLang);
    fetchReport(newLang, true);
  };

  if (loading && !reportData) {
    return (
      <div className="main-container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} color="var(--color-navy-700)" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Generating compliance audit report...
        </p>
      </div>
    );
  }

  if (error && !reportData) {
    return (
      <div className="main-container">
        <Link to="/dashboard" className="btn-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <div className="form-alert error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const doc = reportData?.document || {};
  const orig = reportData?.original_analysis || {};
  const translated = reportData?.translated_content || {
    summary: orig.summary,
    actions: orig.actions || [],
  };
  const deadlineStatus = reportData?.deadline_status || {};
  const extractedDeadlines = reportData?.extracted_deadlines || [];
  const activeLangObj = SUPPORTED_LANGS.find((l) => l.code === selectedLang) || SUPPORTED_LANGS[0];

  return (
    <div className="main-container">
      {/* Back Link */}
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/dashboard" className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>
          <ArrowLeft size={14} />
          <span>Back to Compliance Vault</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="report-page-header">
        <div className="report-title-group">
          <div className="report-breadcrumbs">
            <span>Statutory Audit / {orig.category || 'Compliance Notice'} /</span>
          </div>
          <h2>{orig.document_type || doc.original_filename}</h2>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.4rem' }}>
            <span className={`status-pill done`}>Audit Complete</span>
            <span className={`category-pill ${(orig.category || '').toLowerCase()}`}>
              {orig.category}
            </span>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                background:
                  orig.risk_level === 'HIGH' || orig.risk_level === 'URGENT'
                    ? 'var(--status-overdue-pill)'
                    : 'var(--color-navy-700)',
                color: '#fff',
              }}
            >
              Risk: {orig.risk_level || 'MEDIUM'}
            </span>
          </div>
        </div>

        {/* In-place Language Toolbar */}
        <div className="report-lang-toolbar">
          <Globe size={16} color="#CBD5E1" />
          <span className="report-lang-label">Language:</span>
          <select
            id="report-lang-dropdown"
            className="report-lang-select"
            value={selectedLang}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            {SUPPORTED_LANGS.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.native} ({lang.label})
              </option>
            ))}
          </select>
          {translating && (
            <Loader2 size={14} color="#CBD5E1" style={{ animation: 'spin 1s linear infinite' }} />
          )}
        </div>
      </div>

      {selectedLang !== 'en' && (
        <div
          role="note"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: '#EFF6FF',
            color: '#1E3A8A',
          }}
        >
          Google Translate is tried first; a free MyMemory fallback may be used if Google is unavailable.
          Verify legal obligations against the original notice.
        </div>
      )}

      {translated.error && (
        <div
          role="status"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: '#FEF3C7',
            color: '#92400E',
          }}
        >
          {translated.error}
        </div>
      )}

      {/* Main Report Two-Column Layout */}
      <div className="report-grid">
        {/* Left Column: Summary, Actions, Deadlines Table */}
        <div>
          {/* Executive Summary */}
          <div className="report-card">
            <div className="report-card-title">
              <span>Executive Compliance Summary</span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {activeLangObj.native} {translated.from_cache ? '(Cached)' : ''}
              </span>
            </div>

            {translating ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
                Translating summary to {activeLangObj.label}...
              </div>
            ) : (
              <p className="report-summary-text">
                {translated.summary || orig.summary || 'No summary available.'}
              </p>
            )}
          </div>

          {/* COMPLIANCE DEADLINES TABLE (Action | Due Date | Priority | Status) */}
          <div className="report-card">
            <div className="report-card-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarClock size={18} color="var(--color-terracotta-600)" />
                Compliance Deadlines
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Extracted from Document
              </span>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedDeadlines.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '1.75rem', color: 'var(--text-muted)' }}>
                        No specific statutory deadline was identified in this document.
                      </td>
                    </tr>
                  ) : (
                    extractedDeadlines.map((dl, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: 'var(--color-navy-950)' }}>{dl.action}</td>
                        <td>
                          <strong>{dl.due_date}</strong>
                          {dl.days_remaining !== null && (
                            <div style={{ fontSize: '0.72rem', color: dl.days_remaining < 0 ? 'var(--status-overdue-pill)' : 'var(--text-muted)' }}>
                              {dl.days_remaining < 0 ? `Overdue by ${Math.abs(dl.days_remaining)}d` : `${dl.days_remaining}d left`}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.45rem',
                              borderRadius: 'var(--radius-sm)',
                              background: dl.priority === 'HIGH' || dl.priority === 'URGENT' ? '#FEE2E2' : '#F1F5F9',
                              color: dl.priority === 'HIGH' || dl.priority === 'URGENT' ? '#991B1B' : '#475569',
                            }}
                          >
                            {dl.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${dl.status.toLowerCase() === 'overdue' ? 'overdue' : 'done'}`}>
                            {dl.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Obligations Checklist */}
          <div className="report-card">
            <div className="report-card-title">
              <span>Mandatory Compliance Actions ({translated.actions?.length || 0})</span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {activeLangObj.native}
              </span>
            </div>

            {translating ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
                Translating obligations to {activeLangObj.label}...
              </div>
            ) : (
              <ul className="action-checklist">
                {(translated.actions || orig.actions || []).map((action, idx) => (
                  <li key={idx} className="action-checklist-item">
                    <span
                      style={{
                        background: 'var(--color-navy-900)',
                        color: '#fff',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Key Legal Requirements */}
          {orig.requirements && orig.requirements.length > 0 && (
            <div className="report-card">
              <div className="report-card-title">
                <span>Statutory Provisions Cited</span>
              </div>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {orig.requirements.map((req, i) => (
                  <li key={i} style={{ marginBottom: '0.4rem' }}>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Document Text Accordion */}
          <div className="report-card">
            <div
              className="report-card-title"
              style={{ cursor: 'pointer', marginBottom: showRawText ? '1.1rem' : 0, borderBottom: showRawText ? '1.5px solid var(--border-light)' : 'none' }}
              onClick={() => setShowRawText(!showRawText)}
            >
              <span>Audit Trail: Raw Document OCR Text</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-navy-700)', fontWeight: 600 }}>
                {showRawText ? 'Hide text ▲' : 'Inspect text ▼'}
              </span>
            </div>
            {showRawText && (
              <pre
                style={{
                  background: 'var(--bg-app)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}
              >
                {orig.raw_text || 'Raw text not stored.'}
              </pre>
            )}
          </div>
        </div>

        {/* Right Column: Deadlines, Penalties, and Identifiers */}
        <div>
          {/* Deadline Spotlight Card */}
          <div className="report-card" style={{ borderLeft: '4px solid var(--color-terracotta-600)' }}>
            <div className="report-card-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} color="var(--color-terracotta-600)" />
                Statutory Deadline
              </span>
            </div>

            <div style={{ margin: '0.5rem 0' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-navy-950)' }}>
                {orig.deadline_date || 'No Date Specified'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {orig.deadline_text}
              </div>
            </div>

            {deadlineStatus.label && (
              <div style={{ marginTop: '1rem' }}>
                <span className={`countdown-tag ${deadlineStatus.status_type || 'normal'}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
                  {deadlineStatus.label}
                </span>
              </div>
            )}
          </div>

          {/* Penalty & Risk Assessment Card */}
          <div className="report-card">
            <div className="report-card-title">
              <span>Penalty Assessment</span>
            </div>
            {orig.penalty_amount && (
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Quantified Penalty / Interest
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--status-overdue-pill)' }}>
                  {orig.penalty_amount}
                </div>
              </div>
            )}
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {orig.penalty_info || 'No penalty provision identified.'}
            </p>
          </div>

          {/* Statutory Identifiers */}
          <div className="report-card">
            <div className="report-card-title">
              <span>Regulatory Identifiers</span>
            </div>
            <div className="statutory-id-grid">
              <div className="statutory-id-item">
                <div className="id-label">Category Classification</div>
                <div className="id-val">{orig.category || 'General'}</div>
              </div>

              <div className="statutory-id-item">
                <div className="id-label">Issuing Authority</div>
                <div className="id-val">{orig.key_identifiers?.authority || 'Statutory Department'}</div>
              </div>

              <div className="statutory-id-item">
                <div className="id-label">Notice Reference Number</div>
                <div className="id-val">{orig.key_identifiers?.notice_number || 'N/A'}</div>
              </div>

              <div className="statutory-id-item">
                <div className="id-label">Uploaded File</div>
                <div className="id-val" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {doc.original_filename}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
