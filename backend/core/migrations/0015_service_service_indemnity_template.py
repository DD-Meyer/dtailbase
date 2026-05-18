from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("indemnity", "0006_indemnityagreement_signed_snapshot_fields"),
        ("core", "0014_alter_vehiclephoto_agreement"),
    ]

    operations = [
        migrations.AddField(
            model_name="service",
            name="service_indemnity_template",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="services",
                to="indemnity.indemnitytemplate",
            ),
        ),
    ]
