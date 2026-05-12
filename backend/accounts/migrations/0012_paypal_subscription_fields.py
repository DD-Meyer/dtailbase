# Generated migration for PayPal subscription fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_rename_stripe_customer_id_company_payfast_token_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='paypal_subscription_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='company',
            name='paypal_customer_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='company',
            name='country_code',
            field=models.CharField(blank=True, default='US', max_length=2),
        ),
        migrations.AddField(
            model_name='company',
            name='currency',
            field=models.CharField(
                choices=[('ZAR', 'South African Rand'), ('USD', 'US Dollar')],
                default='USD',
                max_length=3,
            ),
        ),
    ]
