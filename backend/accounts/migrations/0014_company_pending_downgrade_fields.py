from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0013_company_location_verification_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='pending_downgrade_plan',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
        migrations.AddField(
            model_name='company',
            name='subscription_ends_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
