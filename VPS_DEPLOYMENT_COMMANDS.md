# VPS Deployment & Debugging Commands

## STEP 1: Local Test (Windows)

```powershell
# Go to backend directory
cd "E:\Work\Netic\App Development\Booking_System_Vehicle_Detailing\backend"

# Install python-dotenv
pip install python-dotenv

# Test server startup
python .\manage.py runserver 127.0.0.1:8080

# If it runs, test API endpoints locally:
# - http://localhost:8080/api/bookings/
# - http://localhost:8080/api/company/my_company/
```

## STEP 2: Push & Pull on VPS

```bash
# On your local machine, commit the dotenv optional import fix:
git add backend/bookingweb/settings.py
git commit -m "Make dotenv import optional for VPS compatibility"
git push origin main

# On VPS, pull latest:
cd /var/www/DetailerFlow
git pull origin main

# Install/upgrade dependencies
cd /var/www/DetailerFlow/backend
source venv/bin/activate
pip install -r requirements.txt
```

## STEP 3: Check & Ensure VPS .env File Exists

```bash
# On VPS, verify production env file is present:
ls -la /var/www/DetailerFlow/.env

# If it doesn't exist, create it from example:
cp /var/www/DetailerFlow/.env.production.example /var/www/DetailerFlow/.env

# Edit it with your actual secrets:
nano /var/www/DetailerFlow/.env

# Required fields:
# DEBUG=False
# SECRET_KEY=<your-strong-secret>
# DATABASE_URL=postgres://user:password@localhost:5432/dbname
# USE_POSTGRES=True
# DJANGO_ENV=production
```

## STEP 4: Restart App Service & Check Logs

### **If using Gunicorn + Systemd:**

```bash
# Restart gunicorn
sudo systemctl restart gunicorn

# Check status
sudo systemctl status gunicorn

# Live tail error log (Ctrl+C to exit)
sudo journalctl -u gunicorn -f

# Last 50 lines of gunicorn log
sudo journalctl -u gunicorn -n 50

# Detailed error in gunicorn error log file (if exists):
tail -f /var/log/gunicorn/error.log

# Or check gunicorn access log:
tail -f /var/log/gunicorn/access.log
```

### **If using OpenLiteSpeed App Server:**

```bash
# Restart OpenLiteSpeed
sudo systemctl restart lsws

# Check status
sudo systemctl status lsws

# OpenLiteSpeed error log (primary)
tail -f /usr/local/lsws/logs/error.log

# App stdout/stderr log (if configured)
tail -f /usr/local/lsws/logs/app.log

# Check OLS access log
tail -f /usr/local/lsws/logs/access.log

# Restart just the app (without full OLS restart)
sudo systemctl reload lsws
```

## STEP 5: Test Endpoints on VPS

```bash
# Test API is responding (should return JSON, not 500)
curl -i https://detailerflow.netictechnologies.com/api/bookings/

# Test with auth header (replace TOKEN with real JWT):
curl -i -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://detailerflow.netictechnologies.com/api/bookings/

# Test status update endpoint:
curl -i -X PATCH \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}' \
  https://detailerflow.netictechnologies.com/api/bookings/UUID-HERE/update_status/

# Check media files are accessible
curl -i https://detailerflow.netictechnologies.com/media/vehicle_photos/sample.jpg
```

## STEP 6: Common Issues & Quick Fixes

### **Issue: Still getting ModuleNotFoundError after pip install**

```bash
# Verify python-dotenv is installed in venv:
source venv/bin/activate
pip show python-dotenv

# If not found, force reinstall:
pip install --upgrade python-dotenv

# Verify it can be imported:
python -c "from dotenv import load_dotenv; print('OK')"
```

### **Issue: 500 on /api/bookings/ but 200 on /api/company/my_company/**

→ The 500 is likely in a specific serializer or queryset. Check logs for:
```
KeyError
AttributeError
PermissionDenied
ValueError
```

### **Issue: DEBUG=False in .env but still seeing Django debug page**

```bash
# Force reload settings:
# 1. Delete old .pyc/cache files
find /var/www/DetailerFlow -name "*.pyc" -delete
find /var/www/DetailerFlow -type d -name "__pycache__" -exec rm -rf {} +

# 2. Restart app
sudo systemctl restart gunicorn  # or lsws
```

### **Issue: App won't start, says "can't load module"**

```bash
# Check Django can even import settings without starting server:
cd /var/www/DetailerFlow/backend
source ../venv/bin/activate
python -c "from django.conf import settings; print(settings.DEBUG, settings.DATABASES['default']['ENGINE'])"

# If this fails with traceback, that's your root cause
```

## STEP 7: Verify Deployment Health

```bash
# 1. All bookings responsive?
curl -s https://detailerflow.netictechnologies.com/api/bookings/ | head -20

# 2. Images load?
curl -I https://detailerflow.netictechnologies.com/media/vehicle_photos/test.png

# 3. Static files load?
curl -I https://detailerflow.netictechnologies.com/assets/index-DVyh7LtE.js

# 4. Check error logs for new errors in last 5 minutes:
sudo journalctl -u gunicorn --since "5 minutes ago" | grep -i error

# 5. Database accessible?
source venv/bin/activate
python manage.py dbshell  # Should drop you into psql prompt
```

## STEP 8: If Still 500, Collect Full Traceback

```bash
# Run Django shell and import the problematic view:
cd /var/www/DetailerFlow/backend
source ../venv/bin/activate
python manage.py shell

# Inside shell:
>>> from core.views import BookingListCreateAPIView
>>> from core.serializers import BookingListSerializer
>>> # If these import without error, serializers are OK

# Exit shell (Ctrl+D) and check specific endpoint manually:
python manage.py runserver 0.0.0.0:8000 --nothreading --noreload
# Then curl from another terminal
```

## Quick Reference: Where to Set .env on VPS

| Environment | .env Location | Load Priority |
|-------------|---------------|----------------|
| Local (Windows) | `E:\Work\...\` | `.env.local` → `.env` |
| VPS (Production) | `/var/www/DetailerFlow/` | `.env.prod` → `.env` |
| OLS App Server | (same location, app inherits env) | exports from `.env` at startup |

## CRITICAL: Don't Forget After Each Change

1. **Install dependencies:** `pip install -r requirements.txt`
2. **Migrations:** `python manage.py migrate` (if schema changes)
3. **Collect static:** `python manage.py collectstatic --noinput` (if using whitenoise)
4. **Restart app:** `sudo systemctl restart gunicorn` or `lsws`
5. **Tail logs immediately:** `sudo journalctl -u gunicorn -f` (watch for startup errors)
6. **Test endpoint:** `curl -i https://yourdomain.com/api/bookings/`
