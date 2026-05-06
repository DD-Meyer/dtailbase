# Detely VPS Commands (Hostinger OLS, Ubuntu)

## 1) One-time setup on VPS

```bash
sudo mkdir -p /var/www/Detely
sudo chown -R $USER:$USER /var/www/Detely
cd /var/www/Detely

# clone if not already cloned
git clone <YOUR_REPO_URL> .
```

## 2) Production environment file

```bash
cd /var/www/Detely
cp .env.production.example .env
nano .env
```

Required values:

```env
DEBUG=False
DJANGO_ENV=production
ALLOWED_HOSTS=detely.com,www.detely.com,127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=https://detely.com,https://www.detely.com
CSRF_TRUSTED_ORIGINS=https://detely.com,https://www.detely.com
```

## 3) Run deployment script

```bash
cd /var/www/Detely
chmod +x deploy_vps_ols_detely.sh
bash deploy_vps_ols_detely.sh
```

## 4) Verify application and logs

```bash
curl -I https://www.detely.com/
curl -I https://www.detely.com/api/
ss -ltnp | grep 8000
sudo systemctl status lsws --no-pager
sudo tail -n 150 /usr/local/lsws/logs/error.log
```

## 5) Future deploys

```bash
cd /var/www/Detely
bash deploy_vps_ols_detely.sh
```
