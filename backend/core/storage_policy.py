from rest_framework.exceptions import ValidationError
from django.conf import settings

from core.plan_limits import PLAN_CONFIG


STORAGE_POLICY_LOCAL_ENFORCED = "LOCAL_ENFORCED"
STORAGE_POLICY_CLOUDFLARE_METERED = "CLOUDFLARE_METERED"
STORAGE_POLICY_DISABLED = "DISABLED"

VALID_STORAGE_POLICY_MODES = {
    STORAGE_POLICY_LOCAL_ENFORCED,
    STORAGE_POLICY_CLOUDFLARE_METERED,
    STORAGE_POLICY_DISABLED,
}


def get_storage_policy_mode():
    configured_mode = str(getattr(settings, "STORAGE_POLICY_MODE", STORAGE_POLICY_LOCAL_ENFORCED) or "").strip().upper()
    if configured_mode in VALID_STORAGE_POLICY_MODES:
        return configured_mode
    return STORAGE_POLICY_LOCAL_ENFORCED


def _safe_file_size(file_field):
    if not file_field or not getattr(file_field, "name", None):
        return 0
    try:
        return int(file_field.storage.size(file_field.name) or 0)
    except Exception:
        return 0


def _format_gb(byte_count):
    return f"{(byte_count / (1024 ** 3)):.2f} GB"


def get_company_storage_usage_bytes(company):
    from core.models import VehiclePhoto
    from indemnity.models import IndemnityAgreement, IndemnityTemplate

    total_bytes = 0
    seen_files = set()

    def add_file(file_field):
        nonlocal total_bytes
        file_name = getattr(file_field, "name", None)
        if not file_name or file_name in seen_files:
            return
        file_size = _safe_file_size(file_field)
        if file_size > 0:
            total_bytes += file_size
            seen_files.add(file_name)

    # Company-level documents
    add_file(company.logo)
    add_file(company.location_verification_document)

    # Indemnity templates and signed agreement artifacts
    for template in IndemnityTemplate.objects.filter(company=company).only("template_pdf").iterator():
        add_file(template.template_pdf)

    for agreement in IndemnityAgreement.objects.filter(company=company).only("signature_image", "pdf_file").iterator():
        add_file(agreement.signature_image)
        add_file(agreement.pdf_file)

    # Before/after inspection photos
    for photo in VehiclePhoto.objects.filter(agreement__company=company).only("image").iterator():
        add_file(photo.image)

    return total_bytes


def get_company_storage_limit_bytes(company):
    plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG["STARTER"])
    storage_limit_gb = plan_limits.get("storage_limit_gb")

    if storage_limit_gb in (None, float("inf")):
        return None

    try:
        return int(float(storage_limit_gb) * (1024 ** 3))
    except (TypeError, ValueError):
        return None


def enforce_company_storage_limit(company, incoming_bytes=0, replacing_file_fields=None):
    mode = get_storage_policy_mode()
    if mode in {STORAGE_POLICY_DISABLED, STORAGE_POLICY_CLOUDFLARE_METERED}:
        return

    limit_bytes = get_company_storage_limit_bytes(company)
    if limit_bytes is None:
        return

    incoming_bytes = max(0, int(incoming_bytes or 0))
    replacing_file_fields = replacing_file_fields or []

    used_bytes = get_company_storage_usage_bytes(company)
    replaced_bytes = sum(_safe_file_size(file_field) for file_field in replacing_file_fields)
    projected_usage = max(0, used_bytes - replaced_bytes) + incoming_bytes

    if projected_usage > limit_bytes:
        raise ValidationError(
            {
                "storage_limit": (
                    f"Storage limit reached for {company.plan}. "
                    f"Plan capacity: {_format_gb(limit_bytes)}. "
                    f"Current usage: {_format_gb(used_bytes)}. "
                    f"Please remove old files or contact support for expanded storage."
                )
            }
        )
