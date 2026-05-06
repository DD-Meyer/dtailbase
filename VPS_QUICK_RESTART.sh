# Run these commands on VPS in order

# 1. Check current .env configuration
cat /var/www/Detely/.env

# 2. If .env looks empty or wrong, copy from the production example:
# cp /var/www/Detely/.env.production.example /var/www/Detely/.env
# Then edit it: nano /var/www/Detely/.env

# 3. Verify .env has these CRITICAL fields set:
grep -E "DEBUG|DJANGO_ENV|SECRET_KEY|DATABASE_URL|USE_POSTGRES" /var/www/Detely/.env

# 4. Check that OLS and the Django backend listener are running:
ps aux | grep -E "gunicorn|lsws|litespeed"
ss -ltnp | grep 8000

# 5. If OpenLiteSpeed (OLS), restart it:
sudo systemctl restart lsws

# 6. Check OpenLiteSpeed app stdout log:
tail -f /usr/local/lsws/logs/error.log

# 7. In another terminal window, test the API:
curl -i https://www.detely.com/api/bookings/
# or if testing locally:
curl -i http://127.0.0.1:8000/api/bookings/

# 8. If you get a 500, check what line is failing in the OLS error log
