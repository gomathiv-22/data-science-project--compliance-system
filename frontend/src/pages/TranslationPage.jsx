/**
 * src/pages/TranslationPage.jsx
 * Multilingual Translation Desk using Google translation with no-key fallback.
 * Translates compliance summaries and action items into Tamil, Malayalam, Telugu, and English.
 */

import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Languages, Globe, FileText, ArrowRight, Loader2, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const SUPPORTED_LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

const TRANSLATION_COPY = {
  en: { noticeType: 'Notice Type', summary: 'Summary', actions: 'Statutory Actions', loading: 'Translating to English...', unavailable: 'No translation available.' },
  ta: { noticeType: 'அறிவிப்பு வகை', summary: 'சுருக்கம்', actions: 'சட்டப்பூர்வ நடவடிக்கைகள்', loading: 'தமிழுக்கு மொழிபெயர்க்கப்படுகிறது...', unavailable: 'மொழிபெயர்ப்பு கிடைக்கவில்லை.' },
  ml: { noticeType: 'അറിയിപ്പ് തരം', summary: 'സംഗ്രഹം', actions: 'നിയമപരമായ നടപടികള്‍', loading: 'മലയാളത്തിലേക്ക് വിവർത്തനം ചെയ്യുന്നു...', unavailable: 'വിവർത്തനം ലഭ്യമല്ല.' },
  te: { noticeType: 'నోటీసు రకం', summary: 'సారాంశం', actions: 'చట్టబద్ధమైన చర్యలు', loading: 'తెలుగులోకి అనువదిస్తోంది...', unavailable: 'అనువాదం అందుబాటులో లేదు.' },
};

export const TranslationPage = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [targetLang, setTargetLang] = useState('ta');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/documents');
        const completed = (res.data.documents || []).filter((d) => d.status === 'done');
        setDocuments(completed);
        if (completed.length > 0) {
          setSelectedDocId(String(completed[0].id));
          loadTranslation(completed[0].id, 'ta');
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
      }
    };
    fetchDocs();
  }, []);

  const loadTranslation = async (docId, lang) => {
    if (!docId) return;
    try {
      setLoading(true);
      const res = await api.get(`/report/${docId}?lang=${lang}`);
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to translate:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocChange = (docId) => {
    setSelectedDocId(docId);
    loadTranslation(docId, targetLang);
  };

  const handleLangChange = (lang) => {
    setTargetLang(lang);
    loadTranslation(selectedDocId, lang);
  };

  const orig = reportData?.original_analysis || {};
  const trans = reportData?.translated_content || {};
  const activeLangObj = SUPPORTED_LANGS.find((l) => l.code === targetLang) || SUPPORTED_LANGS[1];
  const copy = TRANSLATION_COPY[targetLang] || TRANSLATION_COPY.en;

  return (
    <div className="main-container">
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Statutory Regional Language Translation Desk</h2>
          <p>
            Google Translate is tried first; a free MyMemory fallback is used if Google is unavailable.
            Machine translations may be inaccurate, so verify legal obligations against the original notice.
          </p>
        </div>
      </div>

      {/* Selector Toolbar */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: '#fff', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '280px', flex: 1 }}>
          <label className="form-label">Select Document to Translate</label>
          <select
            className="form-select"
            value={selectedDocId}
            onChange={(e) => handleDocChange(e.target.value)}
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.original_filename} ({d.category || 'General'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Target Statutory Language</label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {SUPPORTED_LANGS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLangChange(lang.code)}
                style={{
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  background: targetLang === lang.code ? 'var(--color-navy-900)' : 'var(--bg-subtle)',
                  color: targetLang === lang.code ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {lang.native} ({lang.label})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Original English */}
        <div className="content-section-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--color-navy-950)' }}>Original Statutory Notice (English)</h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Archived Untouched</span>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Notice Type</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-navy-950)' }}>{orig.document_type || '—'}</div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Summary</div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{orig.summary || '—'}</p>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Statutory Actions</div>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {(orig.actions || []).map((act, i) => (
                <li key={i} style={{ marginBottom: '0.35rem' }}>{act}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Regional Language Translation */}
        <div className="content-section-card" style={{ padding: '1.75rem', borderLeft: '3px solid var(--color-terracotta-600)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--color-navy-950)' }}>
              Regional Translation ({activeLangObj.native} - {activeLangObj.label})
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-terracotta-600)', fontWeight: 700 }}>
              Google Translate {trans.from_cache ? '· Cached' : ''}
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
              <Loader2 size={30} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} color="var(--color-navy-700)" />
              <p style={{ fontSize: '0.9rem' }}>{copy.loading}</p>
            </div>
          ) : (
            <>
              {trans.error && (
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
                  {trans.error}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{copy.noticeType}</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-navy-950)' }}>{trans.document_type || orig.document_type || '—'}</div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{copy.summary}</div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.65 }}>
                  {trans.summary || copy.unavailable}
                </p>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{copy.actions}</div>
                <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {(trans.actions || []).map((act, i) => (
                    <li key={i} style={{ marginBottom: '0.45rem' }}>{act}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
