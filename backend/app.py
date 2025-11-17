from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import hashlib
from datetime import datetime
from models.user import User
from models.trip import Trip
from models.stop import Stop, StopType

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

@app.route('/api/trips/save', methods=['POST'])
def save_trip():
    """Save a new trip with stops"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        name = data.get('name', 'Unnamed Trip')
        description = data.get('description', '')
        image_url = data.get('image_url', '')
        stops_data = data.get('stops', [])
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        # Create trip
        trip = Trip(user_id=user_id, name=name, description=description, image_url=image_url)
        
        # Add stops to trip
        for stop_data in stops_data:
            location = stop_data.get('location')  # Should be [lat, lng]
            stop_type_str = stop_data.get('type', 'MISC')
            time = stop_data.get('time', 0)
            cost = stop_data.get('cost', 0)
            
            # Convert string to StopType enum
            try:
                stop_type = StopType[stop_type_str.upper()]
            except KeyError:
                stop_type = StopType.MISC
            
            stop = Stop(location=tuple(location), type=stop_type, time=time, cost=cost)
            trip.add_stop(stop)
        
        # Save to database
        result = trip.save_to_db()
        
        if result['success']:
            return jsonify({
                'message': 'Trip saved successfully',
                'trip_id': result['trip_id'],
                'trip': trip.to_dict()
            }), 201
        else:
            return jsonify({'error': result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/trips/user/<int:user_id>', methods=['GET'])
def get_user_trips(user_id):
    """Get all trips for a specific user"""
    try:
        trips = Trip.get_user_trips(user_id)
        trips_data = [trip.to_dict() for trip in trips]
        return jsonify({'trips': trips_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/trips/<int:trip_id>', methods=['GET'])
def get_trip(trip_id):
    """Get a specific trip by ID"""
    try:
        trip = Trip.get_from_db(trip_id)
        if trip:
            return jsonify({'trip': trip.to_dict()}), 200
        else:
            return jsonify({'error': 'Trip not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
