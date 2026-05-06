# Hostinger OpenLiteSpeed Configuration Checklist

Use this checklist to verify each field in your OLS WebAdmin console matches the production deployment.

**WebAdmin Console URL:** http://187.124.208.220:7080/

**Getting Started:** Login to WebAdmin > Dashboard > Virtual Hosts > Example

---

## ✅ STEP 1: Virtual Host General Settings

**Path:** Virtual Hosts > Example > General

| Field | Expected Value | Your Value | ✓ |
|-------|------------------|------------|---|
| **Document Root** | `/var/www/Detely/backend/frontend_build` | | ✓|
| **Domain Name** | `www.detely.com` | | |
| **Domain Aliases** | `detely.com` | | |
| **Enable GZIP Compression** | `Yes` | | |
| **Index Files** | `index.html, index.php` | | |
| **Auto Index** | `No` | | |
| **Enable Expires** | `Yes` | | |

---

## ✅ STEP 2: Virtual Host Context List

**Path:** Virtual Hosts > Example > Context

You should have **3 contexts total**. Click each and verify:

### Context 1: Static Well-Known
| Field | Expected Value | Your Value | ✓ |
|-------|------------------|------------|---|
| **Type** | `Static` | | |
| **URI** | `/.well-known/` | | |
| **Location** | (auto-filled, leave as-is) | | |
| **Accessible** | `Yes` | | |

### Context 2: Static React Root
| Field | Expected Value | Your Value | ✓ |
|-------|------------------|------------|---|
| **Type** | `Static` | | |
| **URI** | `/` | | |
| **Location** | `/var/www/Detely/backend/frontend_build` | | |
| **Accessible** | `Yes` | | |
| **Enable Rewrite** | `No` (rewrite is at vhost level) | | |

### Context 3: Proxy API
| Field | Expected Value | Your Value | ✓ |
|-------|------------------|------------|---|
| **Type** | `Proxy` | | |
| **URI** | `/api/` | | |
| **Web Server** | `[VHost Level]: django_backend` | | |
| **Header Operations** | `Not Set` | | |
| **Enable Expires** | `Not Set` | | |

### External App: Django Proxy Target
| Field | Expected Value | Your Value | ✓ |
|-------|------------------|------------|---|
| **Type** | `Web Server (Proxy)` | | |
| **Name** | `django_backend` | | |
| **Address** | `127.0.0.1:8000` | | |
| **Max Connections** | `100` | | |
| **Initial Request Timeout (secs)** | `60` | | |
| **Response Buffering** | `No` | | |

### Context 4: Static Media Files ⚠️ REQUIRED FOR IMAGE DISPLAY
| Field | Expected Value | Your Value | ✓ |
|-------|------------------|------------|---|
| **Type** | `Static` | | |
| **URI** | `/media/` | | |
| **Location** | `/var/www/Detely/backend/media/` | | |
| **Accessible** | `Yes` | | |
| **Enable Rewrite** | `No` | | |

**Without this context, uploaded images (vehicle photos, logos, signatures) return 404.**

**⚠️ CRITICAL:** Do NOT have an App Server or Proxy context with URI `/`. If you see one, delete it.

---

## ✅ STEP 3: Virtual Host Rewrite Settings

**Path:** Virtual Hosts > Example > Rewrite

| Field | Expected Value | Your Value | ✓ |
|-------|------------------|------------|---|
| **Enable Rewrite** | `Yes` | | |
| **Auto Load from .htaccess** | `Yes` (optional) | | |
| **Rewrite Rules** | (see below) | | |

**Paste this exactly into the Rewrite Rules text box:**

```
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_URI} !^/admin/
RewriteCond %{REQUEST_URI} !^/media/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

The `!^/media/` line prevents the SPA catch-all from intercepting uploaded file requests.

---

## ✅ STEP 4: Virtual Host Log Settings

**Path:** Virtual Hosts > Example > Log

| Field | Expected Value | Your Value | ✓ |
|-------|------------------|------------|---|
| **Log Level** | `INFO` or `WARN` | | |
| **Use Server Log Format** | `No` | | |

---

## ✅ STEP 5: Server Listeners

**Path:** Server Configuration > Listeners

| Field | Expected Value | Your Value | ✓ |
|-------|------------------|------------|---|
| **Port** | `80` | | |
| **IP Address** | `*` (all IPs) | | |
| **Secure** | `No` (HTTP only for now) | | |

If you see port 7080, that's the Admin Console (separate from your app).

---

## ✅ STEP 6: Static Context (SSL) - FUTURE (not now)

**Path:** Virtual Hosts > Example > SSL

Skip this for now. When you add HTTPS later, you'll:
- Enable SSL
- Add cert files
- Create a second Listener on port 443

---

## 🚀 DEPLOYMENT WORKFLOW

### Before Restarting:

1. **Verify all fields above are set correctly** ✓
2. **Kill any old gunicorn processes on VPS:**
   ```bash
   pkill -9 gunicorn
   ```
3. **Collect Django static files:**
   ```bash
   cd /var/www/Detely/backend
   source venv/bin/activate
   python manage.py collectstatic --noinput
   ```
4. **Check file permissions:**
   ```bash
   chown -R lsadm:lsadm /var/www/Detely/backend
   chmod -R 755 /var/www/Detely/backend
   ```

### Perform Graceful Restart:

1. Go to Dashboard in WebAdmin
2. Look for the **Purple Circle Arrow Icon** next to "LSWS PID"
3. Click it
4. Wait 5-10 seconds for the purple icon to finish animating

### Test URLs:

```
http://187.124.208.220/                    (should load React homepage)
http://187.124.208.220/login                (should load React login page, not 404)
http://187.124.208.220/api/                 (should proxy to Django and return JSON or auth error)
http://187.124.208.220/admin/               (should load Django admin through the Django backend)
```

---

## ❌ TROUBLESHOOTING IF STILL 404

### Problem: Still seeing 404 at root
- Check: Document Root in General tab is `/var/www/Detely/backend/frontend_build`
- Check: Static context URI `/` exists and points to same path
- Check: No Proxy or App Server context exists on URI `/`

### Problem: /api calls return 404
- Check: Proxy context URI `/api/` exists
- Check: Proxy context points to `[VHost Level]: django_backend`
- Check: External App `django_backend` points to `127.0.0.1:8000`
- On VPS, run: `cd /var/www/Detely/backend && python manage.py check`

### Problem: /api returns 502 or times out
- Check: Django is actually listening on `127.0.0.1:8000`
- Check: External App `django_backend` address is exactly `127.0.0.1:8000`
- Check: your Django process or gunicorn service is running

### Problem: React routes like /login return 404
- Check: Rewrite Rules are enabled
- Check: Rewrite Rules exclude `/api/` and `/admin/`
- Check: Last line is `RewriteRule . /index.html [L]`

### Problem: Frontend can't reach backend API
- In browser DevTools, Network tab, check API call URLs
- Ensure they point to `/api/...` (relative, not absolute)
- Check CORS_ALLOWED_ORIGINS in Django settings includes your domain

---

## 📝 NOTES

- **Order matters:** Always set General first, then Contexts, then Rewrite
- **Graceful Restart:** This restarts OLS without dropping connections
- **File timestamps:** If you edit Django code, restart OLS for changes to take effect
- **Asset fingerprinting:** Vite already handles cache busting (index-*.css/js), so assets won't be stale
- **Database:** Using SQLite (db.sqlite3) is fine for small teams; no migrations needed for first deploy

---

## ✅ SUCCESS INDICATORS

You'll know deployment is working when:

1. ✅ http://187.124.208.220/ loads a page with your React homepage UI
2. ✅ React CSS/JS load (not broken styling)
3. ✅ You can click /login and see login form (not a 404 error page)
4. ✅ Browser DevTools Network tab shows `/api/` calls being proxied to your Django backend
5. ✅ API calls return JSON or proper error responses, not 502/504

Once all 5 are true, your Detely app is live on production! 🎉


