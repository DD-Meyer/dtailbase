import hashlib
from html import escape
from pathlib import Path
from rest_framework import serializers
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import *
from core.models import *
from drf_extra_fields.fields import Base64ImageField
from core.plan_limits import PLAN_CONFIG
from core.image_processing import resize_image_to_plan_limit
from core.storage_policy import enforce_company_storage_limit
from geopy.geocoders import Nominatim
from pypdf import PdfReader
# indemnity/serializers.py
from .utils import generate_agreement_pdf


def extract_pdf_text(uploaded_pdf):
    uploaded_pdf.seek(0)
    pdf = PdfReader(uploaded_pdf)
    pages = []
    for page in pdf.pages:
        text = page.extract_text() or ""
        if text.strip():
            pages.append(text)

    return "\n".join(pages).strip()


def text_to_html(text):
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return ""

    paragraphs = []
    current_block = []
    for line in lines:
        if len(line) <= 90 and not current_block:
            current_block.append(line)
        elif len(line) <= 90 and current_block:
            paragraphs.append(" ".join(current_block))
            current_block = [line]
        else:
            current_block.append(line)

    if current_block:
        paragraphs.append(" ".join(current_block))

    return "".join(f"<p>{escape(paragraph)}</p>" for paragraph in paragraphs)


def derive_title_from_pdf(uploaded_pdf):
    filename = Path(getattr(uploaded_pdf, "name", "")).stem.replace("_", " ").replace("-", " ").strip()
    return filename.title() if filename else "Indemnity Template"

class VehiclePhotoSerializer(serializers.ModelSerializer):
    # Keep as standard ImageField so it works for both internal saves and GETs
    image = serializers.ImageField()

    class Meta:
        model = VehiclePhoto
        fields = ['id', 'image', 'photo_type', 'created_at']

class IndemnityTemplateSerializer(serializers.ModelSerializer):
    can_edit = serializers.SerializerMethodField()
    template_pdf = serializers.FileField(required=False, allow_null=True)
    title = serializers.CharField(required=False, allow_blank=True)
    body_html = serializers.CharField(required=False, allow_blank=True)
    version = serializers.IntegerField(required=False)

    class Meta:
        model = IndemnityTemplate
        fields = ["id", "title", "body_html", "version", "is_active", "template_pdf", "created_at", "can_edit"]
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if not request: return True
        
        company = request.user.company
        plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
        
        # If history limit is 0, they can't edit existing records
        return plan_limits.get('indemnity_history_limit', 0) != 0

    def validate_template_pdf(self, value):
        if not value:
            return value

        request = self.context.get('request')
        company = getattr(getattr(request, 'user', None), 'company', None)
        if company and company.plan == 'STARTER':
            raise serializers.ValidationError(
                "PDF template uploads are available on Pro and Enterprise plans only."
            )

        filename = getattr(value, 'name', '') or ''
        if not filename.lower().endswith('.pdf'):
            raise serializers.ValidationError("Please upload a PDF file.")

        incoming_size = int(getattr(value, 'size', 0) or 0)
        replacing = [self.instance.template_pdf] if getattr(self, 'instance', None) and self.instance.template_pdf else []
        enforce_company_storage_limit(company, incoming_bytes=incoming_size, replacing_file_fields=replacing)

        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        uploaded_pdf = attrs.get("template_pdf")
        body_html = (attrs.get("body_html") or "").strip()
        title = (attrs.get("title") or "").strip()
        company = getattr(getattr(self.context.get("request"), "user", None), "company", None)

        if uploaded_pdf:
            try:
                extracted_text = extract_pdf_text(uploaded_pdf)
            except Exception:
                raise serializers.ValidationError({
                    "template_pdf": "We could not read this PDF. Please upload a valid searchable PDF or type the indemnity text manually."
                })

            if not extracted_text:
                raise serializers.ValidationError({
                    "template_pdf": "The uploaded PDF did not contain selectable text. Please upload a searchable PDF or type the indemnity text manually."
                })

            if not body_html:
                attrs["body_html"] = text_to_html(extracted_text)

            if not title:
                attrs["title"] = derive_title_from_pdf(uploaded_pdf)

            if not attrs.get("version"):
                if company:
                    latest_version = (
                        IndemnityTemplate.objects.filter(company=company)
                        .order_by("-version")
                        .values_list("version", flat=True)
                        .first()
                    )
                    attrs["version"] = (latest_version or 0) + 1
                elif instance:
                    attrs["version"] = instance.version

        selected_version = attrs.get("version") or (instance.version if instance else None)
        if company and selected_version:
            existing = IndemnityTemplate.objects.filter(company=company, version=selected_version)
            if instance:
                existing = existing.exclude(id=instance.id)
            if existing.exists():
                raise serializers.ValidationError({
                    "version": f"Version {selected_version} already exists. Please choose a new version number."
                })

        if not (attrs.get("body_html") or (instance and instance.body_html)):
            raise serializers.ValidationError({
                "body_html": "Either type the indemnity text or upload a PDF that contains the indemnity content."
            })

        return attrs

# indemnity/serializers.py

class IndemnityAgreementSerializer(serializers.ModelSerializer):
    # Standard ImageField handles binary blobs from FormData
    signature_image = serializers.ImageField(required=True)
    photos = VehiclePhotoSerializer(source='condition_photos', many=True, read_only=True)
    pdf_file = serializers.FileField(read_only=True)
    signed_body_html = serializers.CharField(read_only=True)
    signed_template_title = serializers.CharField(read_only=True)
    signed_template_version = serializers.IntegerField(read_only=True)
    template_body_html = serializers.SerializerMethodField()

    def get_template_body_html(self, obj):
        return getattr(obj.template, 'body_html', '') if obj.template else ''

    # List of binary files (Before photos)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False),
        write_only=True,
        required=False
    )

    class Meta:
        model = IndemnityAgreement
        fields = [
            "id", "booking", "template", "customer", "signed_at", 
            "signer_ip", "signer_user_agent", "signature_image", 
            "photos", "uploaded_images", "document_hash", "pdf_file", "latitude", "longitude", "signing_address",
            "signed_body_html", "signed_template_title", "signed_template_version", "template_body_html"
        ]
        read_only_fields = [
            "id", "customer", "signed_at", "document_hash", "signer_ip", "signer_user_agent", "latitude", "longitude",
            "signing_address", "signed_body_html", "signed_template_title", "signed_template_version"
        ]

    def validate(self, data):
        uploaded_images = data.get('uploaded_images', [])
        signature_image = data.get('signature_image')

        if not signature_image:
            raise serializers.ValidationError({
                "signature_image": "Client signature is required before starting a booking."
            })

        if len(uploaded_images) < 1:
            raise serializers.ValidationError({
                "uploaded_images": "At least one BEFORE image is required before starting a booking."
            })

        return data


    def create(self, validated_data):
        request = self.context.get('request')
        booking = validated_data.get('booking')
        company = request.user.company
        template = validated_data.get('template')

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        
        validated_data['latitude'] = lat
        validated_data['longitude'] = lng

        # Convert coordinates to address
        if lat and lng:
            try:
                geolocator = Nominatim(user_agent="glistenworx_app")
                location = geolocator.reverse(f"{lat}, {lng}")
                validated_data['signing_address'] = location.address
            except Exception as e:
                print(f"Geocoding failed: {e}")

        # 🛡️ TIER CHECK: Photo Limits
        plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
        images_data = validated_data.pop('uploaded_images', [])
        
        if len(images_data) < 1:
            raise serializers.ValidationError({
                "uploaded_images": "At least one BEFORE image is required before starting a booking."
            })

        if len(images_data) > plan_limits['max_images_before']:
            raise serializers.ValidationError({
                "uploaded_images": f"Your {company.plan} plan allows a maximum of {plan_limits['max_images_before']} 'Before' photos."
            })

        # Resolution lock by plan: downscale oversized images while preserving aspect ratio.
        max_width = plan_limits.get('max_image_width', 1280)
        max_height = plan_limits.get('max_image_height', 720)
        resized_images_data = [
            resize_image_to_plan_limit(image, max_width, max_height)
            for image in images_data
        ]

        signature_image = validated_data.get('signature_image')
        incoming_storage_bytes = int(getattr(signature_image, 'size', 0) or 0)
        incoming_storage_bytes += sum(int(getattr(image, 'size', 0) or 0) for image in resized_images_data)
        enforce_company_storage_limit(company, incoming_bytes=incoming_storage_bytes)

        # SIGNING IS ALLOWED FOR ALL PLANS
        # Plan limits (indemnity_history_limit) only control what records are visible in list views
        # They do NOT block the creation or signing of new indemnity agreements
        # This allows 1 form to be reused across multiple bookings regardless of plan
        
        # Metadata extraction
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
        
        validated_data['company'] = request.user.company
        validated_data['signer_ip'] = ip
        validated_data['signer_user_agent'] = user_agent
        validated_data['customer'] = booking.customer
        # Freeze the exact signed legal text so future template edits never change historical records.
        validated_data['signed_body_html'] = template.body_html or ''
        validated_data['signed_template_title'] = template.title or ''
        validated_data['signed_template_version'] = template.version
        
        # Hash for digital integrity
        hash_source = f"{template.body_html}-{booking.id}"
        validated_data['document_hash'] = hashlib.sha256(hash_source.encode()).hexdigest()

        with transaction.atomic():
            if booking.status != "CONFIRMED":
                raise serializers.ValidationError({"booking": "Booking must be 'CONFIRMED' to sign."})

            agreement = IndemnityAgreement.objects.create(**validated_data)
            
            # Save binary files as 'BEFORE' photos
            for image in resized_images_data:
                VehiclePhoto.objects.create(
                    agreement=agreement,
                    image=image,
                    photo_type='BEFORE'
                )
            
            booking.change_status("IN_PROGRESS")
        
        #Generate the PDF
        try:
            generate_agreement_pdf(agreement)
            # to include the 'pdf_file' that was just saved in the utility function.
            agreement.refresh_from_db()
        except Exception as e:
            print(f"PDF Generation Error: {e}")
            # We don't want to crash the whole request if just the PDF fails, 
            # but we should log it.

        return agreement