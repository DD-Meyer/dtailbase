import time

from django.core.management.base import BaseCommand, CommandError

from core.password_reset import deliver_password_resets


class Command(BaseCommand):
    help = "Send queued password-reset emails. Run --watch as a supervised production worker."

    def add_arguments(self, parser):
        parser.add_argument("--watch", action="store_true")

    def handle(self, *args, **options):
        while True:
            failures = deliver_password_resets()
            if failures:
                self.stderr.write(self.style.ERROR(f"{failures} reset email deliveries failed; retries remain queued."))
                if not options["watch"]:
                    raise CommandError("SMTP delivery failed.")
            if not options["watch"]:
                break
            time.sleep(10)
