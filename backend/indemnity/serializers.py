import hashlib
from rest_framework import serializers
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import *
from core.models import *
from core.serializers import *
from drf_extra_fields.fields import Base64ImageField
from core.plan_limits import PLAN_CONFIG
from geopy.geocoders import Nominatim
# indemnity/serializers.py
from .utils import generate_agreement_pdf

class VehiclePhotoSerializer(serializers.ModelSerializer):
    # Keep as standard ImageField so it works for both internal saves and GETs
    image = serializers.ImageField()

    class Meta:
        model = VehiclePhoto
        fields = ['id', 'image', 'photo_type', 'created_at']

class IndemnityTemplateSerializer(serializers.ModelSerializer):
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = IndemnityTemplate
        fields = ["id", "title", "body_html", "version", "is_active", "created_at", "can_edit"]
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if not request: return True
        
        company = request.user.company
        plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
        
        # If history limit is 0, they can't edit existing records
        return plan_limits.get('indemnity_history_limit', 0) != 0

# indemnity/serializers.py

class IndemnityAgreementSerializer(serializers.ModelSerializer):
    # Standard ImageField handles binary blobs from FormData
    signature_image = serializers.ImageField(required=True)
    photos = VehiclePhotoSerializer(source='condition_photos', many=True, read_only=True)
    pdf_file = serializers.FileField(read_only=True)

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
            "photos", "uploaded_images", "document_hash", "pdf_file", "latitude", "longitude", "signing_address"
        ]
        read_only_fields = ["id", "customer", "signed_at", "document_hash", "signer_ip", "signer_user_agent", "latitude", "longitude", "signing_address"]

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
        
        # Hash for digital integrity
        hash_source = f"{template.body_html}-{booking.id}"
        validated_data['document_hash'] = hashlib.sha256(hash_source.encode()).hexdigest()

        with transaction.atomic():
            if booking.status != "CONFIRMED":
                raise serializers.ValidationError({"booking": "Booking must be 'CONFIRMED' to sign."})

            agreement = IndemnityAgreement.objects.create(**validated_data)
            
            # Save binary files as 'BEFORE' photos
            for image in images_data:
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