#!/usr/bin/env bash
set -euo pipefail

# Detely VPS deploy script for Hostinger OpenLiteSpeed (Ubuntu)
# Usage:
#   bash deploy_vps_ols_detely.sh
# Optional env overrides:
#   APP_DIR=/var/www/Detely BRANCH=main VENV_DIR=venv bash deploy_vps_ols_detely.sh

APP_DIR="${APP_DIR:-/var/www/Detely}"
BRANCH="${BRANCH:-staging}"
VENV_DIR="${VENV_DIR:-venv}"
BACKEND_DIR="${APP_DIR}/backend"
FRONTEND_DIR="${APP_DIR}/frontend"

log() { echo "[deploy] $*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
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
  log "Installing frontend dependencies"
  cd "$FRONTEND_DIR"
  npm install

  log "Building frontend"
  npm run build

  log "Syncing frontend build to backend/frontend_build"
  rm -rf "$BACKEND_DIR/frontend_build"
  cp -r "$FRONTEND_DIR/dist" "$BACKEND_DIR/frontend_build"
fi

log "Running Django migrations and collectstatic"
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
