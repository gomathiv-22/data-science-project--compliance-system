/**
 * src/pages/DocumentsPage.jsx
 * Central Document Repository with search, statutory category filters, and file actions.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { UploadModal } from '../components/UploadModal';
import { FolderArchive, Upload, Search, FileText, Trash2, ArrowUpRight, AlertCircle, RefreshCw } from 'lucide-react';

export const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (docId, originalName) => {
    if (!window.confirm(`Delete '${originalName}' from compliance repository?`)) return;
    try {
      await api.delete(`/documents/${docId}`);
      fetchDocuments();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const filtered = documents.filter((d) => {
    const matchesCat = category === 'all' || (d.category || '').toLowerCase().includes(category.toLowerCase());
    const matchesSearch = !search || d.original_filename.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="main-container">
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Regulatory Documents Repository</h2>
          <p>Archival and surveillance of official statutory notices, summons, and filings.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={fetchDocuments}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn-primary btn-terracotta" style={{ width: 'auto', padding: '0.65rem 1.25rem' }} onClick={() => setUploadOpen(true)}>
            <Upload size={16} /> Upload Notice
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', background: '#fff', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {['all', 'Tax', 'Labour', 'Environmental', 'Legal Notice'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: category === cat ? 'var(--color-navy-900)' : 'var(--bg-subtle)',
                color: category === cat ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search documents by name..."
            style={{ paddingLeft: '2.1rem', fontSize: '0.84rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="content-section-card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Category</th>
                <th>Uploaded Date</th>
                <th>Statutory Deadline</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    No matching documents found in repository.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td className="doc-name-cell">
                      <Link to={`/report/${doc.id}`}>{doc.original_filename}</Link>
                    </td>
                    <td>
                      <span className={`category-pill ${(doc.category || '').toLowerCase()}`}>
                        {doc.category || 'General'}
                      </span>
                    </td>
                    <td>{doc.upload_date ? doc.upload_date.split('T')[0] : '—'}</td>
                    <td>
                      {doc.due_date ? (
                        <span style={{ fontWeight: 600, color: doc.status === 'overdue' ? 'var(--status-overdue-pill)' : 'inherit' }}>
                          {doc.due_date}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${doc.status}`}>
                        {doc.status === 'done' ? 'Audited' : doc.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Link to={`/report/${doc.id}`} className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}>
                          <span>Report</span>
                          <ArrowUpRight size={13} />
                        </Link>
                        <button onClick={() => handleDelete(doc.id, doc.original_filename)} style={{ color: 'var(--text-muted)', padding: '0.35rem' }} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={() => { setUploadOpen(false); fetchDocuments(); }} />
    </div>
  );
};
