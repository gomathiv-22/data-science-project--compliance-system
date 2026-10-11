/**
 * src/pages/SettingsPage.jsx
 * Enterprise Settings: Default Language, Appearance, Reminder Preferences,
 * Account & Enterprise Information, and Sign Out.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Sliders, Globe, Bell, User, LogOut, Check, Save } from 'lucide-react';

const SUPPORTED_LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

export const SettingsPage = () => {
  const { user, logout, activeLanguage, changeLanguage } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [businessName, setBusinessName] = useState(user?.business_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [prefLang, setPrefLang] = useState(activeLanguage || 'en');
  const [rem7, setRem7] = useState(true);
  const [rem3, setRem3] = useState(true);
  const [rem1, setRem1] = useState(true);
  const [appearance, setAppearance] = useState('standard');
  const [savedMsg, setSavedMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      await api.patch('/profile', {
        full_name: fullName,
        business_name: businessName,
        phone,
        preferred_language: prefLang,
      });
      changeLanguage(prefLang);
      setSavedMsg('Settings successfully persisted to enterprise profile.');
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="main-container" style={{ maxWidth: '840px' }}>
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Enterprise Platform Settings</h2>
          <p>Configure statutory language preferences, reminder intervals, and account details.</p>
        </div>
      </div>

      {savedMsg && (
        <div className="form-alert success" style={{ marginBottom: '1.5rem' }}>
          <Check size={16} />
          <span>{savedMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* 1. Language Preferences */}
        <div className="content-section-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--color-navy-950)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={18} color="var(--color-navy-700)" />
            <span>Default Statutory Language</span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Reports and notifications will automatically default to your chosen language.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {SUPPORTED_LANGS.map((l) => (
              <label
                key={l.code}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: prefLang === l.code ? '2px solid var(--color-navy-800)' : '1px solid var(--border-medium)',
                  background: prefLang === l.code ? 'var(--color-navy-50)' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="prefLang"
                  checked={prefLang === l.code}
                  onChange={() => setPrefLang(l.code)}
                />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-navy-950)' }}>
                    {l.native}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {l.label}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 2. Appearance */}
        <div className="content-section-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--color-navy-950)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="var(--color-navy-700)" />
            <span>Appearance & Theme</span>
          </h3>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="radio"
                name="appearance"
                value="standard"
                checked={appearance === 'standard'}
                onChange={() => setAppearance('standard')}
              />
              <span>Standard Enterprise Deep Navy</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="radio"
                name="appearance"
                value="contrast"
                checked={appearance === 'contrast'}
                onChange={() => setAppearance('contrast')}
              />
              <span>High Contrast Audit Mode</span>
            </label>
          </div>
        </div>

        {/* 3. Reminder Preferences */}
        <div className="content-section-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--color-navy-950)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} color="var(--color-terracotta-600)" />
            <span>Deadline Reminder Schedules</span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            APScheduler executes daily background surveillance to generate alerts at these thresholds:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={rem7} onChange={(e) => setRem7(e.target.checked)} />
              <span>7 days before due date (Standard Statutory Advance Notice)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={rem3} onChange={(e) => setRem3(e.target.checked)} />
              <span>3 days before due date (Urgent Filing Warning)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={rem1} onChange={(e) => setRem1(e.target.checked)} />
              <span>1 day before and same-day (Critical Default Mitigation Alert)</span>
            </label>
          </div>
        </div>

        {/* 4. Enterprise Account Information */}
        <div className="content-section-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--color-navy-950)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="var(--color-navy-700)" />
            <span>Enterprise Account Profile</span>
          </h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Authorized Person</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Registered Enterprise Name</label>
            <input
              type="text"
              className="form-input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Registered Work Email</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: 'auto', padding: '0.65rem 1.6rem' }}
              disabled={saving}
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 5. Tucked Sign Out Link at Bottom */}
      <div style={{ borderTop: '1px solid var(--border-medium)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Active Session: {user?.email}
        </span>
        <button
          onClick={handleSignOut}
          style={{
            fontSize: '0.82rem',
            color: 'var(--status-overdue-pill)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.8rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--status-urgent-border)',
            background: '#FFF5F5',
          }}
        >
          <LogOut size={13} />
          <span>Sign out of Workspace</span>
        </button>
      </div>
    </div>
  );
};
