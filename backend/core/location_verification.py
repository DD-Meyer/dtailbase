import re
from difflib import SequenceMatcher


def _normalize_text(value):
    if not value:
        return ""
    lowered = value.lower()
    return re.sub(r"[^a-z0-9]+", " ", lowered).strip()


def _extract_text_from_pdf(uploaded_file):
    try:
        from pypdf import PdfReader
    except Exception:
        return "", "PDF parser unavailable on server"

    try:
        uploaded_file.seek(0)
        reader = PdfReader(uploaded_file)
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        return "\n".join(pages), ""
    except Exception as exc:
        return "", f"Failed to parse PDF: {exc}"


def extract_document_text(uploaded_file):
    name = (uploaded_file.name or "").lower()

    if name.endswith(".txt"):
        try:
            uploaded_file.seek(0)
            return uploaded_file.read().decode("utf-8", errors="ignore"), ""
        except Exception as exc:
            return "", f"Failed to parse text file: {exc}"

    if name.endswith(".pdf"):
        return _extract_text_from_pdf(uploaded_file)

    # Fallback for simple text-like formats.
    try:
        uploaded_file.seek(0)
        return uploaded_file.read().decode("utf-8", errors="ignore"), ""
    except Exception as exc:
        return "", f"Unsupported document format: {exc}"


def _clean_company_tokens(company_name):
    stop_words = {"pty", "ltd", "limited", "inc", "llc", "co", "group", "company"}
    tokens = [token for token in _normalize_text(company_name).split() if len(token) > 2 and token not in stop_words]
    return tokens


def _clean_address_tokens(address_value):
    stop_words = {
        "street", "st", "road", "rd", "avenue", "ave", "drive", "dr",
        "suite", "unit", "floor", "building", "box", "po", "postal",
        "the", "and", "of",
    }
    normalized = _normalize_text(address_value)
    return [token for token in normalized.split() if len(token) > 2 and token not in stop_words]


COUNTRY_ALIASES = {
    "ZA": ["south africa", "za"],
    "US": ["united states", "usa", "us", "america"],
    "GB": ["united kingdom", "uk", "great britain", "england", "scotland", "wales", "northern ireland", "gb"],
}


def _contains_alias(normalized_doc, alias):
    if len(alias) <= 3:
        return re.search(rf"\b{re.escape(alias)}\b", normalized_doc) is not None
    return alias in normalized_doc


def _evaluate_company_match(company_name, normalized_doc):
    normalized_company = _normalize_text(company_name)

    if not normalized_doc or not normalized_company:
        return {
            "verified": False,
            "score": 0.0,
            "reason": "No readable content found in document",
        }

    if normalized_company in normalized_doc:
        return {
            "verified": True,
            "score": 1.0,
            "reason": "Exact company name match found",
        }

    company_tokens = _clean_company_tokens(company_name)
    if not company_tokens:
        return {
            "verified": False,
            "score": 0.0,
            "reason": "Company name is too short for reliable verification",
        }

    doc_words = set(normalized_doc.split())
    token_hits = sum(1 for token in company_tokens if token in doc_words)
    token_score = token_hits / len(company_tokens)

    similarity_score = SequenceMatcher(None, normalized_company, normalized_doc[: max(3000, len(normalized_company) * 20)]).ratio()
    final_score = max(token_score, similarity_score)
    verified = token_score >= 0.6 or (token_hits >= 2 and similarity_score >= 0.4)

    if verified:
        reason = f"Matched {token_hits}/{len(company_tokens)} company name tokens"
    else:
        reason = f"Insufficient company name match ({token_hits}/{len(company_tokens)} tokens)"

    return {
        "verified": verified,
        "score": round(final_score, 4),
        "reason": reason,
    }


def _evaluate_country_match(requested_country_code, normalized_doc):
    normalized_country_code = (requested_country_code or "").upper().strip()
    aliases = COUNTRY_ALIASES.get(normalized_country_code, [normalized_country_code.lower()])

    matched_alias = ""
    for alias in aliases:
        normalized_alias = _normalize_text(alias)
        if normalized_alias and _contains_alias(normalized_doc, normalized_alias):
            matched_alias = normalized_alias
            break

    if matched_alias:
        return {
            "verified": True,
            "score": 1.0,
            "reason": f"Country evidence found: {matched_alias}",
        }

    return {
        "verified": False,
        "score": 0.0,
        "reason": f"Document does not clearly mention the selected country ({normalized_country_code})",
    }


def _evaluate_address_match(business_address, normalized_doc):
    if not (business_address or "").strip():
        return {
            "verified": False,
            "score": 0.0,
            "reason": "No business address configured — set your business address before verifying",
            "required": True,
        }

    address_tokens = _clean_address_tokens(business_address)
    if not address_tokens:
        return {
            "verified": False,
            "score": 0.0,
            "reason": "Business address is too short for reliable verification",
            "required": True,
        }

    doc_words = set(normalized_doc.split())
    hits = sum(1 for token in address_tokens if token in doc_words)
    ratio = hits / len(address_tokens)

    if len(address_tokens) == 1:
        verified = hits == 1
    else:
        verified = hits >= 2 and ratio >= 0.4

    if verified:
        reason = f"Address evidence matched {hits}/{len(address_tokens)} tokens"
    else:
        reason = f"Address evidence too weak ({hits}/{len(address_tokens)} tokens matched)"

    return {
        "verified": verified,
        "score": round(ratio, 4),
        "reason": reason,
        "required": True,
    }


def verify_location_document(company_name, document_text, requested_country_code, business_address=""):
    normalized_doc = _normalize_text(document_text)

    company_check = _evaluate_company_match(company_name, normalized_doc)
    country_check = _evaluate_country_match(requested_country_code, normalized_doc)
    address_check = _evaluate_address_match(business_address, normalized_doc)

    checks = [company_check, country_check, address_check]

    final_verified = all(check["verified"] for check in checks)
    final_score = sum(check["score"] for check in checks) / len(checks) if checks else 0.0

    reasons = [company_check["reason"], country_check["reason"], address_check["reason"]]

    return {
        "verified": final_verified,
        "score": round(final_score, 4),
        "reason": " | ".join(reasons),
        "checks": {
            "company": company_check,
            "country": country_check,
            "address": address_check,
        },
    }


def match_company_name_in_text(company_name, document_text):
    # Backward-compatible helper retained for older call sites.
    return _evaluate_company_match(company_name, _normalize_text(document_text))
