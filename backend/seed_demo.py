"""
backend/seed_demo.py
Pre-seeds a complete demo user with realistic Indian MSME notices:
1. GST Notice (DRC-01A) - Due in 3 days (High Risk)
2. EPFO Summons (Section 7A) - Overdue by 2 days (Urgent)
3. SPCB CTO Environmental Renewal - Due in 25 days (Medium Risk)
"""

import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure root in path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app import create_app
from backend.services.database import db, User, Document, Analysis, ComplianceItem, Deadline, Notification
from backend.services.scheduler import scan_deadlines_and_notify

def seed_demo_user():
    app = create_app()
    with app.app_context():
        demo_email = "demo@msmecompliance.in"
        user = User.query.filter_by(email=demo_email).first()
        if not user:
            user = User(
                full_name="Ramesh Kumar",
                business_name="Kaveri Precision Engineering Pvt Ltd",
                email=demo_email,
                phone="9840123456",
                preferred_language="en"
            )
            user.set_password("Password@123")
            db.session.add(user)
            db.session.commit()
            print(f"Created demo user: {demo_email}")
        else:
            user.set_password("Password@123")
            db.session.commit()
            print(f"Updated password for demo user: {demo_email}")

        # Clear existing demo records to prevent duplicates
        Document.query.filter_by(user_id=user.id).delete()
        ComplianceItem.query.filter_by(user_id=user.id).delete()
        Deadline.query.filter_by(user_id=user.id).delete()
        Notification.query.filter_by(user_id=user.id).delete()
        db.session.commit()

        today = datetime.now(timezone.utc).date()

        # 1. Document 1: GST Notice (Due in 3 days)
        d1_due = today + timedelta(days=3)
        doc1 = Document(
            user_id=user.id,
            filename="gst_drc01a_input_tax.pdf",
            original_filename="GST_DRC-01A_Intimation_2025-26.pdf",
            file_path="uploads/gst_drc01a_input_tax.pdf",
            file_type="pdf",
            due_date=d1_due,
            category="Tax",
            status="done",
            processing_stage="Analysis complete",
            risk_level="HIGH"
        )
        db.session.add(doc1)
        db.session.flush()

        a1 = Analysis(
            document_id=doc1.id,
            raw_text="GOVERNMENT OF INDIA. CENTRAL BOARD OF INDIRECT TAXES AND CUSTOMS. FORM GST DRC-01A. Reference No: ZD3309250012891. Tax mismatch under Section 73(5) of CGST Act. Tax: Rs 42,500. Interest: Rs 6,800. Total demand: Rs 49,300.",
            document_type="GST DRC-01A Tax Intimation",
            category="Tax",
            category_confidence="High",
            summary="Intimation of tax ascertained as being payable through Form GST DRC-01A due to input tax credit discrepancy between GSTR-2B and GSTR-3B filings.",
            deadline_text=f"Reply or deposit required by {d1_due.strftime('%d %B %Y')}",
            deadline_date=d1_due,
            penalty_info="Penalty of 10% under Section 73(9) plus 18% per annum interest under Section 50 upon non-response.",
            penalty_amount="₹49,300",
            risk_level="HIGH",
            urgency="HIGH"
        )
        a1.requirements = [
            "Furnish formal reply in Part B of Form GST DRC-01A",
            "Or discharge the liability via Form GST DRC-03"
        ]
        a1.actions = [
            "Reconcile invoices from supplier M/s Lakshmi Castings with GSTR-2B statement.",
            "Submit invoice copies and e-way bills to the Proper Officer or pay Rs 49,300 before deadline."
        ]
        db.session.add(a1)
        db.session.flush()

        item1 = ComplianceItem(
            analysis_id=a1.id,
            user_id=user.id,
            title="GST DRC-01A Input Tax Credit Dispute",
            description=a1.summary,
            deadline_date=d1_due,
            status="active",
            category="Tax",
            risk_level="HIGH"
        )
        db.session.add(item1)
        db.session.flush()

        dl1 = Deadline(
            compliance_item_id=item1.id,
            user_id=user.id,
            due_date=d1_due
        )
        db.session.add(dl1)

        # 2. Document 2: EPFO Notice (Overdue by 2 days)
        d2_due = today - timedelta(days=2)
        doc2 = Document(
            user_id=user.id,
            filename="epfo_inspection_summons.pdf",
            original_filename="EPFO_Section_7A_Inspection_Order.pdf",
            file_path="uploads/epfo_inspection_summons.pdf",
            file_type="pdf",
            due_date=d2_due,
            category="Labour",
            status="overdue",
            processing_stage="Analysis complete",
            risk_level="URGENT"
        )
        db.session.add(doc2)
        db.session.flush()

        a2 = Analysis(
            document_id=doc2.id,
            raw_text="EMPLOYEES PROVIDENT FUND ORGANISATION. REGIONAL OFFICE COIMBATORE. Summons under Section 7A of the EPF & MP Act, 1952. Cause No: CBE/RO/7A/2025/4412.",
            document_type="EPFO 7A Summons & Inquest",
            category="Labour",
            category_confidence="High",
            summary="Statutory summons to appear before the Assistant PF Commissioner regarding wage registers and contractor worker PF contributions for 2024-25.",
            deadline_text=f"Hearing date was {d2_due.strftime('%d %B %Y')}",
            deadline_date=d2_due,
            penalty_info="Ex-parte determination of dues, damages under Section 14B up to 25%, and interest under Section 7Q.",
            penalty_amount="₹1,20,000 (Estimated)",
            risk_level="URGENT",
            urgency="URGENT"
        )
        a2.requirements = [
            "Produce wage registers, salary vouchers, and ECR payment challans",
            "Submit muster roll for contract security and housekeeping personnel"
        ]
        a2.actions = [
            "File an immediate adjournment application citing legitimate delay grounds.",
            "Collate contractor ECR contribution receipts for financial year 2024-25."
        ]
        db.session.add(a2)
        db.session.flush()

        item2 = ComplianceItem(
            analysis_id=a2.id,
            user_id=user.id,
            title="EPFO Section 7A Dues Assessment Hearing",
            description=a2.summary,
            deadline_date=d2_due,
            status="overdue",
            category="Labour",
            risk_level="URGENT"
        )
        db.session.add(item2)
        db.session.flush()

        dl2 = Deadline(
            compliance_item_id=item2.id,
            user_id=user.id,
            due_date=d2_due
        )
        db.session.add(dl2)

        # 3. Document 3: SPCB Consent to Operate Renewal (Due in 25 days)
        d3_due = today + timedelta(days=25)
        doc3 = Document(
            user_id=user.id,
            filename="spcb_cto_renewal_notice.pdf",
            original_filename="SPCB_Air_Water_CTO_Renewal.pdf",
            file_path="uploads/spcb_cto_renewal_notice.pdf",
            file_type="pdf",
            due_date=d3_due,
            category="Environmental",
            status="done",
            processing_stage="Analysis complete",
            risk_level="MEDIUM"
        )
        db.session.add(doc3)
        db.session.flush()

        a3 = Analysis(
            document_id=doc3.id,
            raw_text="STATE POLLUTION CONTROL BOARD. Consent to Operate under Section 25 of Water Act and Section 21 of Air Act. Expiry notification.",
            document_type="SPCB Consent to Operate Renewal Notice",
            category="Environmental",
            category_confidence="High",
            summary="Reminder to submit application for Renewal of Consent to Operate (CTO) for manufacturing plant under the Water Act 1974 and Air Act 1981.",
            deadline_text=f"Application deadline: {d3_due.strftime('%d %B %Y')}",
            deadline_date=d3_due,
            penalty_info="Operating industrial plant without valid consent attracts closure directions under Section 33A.",
            penalty_amount=None,
            risk_level="MEDIUM",
            urgency="MEDIUM"
        )
        a3.requirements = [
            "Submit online Form I on OCMMS portal",
            "Attach latest stack monitoring and treated effluent analysis reports"
        ]
        a3.actions = [
            "Conduct environmental monitoring sample collection with certified NABL lab.",
            "Upload audited capital investment certificates and pay renewal fees."
        ]
        db.session.add(a3)
        db.session.flush()

        item3 = ComplianceItem(
            analysis_id=a3.id,
            user_id=user.id,
            title="SPCB Consent to Operate (CTO) Renewal",
            description=a3.summary,
            deadline_date=d3_due,
            status="active",
            category="Environmental",
            risk_level="MEDIUM"
        )
        db.session.add(item3)
        db.session.flush()

        dl3 = Deadline(
            compliance_item_id=item3.id,
            user_id=user.id,
            due_date=d3_due
        )
        db.session.add(dl3)

        db.session.commit()

        # Trigger scheduler to generate notifications
        scan_deadlines_and_notify(app)
        print("DEMO USER & COMPLIANCE DATA SEEDED SUCCESSFULLY!")

if __name__ == "__main__":
    seed_demo_user()
