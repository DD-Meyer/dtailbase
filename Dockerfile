# ---------- FRONTEND BUILD ----------
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build


# ---------- BACKEND ----------
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 2. Install SYSTEM dependencies needed for pycairo and other tools
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    pkg-config \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Add the local bin to the PATH so gunicorn can be found
ENV PATH="/usr/local/bin:${PATH}"

# Copy backend code
COPY backend/ /app/backend/

# Copy React build into Django
COPY --from=frontend-build /app/frontend/dist /app/backend/bookingweb/frontend_build/

# Move into the directory containing manage.py
WORKDIR /app/backend/bookingweb/

# Now manage.py is right here
RUN python manage.py collectstatic --noinput

# Cloud Run requires port 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "bookingweb.wsgi:application"]