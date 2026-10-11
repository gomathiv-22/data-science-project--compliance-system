"""
backend/test_api.py
Comprehensive automated test suite for MSME Compliance REST API.
Verifies all endpoints return pure JSON (no HTML), validates auth, deadlines,
notifications, and Google Translate support for en, ta, ml, te.
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure root is in path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app import create_app
from backend.services.database import db, User, Document, Analysis, ComplianceItem, Deadline, Notification

def run_tests():
    app = create_app()
    app.config["TESTING"] = True
    client = app.test_client()

    print("\n" + "="*60)
    print("RUNNING AUTOMATED TEST SUITE FOR MSME COMPLIANCE API")
    print("="*60)

    # 1. Health check & JSON verification
    print("\n[TEST 1] GET /api/health (Checking JSON output & supported langs)")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert res.content_type.startswith("application/json"), f"Expected JSON, got {res.content_type}"
    data = res.get_json()
    assert "supported_languages" in data
    assert set(data["supported_languages"]) == {"en", "ta", "ml", "te"}
    print(f"  PASS: Health check JSON valid: {data['service']}")

    # 2. Verify 404 handler returns JSON only (never HTML)
    print("\n[TEST 2] 404 Route Verification (Must return JSON, not HTML)")
    res = client.get("/non-existent-route-for-testing")
    assert res.status_code == 404
    assert res.content_type.startswith("application/json"), f"Expected JSON, got {res.content_type}"
    print(f"  PASS: 404 returned pure JSON: {res.get_json()}")

    # 3. User Registration (POST /api/signup)
    print("\n[TEST 3] POST /api/signup (User Registration)")
    test_email = f"msme_test_{int(datetime.now().timestamp())}@precisiontools.in"
    signup_payload = {
        "full_name": "Senthil Nathan",
        "business_name": "Precision Tools Coimbatore Pvt Ltd",
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "phone": "9876543210",
        "preferred_language": "ta"
    }
    res = client.post("/api/signup", json=signup_payload)
    assert res.status_code == 201, f"Signup failed: {res.get_data(as_text=True)}"
    data = res.get_json()
    assert "token" in data
    assert data["user"]["email"] == test_email
    token = data["token"]
    user_id = data["user"]["id"]
    print(f"  PASS: User created with ID {user_id}, token issued.")

    # 4. User Login (POST /api/login)
    print("\n[TEST 4] POST /api/login (Authentication)")
    login_payload = {"email": test_email, "password": "SecurePassword123!"}
    res = client.post("/api/login", json=login_payload)
    assert res.status_code == 200
    token = res.get_json()["token"]
    print(f"  PASS: Login verified and new JWT issued.")

    # 5. Protected endpoints without token (Expect 401 JSON)
    print("\n[TEST 5] Protected Endpoint Security (Expect 401 without JWT)")
    res = client.get("/api/dashboard")
    assert res.status_code == 401
    assert res.content_type.startswith("application/json")
    print(f"  PASS: Unauthorized request rejected with JSON 401: {res.get_json()}")

    # 6. Protected Dashboard (GET /api/dashboard with JWT)
    print("\n[TEST 6] GET /api/dashboard (JWT Protected)")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert "metrics" in data
    assert "deadlines" in data
    assert "documents" in data
    print(f"  PASS: Dashboard returned metrics: {data['metrics']}")

    # 7. Document Seed & Pipeline Test
    print("\n[TEST 7] Seed document with Statutory Deadline & Category")
    with app.app_context():
        # Create sample GST Notice
        today = datetime.now(timezone.utc).date()
        due_in_3_days = today + timedelta(days=3)

        doc = Document(
            user_id=user_id,
            filename="gst_notice_oct2025.pdf",
            original_filename="GST_DRC-01A_Intimation.pdf",
            file_path="uploads/gst_notice_oct2025.pdf",
            file_type="pdf",
            due_date=due_in_3_days,
            category="Tax",
            status="done",
            processing_stage="Analysis complete",
            risk_level="HIGH"
        )
        db.session.add(doc)
        db.session.flush()

        analysis = Analysis(
            document_id=doc.id,
            raw_text="FORM GST DRC-01A. Intimation of tax ascertained under section 73(5). Amount payable: Rs 45,000. Due date: " + str(due_in_3_days),
            document_type="GST DRC-01A Notice",
            category="Tax",
            category_confidence="High",
            summary="Intimation of tax liability for input tax credit mismatch under Section 73(5) of the CGST Act.",
            deadline_text=f"Payment or reply due on {due_in_3_days.strftime('%d-%m-%Y')}",
            deadline_date=due_in_3_days,
            penalty_info="10% penalty plus 18% per annum interest under Section 50.",
            penalty_amount="₹45,000",
            risk_level="HIGH",
            urgency="HIGH"
        )
        analysis.requirements = ["File reply in Form DRC-01A Part B", "Or pay tax liability through DRC-03"]
        analysis.actions = [
            "Reconcile GSTR-2B with purchase register for the disputed tax period.",
            "Discharge liability via cash ledger or submit rebuttal explanation before the due date."
        ]
        db.session.add(analysis)
        db.session.flush()

        item = ComplianceItem(
            analysis_id=analysis.id,
            user_id=user_id,
            title="GST DRC-01A Tax Liability Intimation",
            description=analysis.summary,
            deadline_date=due_in_3_days,
            status="active",
            category="Tax",
            risk_level="HIGH"
        )
        db.session.add(item)
        db.session.flush()

        dl = Deadline(
            compliance_item_id=item.id,
            user_id=user_id,
            due_date=due_in_3_days
        )
        db.session.add(dl)

        # Also create an Overdue document to verify Overdue notifications
        past_due = today - timedelta(days=2)
        overdue_doc = Document(
            user_id=user_id,
            filename="epf_inspection_order.pdf",
            original_filename="EPF_Section_7A_Summons.pdf",
            file_path="uploads/epf_inspection_order.pdf",
            file_type="pdf",
            due_date=past_due,
            category="Labour",
            status="overdue",
            processing_stage="Analysis complete",
            risk_level="URGENT"
        )
        db.session.add(overdue_doc)
        db.session.flush()

        overdue_item = ComplianceItem(
            analysis_id=analysis.id,
            user_id=user_id,
            title="EPFO Section 7A Inquest Hearing",
            description="Summons to produce wage registers for financial year 2024-25.",
            deadline_date=past_due,
            status="overdue",
            category="Labour",
            risk_level="URGENT"
        )
        db.session.add(overdue_item)
        db.session.flush()

        overdue_dl = Deadline(
            compliance_item_id=overdue_item.id,
            user_id=user_id,
            due_date=past_due
        )
        db.session.add(overdue_dl)
        db.session.commit()
        doc_id = doc.id
        item_id = item.id

    from backend.services.scheduler import scan_deadlines_and_notify
    scan_deadlines_and_notify(app)

    print(f"  PASS: Seeded compliance test records. Document ID: {doc_id}")

    # 8. Notifications & Scheduler scan
    print("\n[TEST 8] GET /api/notifications & Scheduler Scan")
    res = client.get("/api/notifications", headers=headers)
    assert res.status_code == 200
    notif_data = res.get_json()
    assert "notifications" in notif_data
    assert "unread_count" in notif_data
    assert notif_data["unread_count"] > 0
    print(f"  PASS: Notifications retrieved. Count: {notif_data['unread_count']}")
    first_notif_id = notif_data["notifications"][0]["id"]

    # 9. Mark notification as read (PATCH /api/notifications/:id)
    print(f"\n[TEST 9] PATCH /api/notifications/{first_notif_id} (Mark as read)")
    res = client.patch(f"/api/notifications/{first_notif_id}", headers=headers)
    assert res.status_code == 200
    print(f"  PASS: Notification marked as read: {res.get_json()}")

    # 10. Report with 4-language translation (en, ta, ml, te)
    print("\n[TEST 10] GET /api/report/:id with Multilingual Google Translate (en, ta, ml, te)")
    for lang in ["en", "ta", "ml", "te"]:
        res = client.get(f"/api/report/{doc_id}?lang={lang}", headers=headers)
        assert res.status_code == 200, f"Failed for {lang}: {res.get_data(as_text=True)}"
        r_data = res.get_json()
        assert r_data["active_language"] == lang
        assert "translated_content" in r_data
        assert "summary" in r_data["translated_content"]
        assert "actions" in r_data["translated_content"]
        assert "error" in r_data["translated_content"]
        # Original remains untouched
        assert r_data["original_analysis"]["summary"].startswith("Intimation of tax liability")
        if lang != "en" and not r_data["translated_content"]["error"]:
            assert r_data["translated_content"]["summary"] != r_data["original_analysis"]["summary"], (
                f"Expected a translated summary for {lang}, but received the original English text."
            )
        status = "translation available" if not r_data["translated_content"]["error"] else "fallback warning returned"
        print(f"  PASS [{lang} - {r_data['language_name']}]: report valid; {status}.")

    # 11. Complete Deadline Obligation (POST /api/deadlines/:id/complete)
    print(f"\n[TEST 11] POST /api/deadlines/{item_id}/complete")
    res = client.post(f"/api/deadlines/{item_id}/complete", headers=headers)
    assert res.status_code == 200
    print(f"  PASS: Obligation marked completed: {res.get_json()}")

    # 12. Profile Language Preference Update (PATCH /api/profile)
    print("\n[TEST 12] PATCH /api/profile (Change Preferred Language)")
    res = client.patch("/api/profile", json={"preferred_language": "ml"}, headers=headers)
    assert res.status_code == 200
    user_updated = res.get_json()["user"]
    assert user_updated["preferred_language"] == "ml"
    print(f"  PASS: Profile updated preferred language to Malayalam ('ml').")

    print("\n" + "="*60)
    print("ALL 12 BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("="*60 + "\n")

if __name__ == "__main__":
    run_tests()
