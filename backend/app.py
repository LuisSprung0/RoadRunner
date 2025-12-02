# Run this file with: python app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import hashlib
from datetime import datetime
from models.user import User
from models.trip import Trip
from models.stop import Stop, StopType

try:
    from services.maps_service import MapsService
    MAPS_SERVICE_AVAILABLE = True
except ValueError:
    MAPS_SERVICE_AVAILABLE = False
    MapsService = None

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

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    # Define admin credentials (can be moved to config/env in production)
    ADMIN_EMAIL = 'admin@roadrunner.com'
    ADMIN_PASSWORD = 'admin123'  # In production, use environment variables and proper hashing
    
    if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
        return jsonify({
            'message': 'Admin login successful',
            'is_admin': True
        }), 200
    else:
        return jsonify({'error': 'Invalid admin credentials'}), 401

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    """Get all users with their trips"""
    try:
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all users
        users = cursor.execute('SELECT id, email FROM users ORDER BY id').fetchall()
        
        users_data = []
        for user in users:
            user_id = user['id']
            user_email = user['email']
            
            # Get all trips for this user
            trips = cursor.execute(
                'SELECT id, name, description, image_url, created_at FROM trips WHERE user_id = ? ORDER BY created_at DESC',
                (user_id,)
            ).fetchall()
            
            trips_data = []
            for trip in trips:
                # Get stops for this trip
                stops = cursor.execute(
                    'SELECT latitude, longitude, stop_type, time_minutes, cost FROM stops WHERE trip_id = ? ORDER BY stop_order',
                    (trip['id'],)
                ).fetchall()
                
                trips_data.append({
                    'trip_id': trip['id'],
                    'name': trip['name'],
                    'description': trip['description'],
                    'image_url': trip['image_url'],
                    'created_at': trip['created_at'],
                    'stops': [
                        {
                            'latitude': s['latitude'],
                            'longitude': s['longitude'],
                            'type': s['stop_type'],
                            'time': s['time_minutes'],
                            'cost': s['cost']
                        } for s in stops
                    ],
                    'total_cost': sum(s['cost'] for s in stops)
                })
            
            users_data.append({
                'user_id': user_id,
                'email': user_email,
                'trips': trips_data,
                'trip_count': len(trips_data)
            })
        
        conn.close()
        return jsonify({'users': users_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    
@app.route('/api/trips/<int:trip_id>/directions', methods=['GET']) #Need to test
def get_trip_directions(trip_id):
    """Get directions for a specific trip"""
    try:
        if not MAPS_SERVICE_AVAILABLE:
            return jsonify({'error': 'Maps service is not configured. Please set GOOGLE_MAPS_API_KEY in .env'}), 503
        
        trip = Trip.get_from_db(trip_id)
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404
        if len(trip.stops) < 2:
            return jsonify({'error': 'At least two stops are required to get directions'}), 400
        
        origin = trip.stops[0].get_location()
        destination = trip.stops[-1].get_location()
        waypoints = [stop.get_location() for stop in trip.stops[1:-1]]
        
        directions = MapsService.get_directions(origin, destination, waypoints)
        if directions is None:
            return jsonify({'error': 'Unroutable location'}), 404
        
        return jsonify({'directions': directions}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    
@app.route('/api/maps/geocode', methods=['POST'])
def geocode_address():
    # Geocode an address to latitude and longitude
    try:
        if not MAPS_SERVICE_AVAILABLE:
            return jsonify({'error': 'Maps service is not configured. Please set GOOGLE_MAPS_API_KEY in .env'}), 503
        
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
        if not MAPS_SERVICE_AVAILABLE:
            return jsonify({'error': 'Maps service is not configured. Please set GOOGLE_MAPS_API_KEY in .env'}), 503
        
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
        if not MAPS_SERVICE_AVAILABLE:
            return jsonify({'error': 'Maps service is not configured. Please set GOOGLE_MAPS_API_KEY in .env'}), 503
        
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
