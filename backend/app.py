"""
backend/app.py
Main Flask REST API application for MSME Legal Compliance Assistant.
Returns JSON ONLY — never returns HTML.
"""

import os
import uuid
import logging
import threading
from pathlib import Path
from datetime import datetime, timezone, timedelta

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from werkzeug.utils import secure_filename
import sys
from pathlib import Path

# Ensure both project root and backend folder are in sys.path
root_dir = str(Path(__file__).resolve().parent.parent)
backend_dir = str(Path(__file__).resolve().parent)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from backend.services.database import (
    db, init_db, User, Document, Analysis,
    ComplianceItem, Deadline, Notification, Translation
)
from backend.services.auth import validate_signup, create_user, get_user_by_email, get_user_by_id
from backend.services.ocr import extract_text_from_file
from backend.services.ai_analysis import analyze_document
from backend.services.compliance import (
    create_compliance_records, create_analysis_notification,
    get_deadline_status
)
from backend.services.scheduler import init_scheduler, scan_deadlines_and_notify
from backend.services.translation import (
    translate_report_content, get_supported_languages, SUPPORTED_LANGUAGES
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("msme_backend")

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}


def _allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def create_app():
    app = Flask(__name__)

    # Config
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key-msme-compliance")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key-msme-2025")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

    base_dir = Path(__file__).resolve().parent
    db_relative = os.getenv("DATABASE_PATH", "database/compliance.db")
    db_path = (base_dir / db_relative).resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    max_mb = int(os.getenv("MAX_UPLOAD_MB", 25))
    app.config["MAX_CONTENT_LENGTH"] = max_mb * 1024 * 1024

    upload_folder = (base_dir / os.getenv("UPLOAD_FOLDER", "uploads")).resolve()
    upload_folder.mkdir(parents=True, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = str(upload_folder)

 
    # Enable CORS for local development and deployed frontend
    frontend_url = os.getenv(
    "FRONTEND_URL",
    "https://data-science-project-compliance-sys.vercel.app"
    ).rstrip("/")

    allowed_origins = [
    frontend_url,
    "https://data-science-project-compliance-sys.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    ]

    CORS(
    app,
    resources={r"/api/*": {"origins": allowed_origins}},
    supports_credentials=True,
    )


    # Initialize DB and JWT
    init_db(app)
    jwt = JWTManager(app)

    @jwt.unauthorized_loader
    def unauthorized_callback(callback):
        return jsonify({"error": "Missing or invalid Authorization Bearer token.", "code": "UNAUTHORIZED"}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired. Please log in again.", "code": "TOKEN_EXPIRED"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(callback):
        return jsonify({"error": "Invalid token provided.", "code": "INVALID_TOKEN"}), 401

    # Start APScheduler
    init_scheduler(app)

    # Register API routes
    _register_routes(app)

    return app


def _register_routes(app: Flask):

    # -----------------------------------------------------------------------
    # Health check
    # -----------------------------------------------------------------------
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "healthy",
            "service": "MSME Legal Compliance Assistant API",
            "supported_languages": list(SUPPORTED_LANGUAGES.keys()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    # -----------------------------------------------------------------------
    # Auth Endpoints
    # -----------------------------------------------------------------------
    @app.route("/api/signup", methods=["POST"])
    def signup():
        data = request.get_json(silent=True) or request.form.to_dict()
        full_name = data.get("full_name") or data.get("name", "")
        business_name = data.get("business_name", "")
        email = data.get("email", "")
        password = data.get("password", "")
        confirm = data.get("confirm_password", password)
        phone = data.get("phone", "")
        preferred_language = data.get("preferred_language", "en")

        ok, errors = validate_signup(full_name, business_name, email, password, confirm, phone)
        if not ok:
            return jsonify({"error": errors[0], "details": errors}), 400

        user = create_user(
            full_name=full_name,
            business_name=business_name,
            email=email,
            password=password,
            phone=phone,
            preferred_language=preferred_language if preferred_language in SUPPORTED_LANGUAGES else "en"
        )

        token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "Account created successfully.",
            "token": token,
            "user": user.to_dict(),
        }), 201

    @app.route("/api/login", methods=["POST"])
    def login():
        data = request.get_json(silent=True) or request.form.to_dict()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        user = get_user_by_email(email)
        if not user or not user.check_password(password):
            return jsonify({"error": "Invalid email or password. Please verify your credentials."}), 401

        token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "Login successful.",
            "token": token,
            "user": user.to_dict(),
        }), 200

    @app.route("/api/profile", methods=["GET", "PATCH"])
    @jwt_required()
    def profile():
        user_id = int(get_jwt_identity())
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({"error": "User not found."}), 404

        if request.method == "PATCH":
            data = request.get_json(silent=True) or {}
            if "full_name" in data and data["full_name"].strip():
                user.full_name = data["full_name"].strip()
            if "business_name" in data:
                user.business_name = data["business_name"].strip()
            if "phone" in data:
                user.phone = data["phone"].strip()
            if "preferred_language" in data:
                lang = data["preferred_language"]
                if lang in SUPPORTED_LANGUAGES:
                    user.preferred_language = lang
            db.session.commit()

        return jsonify({
            "user": user.to_dict(),
            "supported_languages": get_supported_languages(),
        })

    # -----------------------------------------------------------------------
    # Dashboard Endpoint
    # -----------------------------------------------------------------------
    @app.route("/api/dashboard", methods=["GET"])
    @jwt_required()
    def dashboard():
        user_id = int(get_jwt_identity())
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({"error": "User not found."}), 404

        # Run deadline check
        scan_deadlines_and_notify(app)

        # Statistics
        total_docs = Document.query.filter_by(user_id=user_id).count()
        docs_analyzed = Document.query.filter_by(user_id=user_id, status="done").count()
        active_obligations = ComplianceItem.query.filter_by(user_id=user_id, status="active").count()
        overdue_count = (
            ComplianceItem.query.filter_by(user_id=user_id, status="overdue").count() +
            Document.query.filter_by(user_id=user_id, status="overdue").count()
        )
        high_risk_count = ComplianceItem.query.filter_by(user_id=user_id).filter(
            ComplianceItem.risk_level.in_(["HIGH", "URGENT"])
        ).filter(ComplianceItem.status != "completed").count()

        # Upcoming deadlines
        today = datetime.now(timezone.utc).date()
        upcoming_items = (
            ComplianceItem.query.filter_by(user_id=user_id)
            .filter(ComplianceItem.status.in_(["active", "overdue"]))
            .order_by(ComplianceItem.deadline_date.asc())
            .limit(10)
            .all()
        )

        deadlines_data = []
        for item in upcoming_items:
            doc = db.session.get(Document, item.analysis.document_id) if item.analysis else None
            status_info = get_deadline_status(item.deadline_date)
            deadlines_data.append({
                **item.to_dict(),
                "document_id": doc.id if doc else None,
                "document_name": doc.original_filename if doc else None,
                "status_info": status_info,
            })

        # Recent documents
        recent_docs = (
            Document.query.filter_by(user_id=user_id)
            .order_by(Document.upload_date.desc())
            .limit(8)
            .all()
        )

        # Unread notifications count
        unread_notifications = Notification.query.filter_by(user_id=user_id, is_read=False).count()

        return jsonify({
            "user": user.to_dict(),
            "metrics": {
                "total_documents": total_docs,
                "documents_analyzed": docs_analyzed,
                "active_obligations": active_obligations,
                "overdue_count": overdue_count,
                "high_risk_count": high_risk_count,
                "unread_notifications": unread_notifications,
            },
            "deadlines": deadlines_data,
            "documents": [d.to_dict() for d in recent_docs],
        })

    # -----------------------------------------------------------------------
    # Document Upload & Processing Pipeline
    # -----------------------------------------------------------------------
    @app.route("/api/upload", methods=["POST"])
    @jwt_required()
    def upload_document():
        user_id = int(get_jwt_identity())
        if "document" not in request.files and "file" not in request.files:
            return jsonify({"error": "No document file provided in request."}), 400

        file = request.files.get("document") or request.files.get("file")
        if not file or not file.filename:
            return jsonify({"error": "Please select a document file to upload."}), 400

        if not _allowed_file(file.filename):
            return jsonify({"error": "Unsupported file format. Please upload PDF or image files (PNG, JPG, TIFF)."}), 400

        original_name = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}_{original_name}"
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
        file.save(file_path)

        ext = Path(original_name).suffix.lower()
        file_type = "pdf" if ext == ".pdf" else "image"

        doc = Document(
            user_id=user_id,
            filename=unique_name,
            original_filename=original_name,
            file_path=file_path,
            file_type=file_type,
            status="processing",
            processing_stage="Document uploaded. Extracting text...",
        )
        db.session.add(doc)
        db.session.commit()

        # Start background processing thread: OCR -> Gemini -> Compliance Rules
        thread = threading.Thread(
            target=_process_document_pipeline,
            args=(app, doc.id, user_id),
            daemon=True,
        )
        thread.start()

        return jsonify({
            "message": "File uploaded successfully. Processing initiated.",
            "document": doc.to_dict(),
        }), 202

    @app.route("/api/documents", methods=["GET"])
    @jwt_required()
    def list_documents():
        user_id = int(get_jwt_identity())
        category = request.args.get("category")
        status = request.args.get("status")

        query = Document.query.filter_by(user_id=user_id)
        if category and category != "all":
            query = query.filter_by(category=category)
        if status and status != "all":
            query = query.filter_by(status=status)

        docs = query.order_by(Document.upload_date.desc()).all()
        return jsonify({
            "documents": [d.to_dict() for d in docs],
            "total": len(docs),
        })

    @app.route("/api/documents/<int:doc_id>", methods=["GET", "DELETE"])
    @jwt_required()
    def document_detail(doc_id):
        user_id = int(get_jwt_identity())
        doc = Document.query.filter_by(id=doc_id, user_id=user_id).first_or_404()

        if request.method == "DELETE":
            try:
                if os.path.exists(doc.file_path):
                    os.remove(doc.file_path)
            except Exception as e:
                logger.warning(f"Could not remove physical file {doc.file_path}: {e}")
            db.session.delete(doc)
            db.session.commit()
            return jsonify({"message": f"Document '{doc.original_filename}' deleted."})

        return jsonify({
            "document": doc.to_dict(),
            "has_analysis": doc.analysis is not None,
        })

    @app.route("/api/documents/<int:doc_id>/status", methods=["GET"])
    @jwt_required()
    def document_status(doc_id):
        user_id = int(get_jwt_identity())
        doc = Document.query.filter_by(id=doc_id, user_id=user_id).first_or_404()
        return jsonify({
            "id": doc.id,
            "status": doc.status,
            "stage": doc.processing_stage,
            "error_message": doc.error_message,
            "due_date": doc.due_date.isoformat() if doc.due_date else None,
            "category": doc.category,
        })

    # -----------------------------------------------------------------------
    # Report & Multilingual Translation Endpoint
    # -----------------------------------------------------------------------
    @app.route("/api/report/<int:doc_id>", methods=["GET"])
    @jwt_required()
    def get_report(doc_id):
        user_id = int(get_jwt_identity())
        doc = Document.query.filter_by(id=doc_id, user_id=user_id).first_or_404()

        if doc.status == "processing":
            return jsonify({
                "status": "processing",
                "stage": doc.processing_stage,
                "message": "Document analysis is currently running.",
            }), 202

        if doc.status == "failed" or not doc.analysis:
            return jsonify({
                "status": "failed",
                "error": doc.error_message or "Analysis failed for this document.",
            }), 400

        analysis = doc.analysis
        if analysis.raw_text and (
            "GEMINI_API_KEY" in (analysis.summary or "")
            or (analysis.summary or "").startswith("Document received.")
        ):
            refreshed = analyze_document(analysis.raw_text)
            analysis.document_type = refreshed.get("document_type", analysis.document_type)
            analysis.category = refreshed.get("category", analysis.category)
            analysis.category_confidence = refreshed.get("category_confidence", analysis.category_confidence)
            analysis.summary = refreshed.get("summary", analysis.summary)
            analysis.requirements = refreshed.get("requirements", analysis.requirements)
            analysis.actions = refreshed.get("actions", analysis.actions)
            analysis.deadline_text = refreshed.get("deadline_text", analysis.deadline_text)
            analysis.deadline_date = refreshed.get("deadline_date", analysis.deadline_date)
            analysis.penalty_info = refreshed.get("penalty_info", analysis.penalty_info)
            analysis.penalty_amount = refreshed.get("penalty_amount", analysis.penalty_amount)
            analysis.risk_level = refreshed.get("risk_level", analysis.risk_level)
            analysis.urgency = refreshed.get("urgency", analysis.urgency)
            db.session.commit()
            Translation.query.filter_by(document_id=doc.id).delete()
            db.session.commit()
        user = get_user_by_id(user_id)
        requested_lang = request.args.get("lang") or (user.preferred_language if user else "en")
        if requested_lang not in SUPPORTED_LANGUAGES:
            requested_lang = "en"

        # Server-side Google translation, using the public endpoint when no Cloud API key is configured.
        translation_data = translate_report_content(
            document_id=doc.id,
            document_type=analysis.document_type,
            summary=analysis.summary,
            actions=analysis.actions,
            target_lang=requested_lang,
        )

        status_info = get_deadline_status(analysis.deadline_date) if analysis.deadline_date else None

        # Build extracted deadlines table data
        extracted_deadlines = []
        if analysis.deadline_date:
            priority = analysis.urgency or analysis.risk_level or "MEDIUM"
            extracted_deadlines.append({
                "action": analysis.actions[0] if analysis.actions else f"Compliance Filing for {analysis.document_type}",
                "due_date": analysis.deadline_date.isoformat(),
                "priority": priority,
                "status": "Overdue" if (status_info and status_info.get("status_type") == "overdue") else "Active",
                "days_remaining": status_info.get("days") if status_info else None,
            })
            # If multiple actions exist, link subsequent actions with statutory timeline
            for idx, act in enumerate(analysis.actions[1:], start=2):
                extracted_deadlines.append({
                    "action": act,
                    "due_date": analysis.deadline_date.isoformat(),
                    "priority": "MEDIUM",
                    "status": "Pending",
                    "days_remaining": status_info.get("days") if status_info else None,
                })

        return jsonify({
            "document": doc.to_dict(),
            "original_analysis": {
                "document_type": analysis.document_type,
                "category": analysis.category,
                "category_confidence": analysis.category_confidence,
                "summary": analysis.summary,
                "requirements": analysis.requirements,
                "actions": analysis.actions,
                "deadline_text": analysis.deadline_text,
                "deadline_date": analysis.deadline_date.isoformat() if analysis.deadline_date else None,
                "penalty_info": analysis.penalty_info,
                "penalty_amount": analysis.penalty_amount,
                "risk_level": analysis.risk_level,
                "urgency": analysis.urgency,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
            },
            "active_language": requested_lang,
            "language_name": SUPPORTED_LANGUAGES.get(requested_lang, "English"),
            "supported_languages": get_supported_languages(),
            "translated_content": {
                "document_type": translation_data["translated_document_type"],
                "summary": translation_data["translated_summary"],
                "actions": translation_data["translated_actions"],
                "from_cache": translation_data["from_cache"],
                "error": translation_data["error"],
            },
            "deadline_status": status_info,
            "extracted_deadlines": extracted_deadlines,
        })

    # -----------------------------------------------------------------------
    # Notifications Endpoints
    # -----------------------------------------------------------------------
    @app.route("/api/notifications", methods=["GET"])
    @jwt_required()
    def get_notifications():
        user_id = int(get_jwt_identity())
        notifs = (
            Notification.query.filter_by(user_id=user_id)
            .order_by(Notification.created_at.desc())
            .limit(50)
            .all()
        )
        unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()

        return jsonify({
            "unread_count": unread_count,
            "notifications": [n.to_dict() for n in notifs],
        })

    @app.route("/api/notifications/<int:notif_id>", methods=["PATCH"])
    @jwt_required()
    def mark_notification_read(notif_id):
        user_id = int(get_jwt_identity())
        notif = Notification.query.filter_by(id=notif_id, user_id=user_id).first_or_404()
        notif.is_read = True
        db.session.commit()
        return jsonify({"message": "Notification marked as read.", "id": notif.id})

    @app.route("/api/notifications/mark-all-read", methods=["POST"])
    @jwt_required()
    def mark_all_notifications_read():
        user_id = int(get_jwt_identity())
        Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
        db.session.commit()
        return jsonify({"message": "All notifications marked as read."})

    # -----------------------------------------------------------------------
    # Deadlines Endpoints
    # -----------------------------------------------------------------------
    @app.route("/api/deadlines/<int:item_id>/complete", methods=["POST"])
    @jwt_required()
    def complete_obligation(item_id):
        user_id = int(get_jwt_identity())
        item = ComplianceItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()
        item.status = "completed"

        # Also complete related Deadlines
        Deadline.query.filter_by(compliance_item_id=item.id).update({
            "completed": True,
            "completed_at": datetime.now(timezone.utc),
        })

        db.session.commit()
        return jsonify({"message": f"Obligation '{item.title}' marked as completed."})

    # -----------------------------------------------------------------------
    # Compliance Items List Endpoint
    # -----------------------------------------------------------------------
    @app.route("/api/compliance", methods=["GET"])
    @jwt_required()
    def get_compliance_items():
        user_id = int(get_jwt_identity())
        category = request.args.get("category")
        status = request.args.get("status")

        query = ComplianceItem.query.filter_by(user_id=user_id)
        if category and category != "all":
            query = query.filter_by(category=category)
        if status and status != "all":
            query = query.filter_by(status=status)

        items = query.order_by(ComplianceItem.deadline_date.asc()).all()
        return jsonify({
            "items": [item.to_dict() for item in items],
            "total": len(items),
        })

    # -----------------------------------------------------------------------
    # Risk Analysis Overview Endpoint
    # -----------------------------------------------------------------------
    @app.route("/api/risk-analysis", methods=["GET"])
    @jwt_required()
    def get_risk_analysis():
        user_id = int(get_jwt_identity())
        items = ComplianceItem.query.filter_by(user_id=user_id).all()
        docs = Document.query.filter_by(user_id=user_id, status="done").all()

        high_risk_items = [i.to_dict() for i in items if i.risk_level in ("HIGH", "URGENT")]
        medium_risk_items = [i.to_dict() for i in items if i.risk_level == "MEDIUM"]
        low_risk_items = [i.to_dict() for i in items if i.risk_level == "LOW"]

        analyses = [d.analysis for d in docs if d.analysis]
        penalties = [
            {
                "document_name": a.document.original_filename,
                "penalty_amount": a.penalty_amount,
                "penalty_info": a.penalty_info,
                "category": a.category,
                "risk_level": a.risk_level,
            }
            for a in analyses if a.penalty_amount or a.penalty_info
        ]

        return jsonify({
            "summary": {
                "high_risk_count": len(high_risk_items),
                "medium_risk_count": len(medium_risk_items),
                "low_risk_count": len(low_risk_items),
                "total_audited": len(docs),
            },
            "high_risk_items": high_risk_items,
            "medium_risk_items": medium_risk_items,
            "penalties": penalties,
        })

    # -----------------------------------------------------------------------
    # Deadlines & Reminders Full List Endpoint
    # -----------------------------------------------------------------------
    @app.route("/api/deadlines", methods=["GET"])
    @jwt_required()
    def get_all_deadlines():
        user_id = int(get_jwt_identity())
        status = request.args.get("status")

        query = ComplianceItem.query.filter_by(user_id=user_id)
        if status and status != "all":
            query = query.filter_by(status=status)

        items = query.order_by(ComplianceItem.deadline_date.asc()).all()
        today = datetime.now(timezone.utc).date()

        deadlines_list = []
        for item in items:
            doc = db.session.get(Document, item.analysis.document_id) if item.analysis else None
            status_info = get_deadline_status(item.deadline_date)
            deadlines_list.append({
                **item.to_dict(),
                "document_id": doc.id if doc else None,
                "document_name": doc.original_filename if doc else None,
                "status_info": status_info,
            })

        return jsonify({
            "deadlines": deadlines_list,
            "total": len(deadlines_list),
        })

    # -----------------------------------------------------------------------
    # Reports Registry Endpoint
    # -----------------------------------------------------------------------
    @app.route("/api/reports", methods=["GET"])
    @jwt_required()
    def get_reports_registry():
        user_id = int(get_jwt_identity())
        docs = Document.query.filter_by(user_id=user_id, status="done").order_by(Document.upload_date.desc()).all()

        reports = []
        for d in docs:
            a = d.analysis
            reports.append({
                "document_id": d.id,
                "filename": d.original_filename,
                "category": d.category or (a.category if a else "General"),
                "risk_level": d.risk_level or (a.risk_level if a else "MEDIUM"),
                "due_date": d.due_date.isoformat() if d.due_date else None,
                "upload_date": d.upload_date.isoformat() if d.upload_date else None,
                "summary": a.summary if a else "",
                "penalty_amount": a.penalty_amount if a else None,
            })

        return jsonify({
            "reports": reports,
            "total": len(reports),
        })

    # -----------------------------------------------------------------------
    # Error Handlers — ALWAYS RETURN JSON
    # -----------------------------------------------------------------------
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found.", "status_code": 404}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed.", "status_code": 405}), 405

    @app.errorhandler(413)
    def payload_too_large(e):
        return jsonify({"error": "Uploaded file is too large.", "status_code": 413}), 413

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Internal server error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error occurred.", "status_code": 500}), 500


def _process_document_pipeline(app: Flask, doc_id: int, user_id: int):
    """
    Background worker executing:
    File -> OCR (pdfplumber/EasyOCR) -> Gemini 1.5 Flash -> Compliance Rule Checker -> Database
    """
    with app.app_context():
        doc = db.session.get(Document, doc_id)
        if not doc:
            return

        def _update_stage(stage: str):
            doc.processing_stage = stage
            db.session.commit()

        try:
            # 1. OCR text extraction
            _update_stage("Extracting text with EasyOCR / pdfplumber...")
            raw_text, ocr_method = extract_text_from_file(doc.file_path)
            logger.info(f"Doc {doc_id} OCR finished via {ocr_method}. Characters: {len(raw_text)}")

            # 2. Compliance analysis (Gemini is called ONLY here, never for translation)
            _update_stage("Auditing compliance obligations and statutory clauses...")
            result = analyze_document(raw_text)
            result["_raw_text"] = raw_text

            # 3. Compliance rule checker and persistence
            _update_stage("Extracting deadlines and creating compliance items...")
            analysis = create_compliance_records(doc, result, user_id)

            # 4. Generate initial notification
            create_analysis_notification(user_id, doc, analysis)

            # 5. Mark done
            doc.status = "done"
            doc.processing_stage = "Analysis complete"
            db.session.commit()
            logger.info(f"Document {doc_id} analysis successfully finalized.")

        except Exception as e:
            logger.error(f"Pipeline failure for doc {doc_id}: {e}", exc_info=True)
            doc.status = "failed"
            doc.processing_stage = "Analysis failed"
            doc.error_message = f"Processing error: {str(e)}"
            db.session.commit()


# App instance
app = create_app()

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    port = int(os.getenv("PORT", 5000))
    app.run(debug=debug, host="0.0.0.0", port=port)
