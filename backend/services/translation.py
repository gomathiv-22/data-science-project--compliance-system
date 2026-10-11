"""
backend/services/translation.py
Google Cloud Translate service for Indian MSME regional languages.
Strictly decoupled from Gemini — translation NEVER routes through Gemini.
"""

import os
import logging
from html import unescape
from backend.services.database import db, Document, Translation

logger = logging.getLogger(__name__)

# Official 4 supported languages strictly defined as required
SUPPORTED_LANGUAGES = {
    "en": "English",
    "ta": "Tamil",
    "ml": "Malayalam",
    "te": "Telugu",
}


def get_supported_languages() -> dict:
    """Return dictionary of supported language codes and their display names."""
    return SUPPORTED_LANGUAGES.copy()


def _translate_with_google_cloud_client(text_list: list[str], target_lang: str, api_key: str) -> list[str] | None:
    """Attempt translation using the official Google Cloud Translate API."""
    if not text_list:
        return []

    if not api_key or api_key.lower().startswith("your-"):
        logger.warning("GOOGLE_TRANSLATE_API_KEY is missing or still set to a placeholder value.")
        return None

    # 1. Try official google.cloud.translate_v2 client
    try:
        from google.cloud import translate_v2 as translate
        client = translate.Client(api_key=api_key)
        results = client.translate(text_list, target_language=target_lang)
        if isinstance(results, dict):
            results = [results]
        translated = [item.get("translatedText", "") for item in results]
        if len(translated) == len(text_list):
            return translated
    except Exception as e:
        logger.info(f"google.cloud.translate_v2 client call failed: {e}")

    # 2. Direct HTTPS fallback to Google Cloud Translate v2 API with API key
    try:
        import requests
        url = "https://translation.googleapis.com/language/translate/v2"
        payload = {"q": text_list, "target": target_lang, "format": "text"}
        resp = requests.post(url, params={"key": api_key}, json=payload, timeout=20)
        if resp.status_code == 200:
            data = resp.json()
            translations = data.get("data", {}).get("translations", [])
            translated = [t.get("translatedText", "") for t in translations]
            if len(translated) == len(text_list):
                return translated
        else:
            logger.warning(f"Google Cloud Translate API returned status {resp.status_code}: {resp.text[:300]}")
    except Exception as e:
        logger.warning(f"Google Cloud Translate HTTPS request error: {e}")

    return None


def _translate_with_google_public_endpoint(text_list: list[str], target_lang: str) -> list[str] | None:
    """Translate without credentials through Google's public, rate-limited endpoint."""
    if not text_list:
        return []

    try:
        import requests

        endpoints = (
            "https://translate.google.com/translate_a/single",
            "https://translate.googleapis.com/translate_a/single",
        )
        translated: list[str] = []
        with requests.Session() as session:
            for text in text_list:
                if not text:
                    translated.append("")
                    continue

                translated_text = None
                for endpoint in endpoints:
                    try:
                        response = session.get(
                            endpoint,
                            params={
                                "client": "gtx",
                                "sl": "en",
                                "tl": target_lang,
                                "dt": "t",
                                "q": text,
                            },
                            headers={"User-Agent": "Mozilla/5.0"},
                            timeout=20,
                        )
                        if response.status_code == 429:
                            logger.warning("Google translation endpoint %s is rate-limited (429).", endpoint)
                            return None
                        if response.status_code >= 500:
                            logger.warning(
                                "Google translation endpoint %s returned status %s.",
                                endpoint,
                                response.status_code,
                            )
                            continue

                        response.raise_for_status()
                        payload = response.json()
                        translated_text = "".join(
                            part[0] for part in (payload[0] or []) if part and part[0]
                        )
                        if not translated_text:
                            logger.warning("Google translation endpoint returned an empty translation.")
                    except Exception as e:
                        logger.warning("Google translation endpoint %s failed: %s", endpoint, e)

                    if translated_text:
                        break

                if not translated_text:
                    return None
                translated.append(translated_text)

        return translated if len(translated) == len(text_list) else None
    except Exception as e:
        logger.warning(f"Google public translation fallback failed: {e}")
        return None


def _translate_with_mymemory_endpoint(text_list: list[str], target_lang: str) -> list[str] | None:
    """Use MyMemory's free machine-translation fallback when Google's public endpoints are unavailable."""
    if not text_list:
        return []

    try:
        import requests

        translated: list[str] = []
        with requests.Session() as session:
            for text in text_list:
                if not text:
                    translated.append("")
                    continue

                response = session.get(
                    "https://api.mymemory.translated.net/get",
                    params={
                        "q": text,
                        "langpair": f"en|{target_lang}",
                        "mt": "1",
                    },
                    headers={"User-Agent": "MSME-Compliance-Assistant"},
                    timeout=20,
                )
                response.raise_for_status()
                payload = response.json()
                if payload.get("responseStatus") != 200 or payload.get("quotaFinished"):
                    logger.warning("MyMemory translation returned status %s.", payload.get("responseStatus"))
                    return None

                translated_text = unescape(
                    payload.get("responseData", {}).get("translatedText", "")
                ).strip()
                if not translated_text:
                    logger.warning("MyMemory returned an empty translation.")
                    return None
                translated.append(translated_text)

        return translated if len(translated) == len(text_list) else None
    except Exception as e:
        logger.warning("MyMemory translation fallback failed: %s", e)
        return None


def translate_report_content(
    document_id: int,
    summary: str,
    actions: list[str],
    target_lang: str,
    document_type: str = "",
) -> dict:
    """
    Translates document compliance report content to target_lang server-side at response time.
    Keeps original English data untouched and caches result per (document_id, lang).

    Args:
        document_id: ID of the document
        summary: Original English summary string
        actions: List of original English action strings
        target_lang: 'en' | 'ta' | 'ml' | 'te'

    Returns:
        dict: {
            "language_code": str,
            "language_name": str,
            "translated_summary": str,
            "translated_actions": list[str],
            "from_cache": bool,
            "error": str | None
        }
    """
    if target_lang not in SUPPORTED_LANGUAGES:
        target_lang = "en"

    lang_name = SUPPORTED_LANGUAGES[target_lang]

    # English requires no translation
    if target_lang == "en":
        return {
            "language_code": "en",
            "language_name": "English",
            "translated_document_type": document_type,
            "translated_summary": summary,
            "translated_actions": actions,
            "from_cache": False,
            "error": None,
        }

    # 1. Check database cache per (document_id, lang)
    prefix_labels = {
        "ta": "மொழிபெயர்ப்பு [தமிழ்]",
        "ml": "വിവർത്തനം [മലയാളം]",
        "te": "అనువాదం [తెలుగు]",
    }
    cached = (
        Translation.query.filter_by(document_id=document_id, language_code=target_lang)
        .order_by(Translation.created_at.desc(), Translation.id.desc())
        .first()
    )
    stale_cache_markers = (
        "GEMINI_API_KEY",
        "Document received.",
        "automated AI compliance analysis",
    )
    is_placeholder_cache = cached and (
        cached.translated_summary.startswith(prefix_labels.get(target_lang, "__missing__"))
        or any(marker in cached.translated_summary for marker in stale_cache_markers)
        or any(
            action.startswith(prefix_labels.get(target_lang, "__missing__"))
            for action in cached.translated_actions
        )
        or any(
            marker in action
            for action in cached.translated_actions
            for marker in stale_cache_markers
        )
        or (
            cached.translated_summary.strip() == summary.strip()
            and cached.translated_actions == actions
        )
    )
    if cached and cached.translated_summary and not is_placeholder_cache:
        logger.info(f"Serving cached translation for doc {document_id} in {target_lang}")
        translated_type = _translate_with_google_public_endpoint([document_type], target_lang) or [document_type]
        return {
            "language_code": target_lang,
            "language_name": lang_name,
            "translated_document_type": translated_type[0],
            "translated_summary": cached.translated_summary,
            "translated_actions": cached.translated_actions,
            "from_cache": True,
            "error": None,
        }

    # 2. Use the Cloud API when configured; otherwise use Google's public endpoint.
    api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY", "").strip()
    texts_to_translate = [summary] + list(actions)

    translated_texts = None
    translation_error = None
    if api_key and api_key != "your-google-translate-api-key-here":
        translated_texts = _translate_with_google_cloud_client(
            [document_type] + texts_to_translate, target_lang, api_key
        )

    if not translated_texts:
        translated_texts = _translate_with_google_public_endpoint(
            [document_type] + texts_to_translate, target_lang
        )

    if not translated_texts:
        translated_texts = _translate_with_mymemory_endpoint(
            [document_type] + texts_to_translate, target_lang
        )

    if translated_texts and len(translated_texts) == len(texts_to_translate) + 1:
        translated_document_type = translated_texts[0]
        translated_summary = translated_texts[1]
        translated_actions = translated_texts[2:]
    elif not translated_texts:
        logger.warning(
            "Google and MyMemory translation unavailable for %s. Returning original English text for document %s.",
            target_lang,
            document_id,
        )
        translated_document_type = document_type
        translated_summary = summary
        translated_actions = actions
        translation_error = (
            "Google Translate and the free no-key fallback are temporarily unavailable or rate-limited. "
            "Please try again shortly."
        )
    else:
        translated_document_type = document_type
        translated_summary = summary
        translated_actions = actions
        translation_error = "Google returned an incomplete translation. Please try again."

    if translated_texts and len(translated_texts) == len(texts_to_translate) + 1:
        # Cache only successful translations so a temporary rate limit never
        # causes English fallback text to be served on later requests.
        try:
            translation = cached or Translation(
                document_id=document_id,
                language_code=target_lang,
            )
            translation.language_name = lang_name
            translation.translated_summary = translated_summary
            translation.translated_actions = translated_actions
            db.session.add(translation)
            db.session.commit()
        except Exception as e:
            logger.warning(f"Could not save translation cache: {e}")
            db.session.rollback()
    else:
        translation_error = translation_error or "Translation could not be completed."

    return {
        "language_code": target_lang,
        "language_name": lang_name,
        "translated_document_type": translated_document_type,
        "translated_summary": translated_summary,
        "translated_actions": translated_actions,
        "from_cache": False,
        "error": translation_error,
    }
