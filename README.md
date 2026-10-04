# Entiha Career Platform

Entiha is a full-stack career-support platform that combines a responsive public website with user accounts, profiles, packages, payments, applications, contact management, and an administrative dashboard.

## Highlights

- Account registration, authentication, and password recovery
- User profiles and personalized dashboard
- Career packages and application tracking
- Cashfree payment integration with sandbox support
- Contact and administration workflows
- Firebase-ready frontend and Flask/SQLite backend

## Technology

- HTML, CSS, and vanilla JavaScript
- Python, Flask, Flask-SQLAlchemy, and Flask-CORS
- SQLite
- Firebase Hosting configuration

## Local setup

```bash
git clone https://github.com/Nabiha-Nabz/entiha.git
cd entiha
python -m venv .venv
```

Activate the environment, then install and run the backend:

```bash
pip install -r backend/requirements.txt
copy .env.example .env
python backend/app.py
```

On macOS or Linux, use `cp .env.example .env` instead of `copy`.

Open `http://127.0.0.1:5000` in a browser.

## Configuration

All credentials belong in `.env`; never commit real email or payment credentials. The included `.env.example` documents the required settings.

## Security note

Use sandbox payment credentials during development, generate a strong production `SECRET_KEY`, and configure secure cookies and HTTPS before deployment.
