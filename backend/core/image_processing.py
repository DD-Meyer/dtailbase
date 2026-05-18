from __future__ import annotations

from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageOps


def resize_image_to_plan_limit(uploaded_file, max_width: int, max_height: int):
    """Return an image file resized to fit plan limits while preserving aspect ratio."""
    uploaded_file.seek(0)
    image = Image.open(uploaded_file)
    image = ImageOps.exif_transpose(image)

    # Keep original image when it already fits limits.
    if image.width <= max_width and image.height <= max_height:
        uploaded_file.seek(0)
        return uploaded_file

    image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

    original_name = getattr(uploaded_file, "name", "upload.jpg")
    stem = Path(original_name).stem or "upload"

    output = BytesIO()
    original_format = (image.format or "").upper()

    save_kwargs = {"optimize": True}
    if original_format in {"JPEG", "JPG"}:
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        image.save(output, format="JPEG", quality=88, **save_kwargs)
        ext = ".jpg"
    elif original_format == "WEBP":
        image.save(output, format="WEBP", quality=85, **save_kwargs)
        ext = ".webp"
    else:
        if image.mode not in ("RGB", "RGBA", "L"):
            image = image.convert("RGB")
        image.save(output, format="PNG", **save_kwargs)
        ext = ".png"

    return ContentFile(output.getvalue(), name=f"{stem}{ext}")
