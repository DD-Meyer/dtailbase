from django.db import migrations


def set_company_locale_db_defaults(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    with schema_editor.connection.cursor() as cursor:
        # Backfill any legacy null/blank values first.
        cursor.execute(
            """
            UPDATE accounts_company
            SET country_code = 'US'
            WHERE country_code IS NULL OR country_code = ''
            """
        )
        cursor.execute(
            """
            UPDATE accounts_company
            SET currency = CASE
                WHEN country_code = 'ZA' THEN 'ZAR'
                ELSE 'USD'
            END
            WHERE currency IS NULL OR currency = ''
            """
        )

        # Enforce DB-level defaults so inserts are safe even outside Django model paths.
        cursor.execute("ALTER TABLE accounts_company ALTER COLUMN country_code SET DEFAULT 'US'")
        cursor.execute("ALTER TABLE accounts_company ALTER COLUMN currency SET DEFAULT 'USD'")


def unset_company_locale_db_defaults(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute("ALTER TABLE accounts_company ALTER COLUMN country_code DROP DEFAULT")
        cursor.execute("ALTER TABLE accounts_company ALTER COLUMN currency DROP DEFAULT")


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_paypal_subscription_fields'),
    ]

    operations = [
        migrations.RunPython(
            set_company_locale_db_defaults,
            reverse_code=unset_company_locale_db_defaults,
        ),
    ]
