# Dtailbase VPS Commands (Hostinger OLS, Ubuntu)

## 1) One-time setup on VPS

```bash
sudo mkdir -p /var/www/Dtailbase
sudo chown -R $USER:$USER /var/www/Dtailbase
cd /var/www/Dtailbase

# clone if not already cloned
git clone <YOUR_REPO_URL> .
```

## 2) Production environment file

```bash
cd /var/www/Dtailbase
cp .env.production.example .env
nano .env
```

Required values:

```env
DEBUG=False
DJANGO_ENV=production
ALLOWED_HOSTS=dtailbase.com,www.dtailbase.com,127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=https://dtailbase.com,https://www.dtailbase.com
CSRF_TRUSTED_ORIGINS=https://dtailbase.com,https://www.dtailbase.com
```

## 3) Run deployment script

```bash
cd /var/www/Dtailbase
chmod +x deploy_vps_ols_dtailbase.sh
bash deploy_vps_ols_dtailbase.sh
```

## 4) Verify application and logs

```bash
curl -I https://www.dtailbase.com/
curl -I https://www.dtailbase.com/api/
ss -ltnp | grep 8000
sudo systemctl status lsws --no-pager
sudo tail -n 150 /usr/local/lsws/logs/error.log
```

## 5) Future deploys

```bash
cd /var/www/Dtailbase
bash deploy_vps_ols_dtailbase.sh
```
