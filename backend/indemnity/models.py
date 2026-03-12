from django.db import models
import uuid
from accounts.models import Company

class IndemnityTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="indemnity_templates"
    )
    title = models.CharField(max_length=255)
    body_html = models.TextField()
    version = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("company", "version")

    def __str__(self):
        return f"{self.title} v{self.version}"


class IndemnityAgreement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="indemnity_agreements"
    )

    # ✅ Use a unique related_name to avoid clashes with the 'core' app
    booking = models.OneToOneField( # Or ForeignKey
        'core.Booking', 
        on_delete=models.CASCADE, 
        related_name='booking_indemnity' # <--- This must match the serializer
    )

    # ✅ Explicitly set related_name for customer to avoid 'indemnityagreement_set' clashes
    customer = models.ForeignKey(
        "core.Customer",
        on_delete=models.CASCADE,
        related_name="customer_indemnity_agreements"
    )

    template = models.ForeignKey(
        IndemnityTemplate,
        on_delete=models.PROTECT,
        related_name="signed_agreements"
    )

    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    signing_address = models.TextField(null=True, blank=True) # New Field
    
    signed_at = models.DateTimeField(auto_now_add=True)
    signer_ip = models.GenericIPAddressField(null=True, blank=True)
    signer_user_agent = models.TextField(null=True, blank=True)

    signature_image = models.ImageField(upload_to="signatures/", null=True, blank=True)
    pdf_file = models.FileField(upload_to="indemnity_pdfs/", null=True, blank=True)
    document_hash = models.CharField(max_length=64, null=True, blank=True)

    def __str__(self):
        return f"Indemnity for booking {self.booking_id}"