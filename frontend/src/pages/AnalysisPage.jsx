/**
 * src/pages/AnalysisPage.jsx
 * Statutory Clause Inspection & Document Analysis Desk.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { UploadCloud, FileSearch, ShieldCheck, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export const AnalysisPage = () => {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleUploadAndAnalyze = async (e) => {
    e.preventDefault();
    if (!file) return;

    setAnalyzing(true);
    setError('');
    setStage('Uploading statutory notice to secure processing sandbox...');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const docId = res.data.document.id;

      // Poll status
      const interval = setInterval(async () => {
        try {
          const pollRes = await api.get(`/documents/${docId}/status`);
          setStage(pollRes.data.stage || 'Auditing statutory clauses...');
          if (pollRes.data.status === 'done') {
            clearInterval(interval);
            navigate(`/report/${docId}`);
          } else if (pollRes.data.status === 'failed') {
            clearInterval(interval);
            setAnalyzing(false);
            setError(pollRes.data.error_message || 'Analysis could not complete.');
          }
        } catch (err) {
          clearInterval(interval);
          setAnalyzing(false);
          setError('Polling error.');
        }
      }, 2000);
    } catch (err) {
      setAnalyzing(false);
      setError(err.response?.data?.error || 'Upload failed.');
    }
  };

  return (
    <div className="main-container">
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Statutory Clause Analysis & Inquest Desk</h2>
          <p>Automated OCR clause extraction, penalty detection, and risk scoring for MSME notices.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
        {/* Left: Upload and Processing Zone */}
        <div className="content-section-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--color-navy-950)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSearch size={18} color="var(--color-terracotta-600)" />
            <span>Document Clause Extraction</span>
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Upload any show cause notice, demand order, or inspection summons. The engine parses native PDFs and scanned TIFF/JPEG/PNG documents.
          </p>

          {error && (
            <div className="form-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!analyzing ? (
            <form onSubmit={handleUploadAndAnalyze}>
              <label
                className="dropzone"
                style={{ display: 'block', marginBottom: '1.5rem' }}
              >
                <input
                  type="file"
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      setError('');
                    }
                  }}
                />
                <UploadCloud size={40} color="var(--color-navy-700)" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                {file ? (
                  <div>
                    <strong style={{ color: 'var(--color-navy-950)', fontSize: '0.95rem' }}>{file.name}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB — Ready for statutory analysis
                    </div>
                  </div>
                ) : (
                  <div>
                    <strong style={{ color: 'var(--color-navy-950)', fontSize: '0.95rem' }}>Select or Drag Notice File</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      GST DRC-01A, EPFO 7A, ESIC Form 01, SPCB CTO, or Court Notices
                    </div>
                  </div>
                )}
              </label>

              <button
                type="submit"
                className="btn-primary"
                disabled={!file}
                style={{ width: '100%', padding: '0.8rem' }}
              >
                <span>Execute Statutory Analysis</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Loader2 size={40} color="var(--color-terracotta-600)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.25rem' }} />
              <h4 style={{ fontSize: '1.1rem', color: 'var(--color-navy-950)', marginBottom: '0.4rem' }}>
                Auditing Regulatory Clauses
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {stage}
              </p>
              <div style={{ marginTop: '1.5rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                pdfplumber / EasyOCR Extraction → Statutory Rule Verification → Risk Scoring
              </div>
            </div>
          )}
        </div>

        {/* Right: Regulatory Pipeline Architecture */}
        <div className="content-section-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-navy-950)', marginBottom: '1.25rem' }}>
            Analysis Scope & Verification
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-navy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-navy-900)', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>1</div>
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--color-navy-950)' }}>Statutory Notice Classification</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Identifies whether the notice falls under GST / Tax, Labour Laws, Environmental Regulations, or Commercial Law.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-navy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-navy-900)', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>2</div>
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--color-navy-950)' }}>Deadline & Inquest Extraction</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Extracts exact calendar due dates for replies, appeals, or tax deposits without fabricating non-existent dates.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-navy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-navy-900)', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>3</div>
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--color-navy-950)' }}>Financial Penalty Assessment</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Detects interest charges (e.g. 18% p.a. under GST Section 50) and damages under Section 14B of EPF Act.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
