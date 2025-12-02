from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import hashlib
from datetime import datetime
from models.user import User
from models.trip import Trip
from models.stop import Stop, StopType
from services.maps_service import MapsService
from routes.trips import trips_bp
from routes.budget import budget_bp

app = Flask(__name__)
# Enable CORS for all origins (including file://)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Register blueprints
app.register_blueprint(trips_bp)
app.register_blueprint(budget_bp)

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


    
@app.route('/api/maps/geocode', methods=['POST'])
def geocode_address():
    # Geocode an address to latitude and longitude
    try:
        data = request.get_json()
        address = data.get('address')
        if not address:
            return jsonify({'error': 'Address is required'}), 400
        
        latlng = MapsService.geocode(address)
        if latlng:
            return jsonify({'latitude': latlng[0], 'longitude': latlng[1]}), 200
        else:
            return jsonify({'error': 'Geocoding failed'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/maps/reverse_geocode', methods=['POST'])
def reverse_geocode():
    # Reverse geocode latitude and longitude to an address
    try:
        data = request.get_json()
        latitude = data.get('latitude')
        longitude = data.get('longitude')

        if latitude is None or longitude is None:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        address = MapsService.reverse_geocode(latitude, longitude)
        if address:
            return jsonify({'address': address}), 200
        else:
            return jsonify({'error': 'Reverse geocoding failed'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/maps/directions', methods=['POST'])
def get_directions():
    # Returns route information like polyline, distance, duration, and route when given origin, destination, waypoints, mode, start time
    try:
        data = request.get_json()
        origin = data.get('origin')
        destination = data.get('destination')
        waypoints = data.get('waypoints', None)
        mode = data.get('mode', 'driving')
        
        if not origin or not destination:
            return jsonify({'error': 'Origin and destination are required'}), 400
        
        directions = MapsService.get_directions(origin, destination, waypoints, mode)

        if directions is None:
            return jsonify({'error': 'Unroutable location'}), 404

        return jsonify({'directions': directions}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
