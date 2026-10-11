/**
 * src/pages/AuthPage.jsx
 * Unified Login and Sign Up screen on a single page with asymmetric layout,
 * Indian statutory compliance context, and robust form validation.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Scale, FileCheck, AlertCircle, ArrowRight, Building, CheckCircle } from 'lucide-react';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    preferred_language: 'en',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        if (formData.password !== formData.confirm_password) {
          setError('Passwords do not match.');
          setSubmitting(false);
          return;
        }
        await signup({
          full_name: formData.name,
          business_name: formData.business_name,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirm_password,
          phone: formData.phone,
          preferred_language: formData.preferred_language,
        });
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        (isLogin ? 'Authentication failed. Please verify credentials.' : 'Registration failed.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split-layout">
        {/* Left Side: Editorial Indian MSME Compliance Brief */}
        <div className="auth-editorial-panel">
          <div>
            <div className="editorial-tag">
              <Scale size={14} />
              <span>Statutory Compliance Architecture</span>
            </div>

            <h1 className="editorial-title">
              Safeguard your enterprise from <span>regulatory penalties</span>.
            </h1>

            <p className="editorial-lead">
              Automated document audit, deadline surveillance, and regional language translation
              tailored to Indian MSME obligations under GST, EPF/ESIC, Factory Acts, and SPCB directives.
            </p>

            <div className="editorial-pillars">
              <div className="pillar-card">
                <FileCheck size={20} color="var(--color-terracotta-500)" style={{ marginBottom: '0.4rem' }} />
                <h4>Statutory Extraction</h4>
                <p>Instant parsing of show cause notices, assessment orders, and regulatory reminders.</p>
              </div>

              <div className="pillar-card">
                <AlertCircle size={20} color="var(--color-terracotta-500)" style={{ marginBottom: '0.4rem' }} />
                <h4>7-3-1 Day Surveillance</h4>
                <p>APScheduler background tracking ensures you never default on compliance deadlines.</p>
              </div>

              <div className="pillar-card">
                <Building size={20} color="var(--color-terracotta-500)" style={{ marginBottom: '0.4rem' }} />
                <h4>MSMED Act Shield</h4>
                <p>Built-in intelligence covering delayed payment interest, threshold limits, and benefits.</p>
              </div>

              <div className="pillar-card">
                <CheckCircle size={20} color="var(--color-terracotta-500)" style={{ marginBottom: '0.4rem' }} />
                <h4>Regional Languages</h4>
                <p>Instant legal translations in Tamil, Malayalam, and Telugu via Google Cloud Translate.</p>
              </div>
            </div>
          </div>

          <div className="editorial-footer">
            Designed for Indian Manufacturing & Services Micro, Small & Medium Enterprises.
          </div>
        </div>

        {/* Right Side: Auth Form with Dual Tabs */}
        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="auth-header">
              <h2>{isLogin ? 'Workspace Access' : 'Register Enterprise'}</h2>
              <p>
                {isLogin
                  ? 'Enter your registered credentials to access your compliance cockpit.'
                  : 'Establish a new statutory compliance profile for your MSME unit.'}
              </p>
            </div>

            {/* Single Screen Tabs Toggle */}
            <div className="auth-toggle-group" id="auth-toggle-group">
              <button
                type="button"
                id="toggle-login-tab"
                className={`auth-tab-btn ${isLogin ? 'active' : ''}`}
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                id="toggle-signup-tab"
                className={`auth-tab-btn ${!isLogin ? 'active' : ''}`}
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
              >
                New Enterprise
              </button>
            </div>

            {error && (
              <div className="form-alert error" id="auth-error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Authorized Person</label>
                      <input
                        type="text"
                        name="name"
                        id="signup-name"
                        className="form-input"
                        placeholder="e.g. Ramesh Kumar"
                        value={formData.name}
                        onChange={handleChange}
                        required={!isLogin}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        id="signup-phone"
                        className="form-input"
                        placeholder="10-digit mobile"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Enterprise / Business Name</label>
                    <input
                      type="text"
                      name="business_name"
                      id="signup-business"
                      className="form-input"
                      placeholder="e.g. Kaveri Precision Engineering Pvt Ltd"
                      value={formData.business_name}
                      onChange={handleChange}
                      required={!isLogin}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Default Statutory Language</label>
                    <select
                      name="preferred_language"
                      id="signup-lang"
                      className="form-select"
                      value={formData.preferred_language}
                      onChange={handleChange}
                    >
                      <option value="en">English</option>
                      <option value="ta">Tamil (தமிழ்)</option>
                      <option value="ml">Malayalam (മലയാളം)</option>
                      <option value="te">Telugu (తెలుగు)</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Work Email Address</label>
                <input
                  type="email"
                  name="email"
                  id="auth-email"
                  className="form-input"
                  placeholder="compliance@yourcompany.in"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  id="auth-password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    id="signup-confirm-password"
                    className="form-input"
                    placeholder="••••••••••••"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    required={!isLogin}
                  />
                </div>
              )}

              <button
                type="submit"
                id="auth-submit-btn"
                className="btn-primary"
                style={{ marginTop: '0.75rem' }}
                disabled={submitting}
              >
                <span>{submitting ? 'Authenticating...' : isLogin ? 'Sign In to Workspace' : 'Create Enterprise Account'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
