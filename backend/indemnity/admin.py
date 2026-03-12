from django.contrib import admin
from django.utils.html import format_html
from .models import IndemnityTemplate, IndemnityAgreement
from core.models import *

class VehiclePhotoInline(admin.TabularInline):
    model = VehiclePhoto
    extra = 0
    # Add 'image_preview' to fields to make it show up
    fields = ['image', 'photo_type', 'image_preview']
    readonly_fields = ['image_preview']

    def image_preview(self, obj):
        if obj.image:
            # format_html is the secure way to render HTML in Django Admin
            return format_html('<img src="{}" style="width: 100px; height: auto;" />', obj.image.url)
        return "No Image"
    
    image_preview.short_description = "Preview"

@admin.register(IndemnityAgreement)
class IndemnityAgreementAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'signed_at', 'signer_ip']
    # This allows you to see/add photos directly inside the Agreement page
    inlines = [VehiclePhotoInline]
    readonly_fields = ['signed_at', 'signer_ip']

# Register the template model
admin.site.register(IndemnityTemplate)

# REMOVED: admin.site.register(IndemnityAgreement) 
# (Already registered via decorator above)