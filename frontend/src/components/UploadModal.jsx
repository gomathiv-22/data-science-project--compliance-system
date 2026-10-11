/**
 * src/components/UploadModal.jsx
 * Upload document dialog with drag-and-drop and live pipeline stage indicator.
 */

import React, { useState, useRef } from 'react';
import api from '../api/client';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

export const UploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [pollId, setPollId] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const pollDocumentStatus = (docId) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/documents/${docId}/status`);
        setStage(res.data.stage || 'Processing document...');

        if (res.data.status === 'done') {
          clearInterval(interval);
          setUploading(false);
          onSuccess(docId);
        } else if (res.data.status === 'failed') {
          clearInterval(interval);
          setUploading(false);
          setError(res.data.error_message || 'Document compliance analysis failed.');
        }
      } catch (err) {
        clearInterval(interval);
        setUploading(false);
        setError('Error checking document processing status.');
      }
    }, 2000);

    setPollId(interval);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF notice or image file.');
      return;
    }

    setUploading(true);
    setError('');
    setStage('Uploading document to secure compliance vault...');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const docId = res.data.document.id;
      setStage('Document received. Extracting text via OCR pipeline...');
      pollDocumentStatus(docId);
    } catch (err) {
      setUploading(false);
      setError(err.response?.data?.error || 'Failed to upload document.');
    }
  };

  const handleClose = () => {
    if (pollId) clearInterval(pollId);
    setFile(null);
    setUploading(false);
    setError('');
    setStage('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--color-navy-950)' }}>
              Upload Regulatory Notice or Filing
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Supports GST, Labour/EPF/ESIC, Pollution Control, and Legal Notices (PDF, PNG, JPG)
            </p>
          </div>
          <button onClick={handleClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="form-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!uploading ? (
            <form onSubmit={handleUpload}>
              <div
                className="dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
                  onChange={handleFileChange}
                />
                <UploadCloud
                  size={36}
                  color="var(--color-navy-700)"
                  style={{ margin: '0 auto 0.75rem', display: 'block' }}
                />
                {file ? (
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--color-navy-950)', fontSize: '0.92rem' }}>
                      {file.name}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB — Click to change file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--color-navy-950)', fontSize: '0.92rem' }}>
                      Click to browse or drag & drop notice file
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Official notice PDFs or high-resolution camera scans up to 25MB
                    </p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0.55rem 1.4rem' }}
                  disabled={!file}
                >
                  Start Compliance Audit
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <Loader2
                size={38}
                className="spin-animation"
                color="var(--color-terracotta-600)"
                style={{ margin: '0 auto 1.25rem', display: 'block', animation: 'spin 1s linear infinite' }}
              />
              <h4 style={{ fontSize: '1.05rem', color: 'var(--color-navy-950)', marginBottom: '0.5rem' }}>
                Processing Document Pipeline
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {stage}
              </p>
              <div style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                OCR Text Extraction → Statutory Rule Matching → Regulatory Risk Scoring
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
