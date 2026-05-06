# VPS Deployment & Debugging Commands
## SETUP .ENV for Production Ready Fix
cd /var/www/Detely

# backup
cp .env .env.bak.$(date +%F-%H%M%S)

# switch to sqlite on VPS (quickest stable fix)
cat > .env << 'EOF'
DEBUG=False
DJANGO_ENV=production
SECRET_KEY='django-insecure-k1tf3^tazr^$hevd926wb(9i+9pakqgi5#8yme^3v#xozn5*4s'
USE_POSTGRES=False
ALLOWED_HOSTS=detely.com,www.detely.com,187.124.208.220,127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=https://www.detely.com,https://www.detely.com
CSRF_TRUSTED_ORIGINS=https://www.detely.com,https://www.detely.com
EOF

# fix sqlite and writable dirs for app user
chown lsadm:lsadm /var/www/Detely/backend/db.sqlite3
chmod 664 /var/www/Detely/backend/db.sqlite3
chown -R lsadm:lsadm /var/www/Detely/backend/media /var/www/Detely/backend/staticfiles
find /var/www/Detely/backend/media -type d -exec chmod 775 {} \;
find /var/www/Detely/backend/staticfiles -type d -exec chmod 775 {} \;

# restart OLS (and app worker)
systemctl restart lsws
sleep 3



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
git add backend/core/settings.py
git commit -m "Make dotenv import optional for VPS compatibility"
git push origin main

# On VPS, pull latest:
cd /var/www/Detely
git pull origin main

# Install/upgrade dependencies
cd /var/www/Detely/backend
source venv/bin/activate
pip install -r requirements.txt
```

## STEP 3: Check & Ensure VPS .env File Exists

```bash
# On VPS, verify production env file is present:
ls -la /var/www/Detely/.env

# If it doesn't exist, create it from example:
cp /var/www/Detely/.env.production.example /var/www/Detely/.env

# Edit it with your actual secrets:
nano /var/www/Detely/.env

# Required fields:
# DEBUG=False
# SECRET_KEY=<your-strong-secret>
# DATABASE_URL=postgres://detely_prod_user:strong-password@127.0.0.1:5432/detely_prod
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

### **If using OpenLiteSpeed Proxy Context:**

```bash
# Restart OpenLiteSpeed
sudo systemctl restart lsws

# Check status
sudo systemctl status lsws

# OpenLiteSpeed error log (primary)
tail -f /usr/local/lsws/logs/error.log

# App stdout/stderr log (if configured)
tail -f /usr/local/lsws/logs/app.log

# If OLS proxies to Django on 127.0.0.1:8000, confirm the backend listener exists
ss -ltnp | grep 8000

# Check OLS access log
tail -f /usr/local/lsws/logs/access.log

# Restart just the app (without full OLS restart)
sudo systemctl reload lsws
```

## STEP 5: Test Endpoints on VPS

```bash
# Test API is responding (should return JSON, not 500)
curl -i https://www.detely.com/api/bookings/

# Test with auth header (replace TOKEN with real JWT):
curl -i -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://www.detely.com/api/bookings/

# Test status update endpoint:
curl -i -X PATCH \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}' \
  https://www.detely.com/api/bookings/UUID-HERE/update_status/

# Check media files are accessible
curl -i https://www.detely.com/media/vehicle_photos/sample.jpg
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
find /var/www/Detely -name "*.pyc" -delete
find /var/www/Detely -type d -name "__pycache__" -exec rm -rf {} +

# 2. Restart app
sudo systemctl restart gunicorn  # or lsws
```

### **Issue: App won't start, says "can't load module"**

```bash
# Check Django can even import settings without starting server:
cd /var/www/Detely/backend
source ../venv/bin/activate
python -c "from django.conf import settings; print(settings.DEBUG, settings.DATABASES['default']['ENGINE'])"

# If this fails with traceback, that's your root cause
```

## STEP 7: Verify Deployment Health

```bash
# 1. All bookings responsive?
curl -s https://www.detely.com/api/bookings/ | head -20

# 2. Images load?
curl -I https://www.detely.com/media/vehicle_photos/test.png

# 3. Static files load?
curl -I https://www.detely.com/assets/index-DVyh7LtE.js

# 4. Check error logs for new errors in last 5 minutes:
sudo journalctl -u gunicorn --since "5 minutes ago" | grep -i error

# 5. Proxy target listening?
ss -ltnp | grep 8000

# 6. Database accessible?
source venv/bin/activate
python manage.py dbshell  # Should drop you into psql prompt
```

## STEP 8: If Still 500, Collect Full Traceback

```bash
# Run Django shell and import the problematic view:
cd /var/www/Detely/backend
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
| VPS (Production) | `/var/www/Detely/` | `.env` |
| OLS Proxy + Django backend | (same location, Django reads `.env`) | `.env` loaded by Django at startup |

## CRITICAL: Don't Forget After Each Change

1. **Install dependencies:** `pip install -r requirements.txt`
2. **Migrations:** `python manage.py migrate` (if schema changes)
3. **Collect static:** `python manage.py collectstatic --noinput` (if using whitenoise)
4. **Restart app:** restart Django backend and then `sudo systemctl restart lsws` if needed
5. **Tail logs immediately:** `sudo journalctl -u gunicorn -f` (watch for startup errors)
6. **Test endpoint:** `curl -i https://yourdomain.com/api/bookings/`


