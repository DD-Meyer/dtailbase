from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('indemnity', '0005_indemnitytemplate_template_pdf'),
    ]

    operations = [
        migrations.AddField(
            model_name='indemnityagreement',
            name='signed_body_html',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='indemnityagreement',
            name='signed_template_title',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='indemnityagreement',
            name='signed_template_version',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
