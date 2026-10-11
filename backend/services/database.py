"""
backend/services/database.py
SQLAlchemy models and database initialization for MSME Compliance Assistant.
"""

from datetime import datetime, timezone
import json
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    business_name = db.Column(db.String(200), nullable=True)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    preferred_language = db.Column(db.String(10), default="en")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    documents = db.relationship("Document", backref="owner", lazy="dynamic", cascade="all, delete-orphan")
    notifications = db.relationship("Notification", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    compliance_items = db.relationship("ComplianceItem", backref="user", lazy="dynamic", cascade="all, delete-orphan")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "business_name": self.business_name or "",
            "email": self.email,
            "phone": self.phone or "",
            "preferred_language": self.preferred_language or "en",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    filename = db.Column(db.String(256), nullable=False)          # stored filename on disk
    original_filename = db.Column(db.String(256), nullable=False)  # original upload name
    file_path = db.Column(db.String(512), nullable=False)
    file_type = db.Column(db.String(20), default="pdf")           # pdf | image
    upload_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Extended fields per requirement
    due_date = db.Column(db.Date, nullable=True)                  # statutory due date if extracted
    category = db.Column(db.String(50), default="Other Compliance") # Tax | Labour | Environmental | Legal Notice | Other Compliance
    status = db.Column(db.String(30), default="pending")          # pending | processing | done | failed | overdue
    
    processing_stage = db.Column(db.String(100), default="")
    risk_level = db.Column(db.String(20), default="MEDIUM")
    error_message = db.Column(db.Text, default="")

    # Relationships
    analysis = db.relationship("Analysis", backref="document", uselist=False, cascade="all, delete-orphan")
    notifications = db.relationship("Notification", backref="document", lazy="dynamic")
    translations = db.relationship("Translation", backref="document", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_type": self.file_type,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "category": self.category or "Other Compliance",
            "status": self.status,
            "processing_stage": self.processing_stage or "",
            "risk_level": self.risk_level or "MEDIUM",
            "error_message": self.error_message or "",
            "has_analysis": self.analysis is not None,
        }


class Analysis(db.Model):
    __tablename__ = "analyses"

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey("documents.id"), nullable=False)
    raw_text = db.Column(db.Text, default="")
    document_type = db.Column(db.String(100), default="")
    category = db.Column(db.String(50), default="")
    category_confidence = db.Column(db.String(20), default="")
    summary = db.Column(db.Text, default="")
    requirements_json = db.Column(db.Text, default="[]")
    actions_json = db.Column(db.Text, default="[]")
    deadline_text = db.Column(db.String(200), default="")
    deadline_date = db.Column(db.Date, nullable=True)
    penalty_info = db.Column(db.Text, default="")
    penalty_amount = db.Column(db.String(100), default="")
    risk_level = db.Column(db.String(20), default="")
    urgency = db.Column(db.String(20), default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    compliance_items = db.relationship("ComplianceItem", backref="analysis", lazy="dynamic", cascade="all, delete-orphan")

    @property
    def requirements(self):
        try:
            return json.loads(self.requirements_json)
        except Exception:
            return []

    @requirements.setter
    def requirements(self, value):
        self.requirements_json = json.dumps(value)

    @property
    def actions(self):
        try:
            return json.loads(self.actions_json)
        except Exception:
            return []

    @actions.setter
    def actions(self, value):
        self.actions_json = json.dumps(value)

    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "document_type": self.document_type,
            "category": self.category,
            "category_confidence": self.category_confidence,
            "summary": self.summary,
            "requirements": self.requirements,
            "actions": self.actions,
            "deadline_text": self.deadline_text,
            "deadline_date": self.deadline_date.isoformat() if self.deadline_date else None,
            "penalty_info": self.penalty_info,
            "penalty_amount": self.penalty_amount,
            "risk_level": self.risk_level,
            "urgency": self.urgency,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ComplianceItem(db.Model):
    __tablename__ = "compliance_items"

    id = db.Column(db.Integer, primary_key=True)
    analysis_id = db.Column(db.Integer, db.ForeignKey("analyses.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, default="")
    deadline_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), default="active")   # active | completed | overdue
    category = db.Column(db.String(50), default="")
    risk_level = db.Column(db.String(20), default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    deadlines = db.relationship("Deadline", backref="compliance_item", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        today = datetime.now(timezone.utc).date()
        days_remaining = (self.deadline_date - today).days if self.deadline_date else None
        return {
            "id": self.id,
            "analysis_id": self.analysis_id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "deadline_date": self.deadline_date.isoformat() if self.deadline_date else None,
            "status": self.status,
            "category": self.category,
            "risk_level": self.risk_level,
            "days_remaining": days_remaining,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Deadline(db.Model):
    __tablename__ = "deadlines"

    id = db.Column(db.Integer, primary_key=True)
    compliance_item_id = db.Column(db.Integer, db.ForeignKey("compliance_items.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    reminder_7d_sent = db.Column(db.Boolean, default=False)
    reminder_3d_sent = db.Column(db.Boolean, default=False)
    reminder_1d_sent = db.Column(db.Boolean, default=False)
    reminder_0d_sent = db.Column(db.Boolean, default=False)
    completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        today = datetime.now(timezone.utc).date()
        days_remaining = (self.due_date - today).days
        return {
            "id": self.id,
            "compliance_item_id": self.compliance_item_id,
            "user_id": self.user_id,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "days_remaining": days_remaining,
            "completed": self.completed,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    document_id = db.Column(db.Integer, db.ForeignKey("documents.id"), nullable=True)
    compliance_item_id = db.Column(db.Integer, nullable=True)
    message = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), default="General") # Tax | Labour | Environmental etc.
    type = db.Column(db.String(30), default="info")        # info | warning | danger | success
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        doc = Document.query.get(self.document_id) if self.document_id else None
        item = ComplianceItem.query.get(self.compliance_item_id) if self.compliance_item_id else None
        due_date = None
        days_remaining = None
        if item and item.deadline_date:
            due_date = item.deadline_date.isoformat()
            today = datetime.now(timezone.utc).date()
            days_remaining = (item.deadline_date - today).days
        elif doc and doc.due_date:
            due_date = doc.due_date.isoformat()
            today = datetime.now(timezone.utc).date()
            days_remaining = (doc.due_date - today).days

        return {
            "id": self.id,
            "user_id": self.user_id,
            "document_id": self.document_id,
            "document_name": doc.original_filename if doc else None,
            "compliance_item_id": self.compliance_item_id,
            "message": self.message,
            "category": self.category or (doc.category if doc else "General"),
            "type": self.type,
            "is_read": self.is_read,
            "due_date": due_date,
            "days_remaining": days_remaining,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Translation(db.Model):
    __tablename__ = "translations"

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey("documents.id"), nullable=False)
    analysis_id = db.Column(db.Integer, db.ForeignKey("analyses.id"), nullable=True)
    language_code = db.Column(db.String(10), nullable=False)
    language_name = db.Column(db.String(50), default="")
    translated_summary = db.Column(db.Text, default="")
    translated_actions_json = db.Column(db.Text, default="[]")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    @property
    def translated_actions(self):
        try:
            return json.loads(self.translated_actions_json)
        except Exception:
            return []

    @translated_actions.setter
    def translated_actions(self, value):
        self.translated_actions_json = json.dumps(value, ensure_ascii=False)

    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "language_code": self.language_code,
            "language_name": self.language_name,
            "translated_summary": self.translated_summary,
            "translated_actions": self.translated_actions,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
