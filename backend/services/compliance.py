"""
backend/services/compliance.py
Compliance rule checker, risk scoring, and record persistence.
"""

import logging
from datetime import datetime, timezone, date
from backend.services.database import db, Analysis, ComplianceItem, Deadline, Document, Notification

logger = logging.getLogger(__name__)


def create_compliance_records(document: Document, analysis_result: dict, user_id: int) -> Analysis:
    """
    Persist analysis results and update document with extracted metadata.
    Populates document.due_date, document.category, and document.status.
    """
    deadline_date = analysis_result.get("deadline_date")
    if isinstance(deadline_date, str):
        try:
            deadline_date = datetime.strptime(deadline_date, "%Y-%m-%d").date()
        except ValueError:
            deadline_date = None

    analysis = Analysis(
        document_id=document.id,
        raw_text=analysis_result.get("_raw_text", ""),
        document_type=analysis_result.get("document_type", "Compliance Notice"),
        category=analysis_result.get("category", "Other Compliance"),
        category_confidence=analysis_result.get("category_confidence", "Medium"),
        summary=analysis_result.get("summary", ""),
        deadline_text=analysis_result.get("deadline_text", ""),
        deadline_date=deadline_date,
        penalty_info=analysis_result.get("penalty_info", ""),
        penalty_amount=analysis_result.get("penalty_amount") or "",
        risk_level=analysis_result.get("risk_level", "MEDIUM"),
        urgency=analysis_result.get("urgency", "MEDIUM"),
    )
    analysis.requirements = analysis_result.get("requirements", [])
    analysis.actions = analysis_result.get("actions", [])

    db.session.add(analysis)
    db.session.flush()

    # Update document model fields per specification: due_date, category, status
    document.category = analysis.category or "Other Compliance"
    document.due_date = deadline_date
    document.risk_level = analysis.risk_level or "MEDIUM"
    document.status = "done"
    document.processing_stage = "Analysis complete"

    # If an obligation with deadline is extracted, persist ComplianceItem & Deadline
    if deadline_date:
        title = f"{analysis.document_type or analysis.category} — {document.original_filename}"
        item = ComplianceItem(
            analysis_id=analysis.id,
            user_id=user_id,
            title=title[:300],
            description=analysis.summary[:1000],
            deadline_date=deadline_date,
            status=_compute_status(deadline_date),
            category=analysis.category,
            risk_level=analysis.risk_level,
        )
        db.session.add(item)
        db.session.flush()

        deadline_rec = Deadline(
            compliance_item_id=item.id,
            user_id=user_id,
            due_date=deadline_date,
        )
        db.session.add(deadline_rec)

    db.session.commit()
    logger.info(f"Compliance records created for document {document.id}")
    return analysis


def _compute_status(deadline_date: date) -> str:
    if not deadline_date:
        return "active"
    today = datetime.now(timezone.utc).date()
    days = (deadline_date - today).days
    if days < 0:
        return "overdue"
    return "active"


def score_risk(analysis: Analysis) -> str:
    """Compute risk level based on deadline proximity and severity."""
    today = datetime.now(timezone.utc).date()
    base_risk = (analysis.risk_level or "MEDIUM").upper()

    if analysis.deadline_date:
        days = (analysis.deadline_date - today).days
        if days < 0:
            return "URGENT"
        elif days <= 3:
            return "HIGH"
        elif days <= 7:
            if base_risk in ("HIGH", "URGENT"):
                return "HIGH"
            return "MEDIUM"

    return base_risk


def get_deadline_status(deadline_date: date) -> dict:
    """Return status label, CSS style indicator, and days remaining."""
    today = datetime.now(timezone.utc).date()
    days = (deadline_date - today).days if deadline_date else None

    if days is None:
        return {"label": "No Deadline", "status_type": "none", "days": None}
    elif days < 0:
        return {"label": "Overdue", "status_type": "overdue", "days": days}
    elif days == 0:
        return {"label": "Due Today", "status_type": "urgent", "days": 0}
    elif days <= 3:
        return {"label": f"{days}d left", "status_type": "urgent", "days": days}
    elif days <= 7:
        return {"label": f"{days}d left", "status_type": "warning", "days": days}
    else:
        return {"label": f"{days}d left", "status_type": "normal", "days": days}


def create_analysis_notification(user_id: int, document: Document, analysis: Analysis):
    """Create notification when document analysis completes."""
    risk = (analysis.risk_level or "").upper()
    notif_type = "info"
    if risk in ("HIGH", "URGENT"):
        notif_type = "danger"
    elif risk == "MEDIUM":
        notif_type = "warning"

    msg_parts = [f"Analysis completed for '{document.original_filename}'."]
    if analysis.deadline_date:
        msg_parts.append(f"Due date: {analysis.deadline_date.strftime('%d %b %Y')}.")
    if risk in ("HIGH", "URGENT"):
        msg_parts.append("Immediate compliance action required.")

    notification = Notification(
        user_id=user_id,
        document_id=document.id,
        category=document.category,
        compliance_item_id=None,
        message=" ".join(msg_parts),
        type=notif_type,
        is_read=False,
    )
    db.session.add(notification)
    db.session.commit()
