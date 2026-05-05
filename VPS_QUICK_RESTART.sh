# Run these commands on VPS in order

# 1. Check current .env configuration
cat /var/www/detely/.env

# 2. If .env looks empty or wrong, copy from the production example:
# cp /var/www/detely/.env.production.example /var/www/detely/.env
# Then edit it: nano /var/www/detely/.env

# 3. Verify .env has these CRITICAL fields set:
grep -E "DEBUG|DJANGO_ENV|SECRET_KEY|DATABASE_URL|USE_POSTGRES" /var/www/detely/.env

# 4. Check what app server you're running:
ps aux | grep -E "gunicorn|lsws|litespeed"

# 5. If OpenLiteSpeed (OLS), restart it:
sudo systemctl restart lsws

# 6. Check OpenLiteSpeed app stdout log:
tail -f /usr/local/lsws/logs/error.log

# 7. In another terminal window, test the API:
curl -i https://www.detely.com/api/bookings/
# or if testing locally:
curl -i http://127.0.0.1/api/bookings/

# 8. If you get a 500, check what line is failing in the OLS error log
