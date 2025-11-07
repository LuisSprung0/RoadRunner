from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import hashlib
from datetime import datetime
from models.user import User

app = Flask(__name__)
# Enable CORS for all origins (including file://)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Database helper functions
def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Routes
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
    
    #Password hashing & user creation happens in User class
    user = User(email, password)
    return user.save_to_db()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    #Password hashing happens in User class
    return User.get_from_db(email, password)

@app.route('/api/trips', methods=['GET'])
def trips():
    return jsonify([{
            'name': "Sample Trip 1",
            'description': "A sample trip description",
            'image_url': "",
            'stops': []
        },
        {
            'name': "Sample Trip 2",
            'description': "A sample trip description",
            'image_url': "",
            'stops': []
        }]), 200 # Placeholder for trip data

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
