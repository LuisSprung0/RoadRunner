# User model - defines user data structure and methods
from flask import jsonify
import sqlite3
import hashlib

class User:
    def __init__(self, email, password):
        self.email = email
        self.password = User.hash_password(password) #hashed version
        
    @staticmethod
    def hash_password(password):
        return hashlib.sha256(password.encode()).hexdigest()
    
    def get_trips(self):
        # Placeholder
        pass

    def save_to_db(self):
            try:
                conn = sqlite3.connect('database.db')
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('INSERT INTO users (email, password) VALUES (?, ?)', 
                      (self.email, self.password))
                conn.commit()
                conn.close()
                return jsonify({'message': 'User registered successfully'}), 201
            except sqlite3.IntegrityError:
                return jsonify({'error': 'Email already exists'}), 400
            except Exception as e:
                return jsonify({'error': str(e)}), 500
            
    @staticmethod
    def get_from_db(email, password):
        try:
            conn = sqlite3.connect('database.db')
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            user = cursor.execute('SELECT * FROM users WHERE email = ? AND password = ?', 
                                (email, User.hash_password(password))).fetchone()
            conn.close()
            
            if user:
                return jsonify({
                    'message': 'Login successful',
                    'user': {
                        'id': user['id'],
                        'email': user['email']
                    }
                }), 200
            else:
                return jsonify({'error': 'Invalid email or password'}), 401
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    