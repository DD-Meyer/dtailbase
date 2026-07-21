from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_paypal_subscription_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='location_verification_document',
            field=models.FileField(blank=True, null=True, upload_to='location_verification_docs/'),
        ),
        migrations.AddField(
            model_name='company',
            name='location_verification_notes',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='company',
            name='location_verification_score',
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name='company',
            name='location_verification_status',
            field=models.CharField(
                choices=[('NONE', 'None'), ('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')],
                default='NONE',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='company',
            name='location_verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='company',
            name='requested_country_code',
            field=models.CharField(blank=True, default='', max_length=2),
        ),
        migrations.AddField(
            model_name='company',
            name='requested_currency',
            field=models.CharField(blank=True, default='', max_length=3),
        ),
    ]
