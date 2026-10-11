/**
 * src/components/ComplianceRemindersBar.jsx
 * Highly visible, clean, and professional compliance reminders banner.
 * Displays prioritized upcoming deadlines:
 * 🔴 Red (Overdue or Due <= 2 days)
 * 🟠 Orange (Due 3-7 days)
 * 🟢 Green (Due > 7 days)
 * "You're all caught up. No upcoming compliance deadlines detected." if empty.
 */

import React from 'react';
import { Bell, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ComplianceRemindersBar = ({ deadlines = [] }) => {
  // Sort deadlines by due date ascending
  const activeDeadlines = deadlines.filter((d) => d.status !== 'completed');

  if (activeDeadlines.length === 0) {
    return (
      <div className="compliance-reminders-banner" id="compliance-reminders-area">
        <div className="reminders-empty-banner">
          <CheckCircle2 size={18} />
          <span>You're all caught up. No upcoming compliance deadlines detected.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="compliance-reminders-banner" id="compliance-reminders-area">
      <div className="reminders-banner-header">
        <div className="reminders-header-left">
          <Bell size={18} color="var(--color-terracotta-600)" />
          <h3>Compliance Reminders</h3>
          <span className="reminders-badge">
            {activeDeadlines.length} Active {activeDeadlines.length === 1 ? 'Notice' : 'Notices'}
          </span>
        </div>

        <Link
          to="/deadlines"
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--color-navy-700)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          <span>View All Deadlines</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="reminders-items-grid">
        {activeDeadlines.map((item) => {
          const days = item.days_remaining;
          const isOverdue = days !== null && days < 0;
          const isUrgent = (days !== null && days <= 2 && days >= 0) || isOverdue;
          const isWarning = days !== null && days > 2 && days <= 7;
          const isNormal = days !== null && days > 7;

          // Determine dot and style
          let dotColor = 'green';
          let cardClass = 'safe';
          let dueLabel = `${days} days`;

          if (isOverdue) {
            dotColor = 'red';
            cardClass = 'urgent';
            dueLabel = `Overdue by ${Math.abs(days)} days`;
          } else if (days === 0) {
            dotColor = 'red';
            cardClass = 'urgent';
            dueLabel = 'Due Today';
          } else if (days <= 2) {
            dotColor = 'red';
            cardClass = 'urgent';
            dueLabel = `Due in ${days} ${days === 1 ? 'day' : 'days'}`;
          } else if (isWarning) {
            dotColor = 'orange';
            cardClass = 'warning';
            dueLabel = `Due in ${days} days`;
          } else if (isNormal) {
            dotColor = 'green';
            cardClass = 'safe';
            dueLabel = `Due in ${days} days`;
          }

          return (
            <div key={item.id} className={`reminder-strip-card ${cardClass}`}>
              <div className="reminder-left-block">
                <div className={`reminder-dot ${dotColor}`} />
                <div className="reminder-info">
                  <div className="reminder-title" title={item.title}>
                    {item.title}
                  </div>
                  <span className={`reminder-due-tag ${dotColor}`}>
                    {dueLabel}
                  </span>
                </div>
              </div>

              {item.document_id ? (
                <Link
                  to={`/report/${item.document_id}`}
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.74rem', flexShrink: 0 }}
                >
                  Review
                </Link>
              ) : (
                <Link
                  to="/deadlines"
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.74rem', flexShrink: 0 }}
                >
                  Details
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
