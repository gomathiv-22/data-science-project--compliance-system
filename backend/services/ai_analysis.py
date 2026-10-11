"""
backend/services/ai_analysis.py
Google Gemini API integration for compliance document analysis ONLY.
(Translation is handled strictly by the separate Google Cloud Translate service).

Flow:
  extracted_text → Gemini 1.5/2.5 Flash → structured JSON response
"""

import os
import json
import logging
import re
from datetime import datetime

logger = logging.getLogger(__name__)

# Supported document categories
CATEGORIES = {
    "Tax": ["gst", "goods and services tax", "income tax", "tds", "tax deducted", "vat", "service tax", "it act", "form 16", "itr"],
    "Labour": ["labour", "labor", "employee", "wages", "epf", "esic", "provident fund", "factories act", "shop", "establishment", "minimum wages", "gratuity", "bonus"],
    "Environmental": ["environment", "pollution", "cpcb", "spcb", "emission", "effluent", "hazardous waste", "consent to operate", "air act", "water act"],
    "Legal Notice": ["legal notice", "court", "litigation", "arbitration", "demand notice", "show cause", "summons"],
    "Other Compliance": [],
}

ANALYSIS_PROMPT_TEMPLATE = """
You are a compliance analysis expert specializing in Indian regulatory requirements for MSMEs (Micro, Small, and Medium Enterprises).

Analyze the following compliance document text and extract all important information. Return ONLY a valid JSON object with no additional text, markdown, or explanation.

DOCUMENT TEXT:
---
{document_text}
---

Return this exact JSON structure (fill in all fields based on the document, never invent data not present):

{{
  "document_type": "Brief document type description (e.g., GST Notice, EPF Inspection Notice, SPCB Consent to Operate, Annual Return Reminder)",
  "category": "ONE of: Tax | Labour | Environmental | Legal Notice | Other Compliance",
  "category_confidence": "High | Medium | Low",
  "summary": "A clear, simple explanation of what this document is about in 3-5 sentences. Write as if explaining to a non-expert business owner. Do NOT use legal jargon.",
  "requirements": [
    "Key legal requirement 1",
    "Key legal requirement 2"
  ],
  "actions": [
    "Specific action the business owner must take 1",
    "Specific action the business owner must take 2"
  ],
  "deadline_text": "The deadline as stated in the document, or 'No deadline clearly identified in the document' if absent",
  "deadline_date": "YYYY-MM-DD format if a specific date is found, otherwise null",
  "penalty_info": "Description of penalty or consequence mentioned in document, or 'No specific penalty information identified in the document'",
  "penalty_amount": "Specific rupee amount if clearly stated (e.g., '₹10,000'), otherwise null",
  "risk_level": "HIGH | MEDIUM | LOW based on urgency, deadline proximity, and penalty severity",
  "urgency": "URGENT | HIGH | MEDIUM | LOW",
  "key_identifiers": {{
    "notice_number": "Notice/case number if present, else null",
    "authority": "Issuing government authority if present, else null",
    "section_references": ["Section numbers or acts referenced, if any"]
  }}
}}

IMPORTANT RULES:
- Category MUST be exactly one of: Tax, Labour, Environmental, Legal Notice, Other Compliance.
- NEVER invent or fabricate deadline dates, penalty amounts, or requirements not found in the document.
- Keep dates strictly in YYYY-MM-DD format if found.
- If no deadline found, set deadline_date to null.
- If no penalty found, set penalty_amount to null.
- Actions must be specific and actionable for an Indian MSME business owner.
- Summary must be in simple English, easy for a non-lawyer to understand.
- Return ONLY valid JSON, nothing else.
"""


def analyze_document(extracted_text: str, api_key: str = None) -> dict:
    """
    Send extracted text to Gemini API for compliance analysis.

    Returns:
        dict with analysis fields, or error dict if API is unavailable.
    """
    api_key = api_key or os.getenv("GEMINI_API_KEY", "")

    if not api_key or api_key == "your-gemini-api-key-here":
        logger.warning("GEMINI_API_KEY not configured")
        return _local_document_analysis(extracted_text)

    if not extracted_text or len(extracted_text.strip()) < 20:
        return _insufficient_text_response()

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        model_names = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-pro"]
        model = None
        last_err = None
        for m_name in model_names:
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    generation_config={
                        "temperature": 0.1,
                        "top_p": 0.95,
                        "max_output_tokens": 2048,
                    }
                )
                break
            except Exception as e:
                last_err = e
                continue

        if not model:
            raise RuntimeError(f"Could not initialize Gemini model: {last_err}")

        prompt = ANALYSIS_PROMPT_TEMPLATE.format(
            document_text=extracted_text[:12000]
        )

        response = model.generate_content(prompt)
        raw_text = response.text.strip()

        # Strip markdown code fences if present
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
        raw_text = re.sub(r"\s*```$", "", raw_text, flags=re.MULTILINE)
        raw_text = raw_text.strip()

        result = json.loads(raw_text)
        logger.info(f"Gemini analysis successful. Category: {result.get('category', 'Unknown')}")
        return _validate_and_clean(result)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON response: {e}")
        return _local_document_analysis(extracted_text)
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return _local_document_analysis(extracted_text)


def _validate_and_clean(result: dict) -> dict:
    """Ensure required fields exist and are properly typed."""
    defaults = {
        "document_type": "Compliance Notice",
        "category": "Other Compliance",
        "category_confidence": "Medium",
        "summary": "Compliance document analysis completed.",
        "requirements": [],
        "actions": [],
        "deadline_text": "No deadline clearly identified in the document.",
        "deadline_date": None,
        "penalty_info": "No specific penalty information identified in the document.",
        "penalty_amount": None,
        "risk_level": "MEDIUM",
        "urgency": "MEDIUM",
        "key_identifiers": {"notice_number": None, "authority": None, "section_references": []},
    }

    for key, default_val in defaults.items():
        if key not in result or result[key] is None:
            result[key] = default_val
        elif key in ("requirements", "actions") and not isinstance(result[key], list):
            result[key] = [str(result[key])]

    # Normalize category
    raw_cat = str(result.get("category", "")).strip()
    valid_categories = ["Tax", "Labour", "Environmental", "Legal Notice", "Other Compliance"]
    if raw_cat not in valid_categories:
        # Match against keywords
        matched = "Other Compliance"
        for cat, kw_list in CATEGORIES.items():
            if any(k in raw_cat.lower() for k in kw_list):
                matched = cat
                break
        result["category"] = matched

    # Parse deadline_date into a Python date if it's a string
    if isinstance(result.get("deadline_date"), str):
        try:
            result["deadline_date"] = datetime.strptime(result["deadline_date"], "%Y-%m-%d").date()
        except ValueError:
            result["deadline_date"] = None

    risk = str(result.get("risk_level", "MEDIUM")).upper()
    result["risk_level"] = risk if risk in ("HIGH", "MEDIUM", "LOW", "URGENT") else "MEDIUM"

    result["error"] = None
    return result


def _local_document_analysis(extracted_text: str) -> dict:
    """Create a useful report from extracted document text when AI is unavailable."""
    text = " ".join((extracted_text or "").split())
    if len(text) < 20:
        return _insufficient_text_response()

    lines = [line.strip(" -•\t") for line in (extracted_text or "").splitlines() if line.strip()]
    first_line = lines[0] if lines else text[:100]
    document_type = first_line[:100]
    lowered = text.lower()
    category = "Other Compliance"
    for candidate, keywords in CATEGORIES.items():
        if any(keyword in lowered for keyword in keywords):
            category = candidate
            break

    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]
    summary_parts = sentences[:3] or [text[:500]]
    summary = " ".join(summary_parts)[:1000]

    requirement_keywords = ("must", "shall", "required", "need to", "obligation", "comply")
    action_keywords = ("submit", "file", "pay", "renew", "upload", "respond", "maintain", "obtain", "verify")
    requirements = [
        line[:300] for line in lines
        if any(keyword in line.lower() for keyword in requirement_keywords)
    ][:5]
    actions = [
        line[:300] for line in lines
        if any(keyword in line.lower() for keyword in action_keywords)
    ][:5]
    if not actions:
        actions = ["Review the extracted document content and complete any obligations stated in the notice."]

    return _validate_and_clean({
        "document_type": document_type or "Compliance Document",
        "category": category,
        "category_confidence": "Medium" if category != "Other Compliance" else "Low",
        "summary": summary,
        "requirements": requirements,
        "actions": actions,
        "deadline_text": "No deadline clearly identified in the document.",
        "deadline_date": None,
        "penalty_info": "No specific penalty information identified in the document.",
        "penalty_amount": None,
        "risk_level": "MEDIUM",
        "urgency": "MEDIUM",
        "key_identifiers": {"notice_number": None, "authority": None, "section_references": []},
    })


def _api_not_configured_response(extracted_text: str = "") -> dict:
    if extracted_text:
        return _local_document_analysis(extracted_text)
    return {
        "document_type": "Compliance Document",
        "category": "Other Compliance",
        "category_confidence": "Low",
        "summary": "Document received. To enable automated AI compliance analysis, configure GEMINI_API_KEY in backend/.env.",
        "requirements": ["Review statutory notice against applicable MSME guidelines."],
        "actions": ["Verify filing obligations with compliance officer or CA."],
        "deadline_text": "No deadline clearly identified in the document.",
        "deadline_date": None,
        "penalty_info": "Statutory interest or penalties may apply for delayed response.",
        "penalty_amount": None,
        "risk_level": "MEDIUM",
        "urgency": "MEDIUM",
        "key_identifiers": {"notice_number": None, "authority": None, "section_references": []},
        "error": "GEMINI_API_KEY is not configured.",
    }


def _insufficient_text_response() -> dict:
    return {
        "document_type": "Unknown",
        "category": "Other Compliance",
        "category_confidence": "Low",
        "summary": "The uploaded file could not be read clearly. The extracted text is too short for compliance analysis.",
        "requirements": [],
        "actions": ["Please upload a clearer digital scan or native PDF."],
        "deadline_text": "No deadline identified.",
        "deadline_date": None,
        "penalty_info": "",
        "penalty_amount": None,
        "risk_level": "LOW",
        "urgency": "LOW",
        "key_identifiers": {"notice_number": None, "authority": None, "section_references": []},
        "error": "Extracted text is too short for analysis.",
    }


def _parse_error_response(extracted_text: str = "") -> dict:
    resp = _api_not_configured_response(extracted_text)
    resp["error"] = "AI returned an unexpected response format. Please try again."
    return resp


def _api_error_response(msg: str, extracted_text: str = "") -> dict:
    resp = _api_not_configured_response(extracted_text)
    if "quota" in msg.lower() or "rate" in msg.lower():
        resp["error"] = "AI service quota reached. Please try again in a few minutes."
    elif "key" in msg.lower() or "auth" in msg.lower() or "api" in msg.lower():
        resp["error"] = "AI service authentication error. Please verify GEMINI_API_KEY."
    else:
        resp["error"] = f"AI analysis error: {msg}"
    return resp
