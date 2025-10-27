# RoadRunner Backend

Simple Python + SQLite backend for user authentication.

## Quick Start

1. **Install dependencies:**
```bash
cd backend
pip3 install -r requirements.txt
```

2. **Initialize database:**
```bash
python3 init_db.py
```

3. **Start server:**
```bash
python3 app.py
```

Server runs at: `http://localhost:5001`

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/register` - Register new user
- `POST /api/login` - Login user

## Database

SQLite database: `database.db`
Table: `users` (id, email, password, created_at)

## Frontend Integration

Update your HTML to use:
```html
<script src="auth.js"></script>
```
