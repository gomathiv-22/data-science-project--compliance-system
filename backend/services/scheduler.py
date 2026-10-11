"""
backend/services/scheduler.py
APScheduler background jobs for scanning compliance deadlines and emitting notifications.
"""

import logging
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from backend.services.database import db, Deadline, ComplianceItem, Document, Notification

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(daemon=True)


def scan_deadlines_and_notify(app=None):
    """
    Daily scan of upcoming due dates:
    - Creates Notification rows per user at 7, 3, and 1 days before, and on the due date (0 days).
    - Flags documents and compliance items as 'Overdue' if the deadline has passed.
    """
    def _execute():
        today = datetime.now(timezone.utc).date()
        logger.info(f"Running compliance deadline scan for {today}...")

        # 1. Scan Deadlines table
        active_deadlines = Deadline.query.filter_by(completed=False).all()
        created_count = 0

        for dl in active_deadlines:
            days_remaining = (dl.due_date - today).days
            item = db.session.get(ComplianceItem, dl.compliance_item_id)
            doc = None
            if item and item.analysis:
                doc = db.session.get(Document, item.analysis.document_id)

            title = item.title if item else (doc.original_filename if doc else "Compliance Task")
            category = item.category if item else (doc.category if doc else "General")

            # Check Overdue
            if days_remaining < 0:
                if item and item.status != "overdue":
                    item.status = "overdue"
                if doc and doc.status != "overdue":
                    doc.status = "overdue"

                # Create overdue notification if not already sent
                existing_overdue = Notification.query.filter_by(
                    user_id=dl.user_id,
                    compliance_item_id=dl.compliance_item_id,
                    type="danger"
                ).filter(Notification.message.like("%OVERDUE%")).first()

                if not existing_overdue:
                    notif = Notification(
                        user_id=dl.user_id,
                        document_id=doc.id if doc else None,
                        compliance_item_id=dl.compliance_item_id,
                        category=category,
                        message=f"🚨 OVERDUE: '{title}' was due on {dl.due_date.strftime('%d %b %Y')}. Take immediate action to mitigate penalties.",
                        type="danger",
                        is_read=False,
                    )
                    db.session.add(notif)
                    created_count += 1

            # 7 Days Reminder
            elif days_remaining == 7 and not dl.reminder_7d_sent:
                notif = Notification(
                    user_id=dl.user_id,
                    document_id=doc.id if doc else None,
                    compliance_item_id=dl.compliance_item_id,
                    category=category,
                    message=f"📅 7 days remaining: '{title}' is due on {dl.due_date.strftime('%d %b %Y')}.",
                    type="info",
                    is_read=False,
                )
                db.session.add(notif)
                dl.reminder_7d_sent = True
                created_count += 1

            # 3 Days Reminder
            elif days_remaining == 3 and not dl.reminder_3d_sent:
                notif = Notification(
                    user_id=dl.user_id,
                    document_id=doc.id if doc else None,
                    compliance_item_id=dl.compliance_item_id,
                    category=category,
                    message=f"⏳ 3 days remaining: '{title}' deadline is approaching ({dl.due_date.strftime('%d %b %Y')}).",
                    type="warning",
                    is_read=False,
                )
                db.session.add(notif)
                dl.reminder_3d_sent = True
                created_count += 1

            # 1 Day Reminder
            elif days_remaining == 1 and not dl.reminder_1d_sent:
                notif = Notification(
                    user_id=dl.user_id,
                    document_id=doc.id if doc else None,
                    compliance_item_id=dl.compliance_item_id,
                    category=category,
                    message=f"⚠ Action Required Tomorrow: '{title}' deadline is tomorrow ({dl.due_date.strftime('%d %b %Y')}).",
                    type="danger",
                    is_read=False,
                )
                db.session.add(notif)
                dl.reminder_1d_sent = True
                created_count += 1

            # Due Today Reminder
            elif days_remaining == 0 and not dl.reminder_0d_sent:
                notif = Notification(
                    user_id=dl.user_id,
                    document_id=doc.id if doc else None,
                    compliance_item_id=dl.compliance_item_id,
                    category=category,
                    message=f"🚨 DUE TODAY: '{title}' must be submitted or filed today ({dl.due_date.strftime('%d %b %Y')})!",
                    type="danger",
                    is_read=False,
                )
                db.session.add(notif)
                dl.reminder_0d_sent = True
                created_count += 1

        # 2. Also check Documents with due_dates that don't have a Deadline record
        standalone_docs = Document.query.filter(
            Document.due_date.isnot(None),
            Document.status != "failed"
        ).all()

        for doc in standalone_docs:
            days_remaining = (doc.due_date - today).days
            if days_remaining < 0 and doc.status != "overdue":
                doc.status = "overdue"

        db.session.commit()
        logger.info(f"Deadline scan completed. Generated {created_count} new notifications.")
        return created_count

    if app:
        with app.app_context():
            return _execute()
    else:
        return _execute()


def init_scheduler(app):
    """Start APScheduler background runner with a daily job."""
    if not scheduler.running:
        scheduler.add_job(
            func=scan_deadlines_and_notify,
            args=[app],
            trigger="interval",
            hours=24,
            id="daily_compliance_deadline_scan",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler initialized for compliance deadline scanning.")
        # Trigger an initial scan on startup
        try:
            with app.app_context():
                scan_deadlines_and_notify(app)
        except Exception as e:
            logger.warning(f"Initial deadline scan could not complete: {e}")
