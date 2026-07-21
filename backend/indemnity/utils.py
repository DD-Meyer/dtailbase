from io import BytesIO
from django.template.loader import get_template
from xhtml2pdf import pisa
from django.core.files.base import ContentFile
import os

def generate_agreement_pdf(agreement):
    template = get_template('pdf/indemnity_template.html')
    # Separate photos for the template
    before_photos = agreement.condition_photos.filter(photo_type='BEFORE')
    after_photos = agreement.condition_photos.filter(photo_type='AFTER')
    
    context = {
        'agreement': agreement,
        'before_photos': before_photos,
        'after_photos': after_photos,
        'company': agreement.company
    }
    
    html = template.render(context)
    result = BytesIO()
    
    # Generate PDF
    pdf = pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result)
    
    if not pdf.err:
        # Optional: Delete old file if it exists to keep storage clean
        if agreement.pdf_file:
            if os.path.isfile(agreement.pdf_file.path):
                os.remove(agreement.pdf_file.path)
        
        filename = f"agreement_{agreement.id}.pdf"
        agreement.pdf_file.save(filename, ContentFile(result.getvalue()), save=True)
        return True
    return False