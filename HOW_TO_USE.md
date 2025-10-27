# 🚀 RoadRunner - Quick Start Guide

## How to Use (Super Simple!)

### **Step 1: Start the Backend** 
**Double-click** the file: `START_BACKEND.command`

A terminal window will open showing:
```
* Running on http://127.0.0.1:5001
```
**Keep this window open!**

### **Step 2: Open the Login Page**
**Double-click** the file: `frontend/login_page.html`

It will open in your browser!

### **Step 3: Test It**
1. **Register** a new account (left form)
   - Email: test@example.com
   - Password: test123
   - Confirm Password: test123
   - Click "Register"

2. **Login** with that account (right form)
   - Email: test@example.com
   - Password: test123
   - Click "Sign In"

✅ Done! You should see success messages!

---

## Troubleshooting

**Problem:** "Failed to fetch" error
**Solution:** Make sure the backend terminal (Step 1) is still running

**Problem:** Can't double-click START_BACKEND.command
**Solution:** Open Terminal and run:
```bash
cd /Users/harshithsankarnarne/Desktop/RoadRunner_Project/RoadRunner/backend
python3 app.py
```

---

## What's Inside

- **Backend** (Python + Flask + SQLite)
  - `backend/app.py` - API server
  - `backend/database.db` - User database
  - `backend/init_db.py` - Database setup

- **Frontend** (HTML + JavaScript)
  - `frontend/login_page.html` - Login page
  - `frontend/auth.js` - Authentication logic

---

## API Endpoints

- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `GET /api/health` - Check server status

---

**That's it! Super simple! 🎉**
