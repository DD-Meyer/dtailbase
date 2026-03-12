#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. Build the Frontend
echo "Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Move build files to Backend (so Django can serve them)
echo "Syncing build files..."
mkdir -p backend/frontend_build
cp -a frontend/dist/. backend/frontend_build/

# 3. Build the Backend
echo "Building Backend..."
cd backend
pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Return to root
cd ..
echo "Build Complete!"