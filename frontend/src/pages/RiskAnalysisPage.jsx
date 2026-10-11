/**
 * src/pages/RiskAnalysisPage.jsx
 * Regulatory Risk Analysis and Financial Penalty Assessment.
 */

import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { ShieldAlert, AlertTriangle, IndianRupee, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RiskAnalysisPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRisk = async () => {
      try {
        setLoading(true);
        const res = await api.get('/risk-analysis');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load risk analysis:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRisk();
  }, []);

  const summary = data?.summary || { high_risk_count: 0, medium_risk_count: 0, low_risk_count: 0, total_audited: 0 };
  const highRisk = data?.high_risk_items || [];
  const penalties = data?.penalties || [];

  return (
    <div className="main-container">
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Regulatory Risk Analysis & Penalty Exposure</h2>
          <p>Evaluation of statutory non-compliance exposure, financial penalties, and prosecution risks.</p>
        </div>
      </div>

      {/* Risk Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card overdue">
          <div className="metric-label">High / Urgent Risk</div>
          <div className="metric-value" style={{ color: 'var(--status-overdue-pill)' }}>{summary.high_risk_count}</div>
          <div className="metric-sub">Immediate statutory action required</div>
        </div>

        <div className="metric-card urgent">
          <div className="metric-label">Medium Risk</div>
          <div className="metric-value">{summary.medium_risk_count}</div>
          <div className="metric-sub">Approaching deadlines & audits</div>
        </div>

        <div className="metric-card safe">
          <div className="metric-label">Low Risk / Routine</div>
          <div className="metric-value">{summary.low_risk_count}</div>
          <div className="metric-sub">Routine statutory compliance</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Audited Notices</div>
          <div className="metric-value">{summary.total_audited}</div>
          <div className="metric-sub">Processed in repository</div>
        </div>
      </div>

      {/* Two Column Layout: High Risk Obligations & Penalty Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.75rem' }}>
        {/* High Risk Items */}
        <div className="content-section-card">
          <div className="section-card-header">
            <h3>
              <ShieldAlert size={18} color="var(--status-overdue-pill)" />
              <span>Critical Risk Obligations ({highRisk.length})</span>
            </h3>
          </div>

          <div style={{ padding: '1rem' }}>
            {highRisk.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <ShieldCheck size={32} color="var(--status-safe-text)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                <p style={{ fontWeight: 600 }}>No high risk obligations detected.</p>
              </div>
            ) : (
              highRisk.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid #FECACA',
                    background: '#FFF5F5',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <strong style={{ fontSize: '0.92rem', color: '#991B1B' }}>{item.title}</strong>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#DC2626', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>
                      {item.risk_level}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.45 }}>
                    {item.description}
                  </p>
                  <div style={{ fontSize: '0.76rem', color: '#7F1D1D', fontWeight: 600 }}>
                    Statutory Due Date: {item.deadline_date || 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Penalty Exposure */}
        <div className="content-section-card">
          <div className="section-card-header">
            <h3>
              <AlertTriangle size={18} color="var(--color-terracotta-600)" />
              <span>Financial Penalties & Interest Exposure</span>
            </h3>
          </div>

          <div style={{ padding: '1rem' }}>
            {penalties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                No statutory penalties or interest detected in uploaded notices.
              </div>
            ) : (
              penalties.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-app)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    {p.document_name}
                  </div>
                  {p.penalty_amount && (
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-overdue-pill)', margin: '0.3rem 0' }}>
                      {p.penalty_amount}
                    </div>
                  )}
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {p.penalty_info}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
