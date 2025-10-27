from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import hashlib
import os

app = Flask(__name__, static_folder='frontend')
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Database setup
def init_db():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# API Routes
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'Backend is running'}), 200

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    hashed_password = hash_password(password)
    
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (email, password) VALUES (?, ?)', 
                      (email, hashed_password))
        conn.commit()
        conn.close()
        return jsonify({'message': 'User registered successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already exists'}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    hashed_password = hash_password(password)
    
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    user = cursor.execute('SELECT * FROM users WHERE email = ? AND password = ?', 
                         (email, hashed_password)).fetchone()
    conn.close()
    
    if user:
        return jsonify({
            'message': 'Login successful',
            'user': {'id': user[0], 'email': user[1]}
        }), 200
    else:
        return jsonify({'error': 'Invalid email or password'}), 401

# Serve frontend
@app.route('/')
def index():
    return send_from_directory('frontend', 'login_page.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('frontend', path)

if __name__ == '__main__':
    init_db()
    print("\n✅ Server starting at http://localhost:5001")
    print("✅ Open your browser to: http://localhost:5001\n")
    app.run(host='0.0.0.0', port=5001, debug=True)
