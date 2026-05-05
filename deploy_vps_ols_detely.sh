#!/usr/bin/env bash
set -euo pipefail

# Detely VPS deploy script for Hostinger OpenLiteSpeed (Ubuntu)
# Usage:
#   bash deploy_vps_ols_detely.sh
# Optional env overrides:
#   APP_DIR=/var/www/Detely BRANCH=main VENV_DIR=venv bash deploy_vps_ols_detely.sh

if [[ -z "${APP_DIR:-}" ]]; then
  if [[ -d "/var/www/Detely" ]]; then
    APP_DIR="/var/www/Detely"
  elif [[ -d "/var/www/detely" ]]; then
    APP_DIR="/var/www/detely"
  else
    APP_DIR="/var/www/Detely"
  fi
fi
BRANCH="${BRANCH:-staging}"
VENV_DIR="${VENV_DIR:-venv}"
BACKEND_DIR="${APP_DIR}/backend"
FRONTEND_DIR="${APP_DIR}/frontend"
NODE_MIN_MAJOR="${NODE_MIN_MAJOR:-20}"

log() { echo "[deploy] $*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

preflight_db_env_check() {
  local env_file="$APP_DIR/.env"

  # Guard against Docker-style DB host names when running on a single VPS.
  if [[ -f "$env_file" ]]; then
    if grep -Eq '^DB_HOST\s*=\s*db\s*$' "$env_file"; then
      echo "Invalid DB_HOST in $env_file: DB_HOST=db" >&2
      echo "Set DB_HOST=127.0.0.1 (or your PostgreSQL server IP), then re-run deploy." >&2
      exit 1
    fi

    if grep -Eq '^DATABASE_URL\s*=\s*.+@db(:[0-9]+)?/' "$env_file"; then
      echo "Invalid DATABASE_URL in $env_file: host is 'db'" >&2
      echo "Set DATABASE_URL host to 127.0.0.1 or your PostgreSQL host, then re-run deploy." >&2
      exit 1
    fi
  fi
}

require_cmd git
require_cmd python3
require_cmd systemctl

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Repository not found at $APP_DIR" >&2
  exit 1
fi

log "Switching to app directory: $APP_DIR"
cd "$APP_DIR"

log "Fetching latest code"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [[ -d "$APP_DIR/$VENV_DIR" ]]; then
  # shellcheck disable=SC1091
  source "$APP_DIR/$VENV_DIR/bin/activate"
else
  log "Virtualenv not found at $APP_DIR/$VENV_DIR. Creating it."
  python3 -m venv "$APP_DIR/$VENV_DIR"
  # shellcheck disable=SC1091
  source "$APP_DIR/$VENV_DIR/bin/activate"
fi

log "Installing backend dependencies"
pip install --upgrade pip
pip install -r "$BACKEND_DIR/requirements.txt"

if [[ -f "$FRONTEND_DIR/package.json" ]]; then
  require_cmd npm
  require_cmd node

  NODE_VERSION_RAW="$(node -v | sed 's/^v//')"
  NODE_MAJOR="${NODE_VERSION_RAW%%.*}"
  if ! [[ "$NODE_MAJOR" =~ ^[0-9]+$ ]]; then
    echo "Unable to parse Node version from: $(node -v)" >&2
    exit 1
  fi
  if (( NODE_MAJOR < NODE_MIN_MAJOR )); then
    echo "Node.js $(node -v) is too old. Required: >= ${NODE_MIN_MAJOR}.x (Vite 7 requires >=20.19)." >&2
    echo "Install Node 22 LTS, then re-run deploy:" >&2
    echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -" >&2
    echo "  sudo apt-get install -y nodejs" >&2
    exit 1
  fi

  log "Using Node $(node -v) and npm $(npm -v)"
  log "Installing frontend dependencies"
  cd "$FRONTEND_DIR"
  if [[ -f "package-lock.json" ]]; then
    npm ci --include=optional
  else
    npm install --include=optional
  fi

  log "Building frontend"
  if ! npm run build; then
    log "Frontend build failed. Retrying with clean npm reinstall (optional dependency recovery)."
    rm -rf node_modules package-lock.json
    npm install --include=optional
    npm run build
  fi

  log "Syncing frontend build to backend/frontend_build"
  rm -rf "$BACKEND_DIR/frontend_build"
  cp -r "$FRONTEND_DIR/dist" "$BACKEND_DIR/frontend_build"
fi

log "Running Django migrations and collectstatic"
preflight_db_env_check
cd "$BACKEND_DIR"
python manage.py migrate --noinput
python manage.py collectstatic --noinput

log "Fixing ownership and permissions for OLS app user"
sudo chown -R lsadm:lsadm "$BACKEND_DIR"
sudo find "$BACKEND_DIR" -type d -exec chmod 755 {} \;
sudo find "$BACKEND_DIR" -type f -exec chmod 644 {} \;

if [[ -f "$BACKEND_DIR/db.sqlite3" ]]; then
  sudo chmod 664 "$BACKEND_DIR/db.sqlite3"
fi

if [[ -d "$BACKEND_DIR/media" ]]; then
  sudo find "$BACKEND_DIR/media" -type d -exec chmod 775 {} \;
  sudo find "$BACKEND_DIR/media" -type f -exec chmod 664 {} \;
fi

log "Restarting OpenLiteSpeed"
sudo systemctl restart lsws

log "Deployment completed successfully"
log "Quick checks:"
log "  curl -I https://www.detely.com/"
log "  curl -I https://www.detely.com/api/"
log "  sudo tail -n 100 /usr/local/lsws/logs/error.log"
