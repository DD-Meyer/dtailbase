from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('indemnity', '0004_indemnityagreement_signing_address'),
    ]

    operations = [
        migrations.AddField(
            model_name='indemnitytemplate',
            name='template_pdf',
            field=models.FileField(blank=True, null=True, upload_to='indemnity_templates/'),
        ),
    ]
