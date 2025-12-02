from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import hashlib
import os
import sys

app = Flask(__name__, static_folder='frontend')
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Database setup - Use backend database
BACKEND_DB_PATH = os.path.join(os.path.dirname(__file__), 'backend', 'database.db')

def init_db():
    """Initialize the backend database for trips"""
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    db_path = os.path.join(backend_dir, 'database.db')
    
    if not os.path.exists(db_path):
        print("Initializing backend database...")
        init_script = os.path.join(backend_dir, 'init_trips_db.py')
        os.system(f"cd {backend_dir} && python init_trips_db.py")

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Helper function to get backend database connection
def get_backend_db():
    conn = sqlite3.connect(BACKEND_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# API Routes
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'Backend is running'}), 200

@app.route('/api/config/google-maps-key', methods=['GET'])
def get_google_maps_key():
    """Serve Google Maps API key to frontend"""
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))
    api_key = os.getenv('GOOGLE_MAPS_API_KEY', 'AIzaSyBDxEU3dCG9y6g55Fn5PyPo_vI0MiDljM4')
    return jsonify({'key': api_key}), 200

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    hashed_password = hash_password(password)
    
    try:
        conn = get_backend_db()
        cursor = conn.cursor()
        # Create users table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('INSERT INTO users (email, password) VALUES (?, ?)', 
                      (email, hashed_password))
        conn.commit()
        conn.close()
        return jsonify({'message': 'User registered successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    hashed_password = hash_password(password)
    
    try:
        conn = get_backend_db()
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
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Trip API Routes (integrated from backend)
@app.route('/api/trips/user/<int:user_id>', methods=['GET'])
def get_user_trips(user_id):
    try:
        conn = get_backend_db()
        cursor = conn.cursor()
        trips = cursor.execute('SELECT * FROM trips WHERE user_id = ?', (user_id,)).fetchall()
        conn.close()
        return jsonify({
            'success': True,
            'trips': [dict(trip) for trip in trips]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/trips/save', methods=['POST'])
def save_trip():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        trip_name = data.get('name')  # Frontend sends 'name', not 'trip_name'
        trip_description = data.get('description', '')
        stops = data.get('stops', [])
        
        if not trip_name:
            return jsonify({'success': False, 'error': 'Trip name is required'}), 400
        
        conn = get_backend_db()
        cursor = conn.cursor()
        
        # Insert trip
        cursor.execute('''
            INSERT INTO trips (user_id, name, description, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ''', (user_id, trip_name, trip_description))
        
        trip_id = cursor.lastrowid
        
        # Insert stops
        for idx, stop in enumerate(stops):
            cursor.execute('''
                INSERT INTO stops (trip_id, latitude, longitude, stop_type, time_minutes, cost, stop_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (trip_id, stop.get('location', [0, 0])[0], stop.get('location', [0, 0])[1], 
                  stop.get('type', 'MISC'), 0, stop.get('cost', 0), idx))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'trip_id': trip_id,
            'message': 'Trip saved successfully'
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/trips/<int:trip_id>', methods=['GET'])
def get_trip(trip_id):
    try:
        conn = get_backend_db()
        cursor = conn.cursor()
        
        trip = cursor.execute('SELECT * FROM trips WHERE id = ?', (trip_id,)).fetchone()
        if not trip:
            return jsonify({'success': False, 'error': 'Trip not found'}), 404
        
        stops = cursor.execute('SELECT * FROM stops WHERE trip_id = ?', (trip_id,)).fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'trip': dict(trip),
            'stops': [dict(stop) for stop in stops]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/trips/<int:trip_id>', methods=['DELETE'])
def delete_trip(trip_id):
    try:
        conn = get_backend_db()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM stops WHERE trip_id = ?', (trip_id,))
        cursor.execute('DELETE FROM trips WHERE id = ?', (trip_id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Trip deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/stops/<int:stop_id>', methods=['DELETE'])
def delete_stop(stop_id):
    """Delete a single stop from a trip"""
    try:
        conn = get_backend_db()
        cursor = conn.cursor()
        
        # Get the trip_id before deleting
        stop = cursor.execute('SELECT trip_id, stop_order FROM stops WHERE id = ?', (stop_id,)).fetchone()
        if not stop:
            conn.close()
            return jsonify({'success': False, 'error': 'Stop not found'}), 404
        
        trip_id = stop['trip_id']
        deleted_order = stop['stop_order']
        
        # Delete the stop
        cursor.execute('DELETE FROM stops WHERE id = ?', (stop_id,))
        
        # Reorder remaining stops
        cursor.execute('''
            UPDATE stops 
            SET stop_order = stop_order - 1 
            WHERE trip_id = ? AND stop_order > ?
        ''', (trip_id, deleted_order))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Stop deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Maps API Routes (integrated from backend)
@app.route('/api/maps/directions', methods=['POST'])
def get_directions():
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        from services.maps_service import MapsService
        
        data = request.get_json()
        origin = data.get('origin')
        destination = data.get('destination')
        waypoints = data.get('waypoints', [])
        mode = data.get('mode', 'driving')
        
        print(f"DEBUG - Origin: {origin}")
        print(f"DEBUG - Destination: {destination}")
        print(f"DEBUG - Waypoints: {waypoints}")
        
        # Build waypoints list for googlemaps client
        waypoint_list = []
        if waypoints:
            for wp in waypoints:
                waypoint_list.append((wp.get('latitude'), wp.get('longitude')))
        
        # Get directions using MapsService
        directions = MapsService.get_directions(
            origin=(origin.get('latitude'), origin.get('longitude')),
            destination=(destination.get('latitude'), destination.get('longitude')),
            waypoints=waypoint_list,
            mode=mode
        )
        
        print(f"DEBUG - Directions result: {directions is not None}")
        
        if directions:
            return jsonify({
                'success': True,
                'directions': {
                    'polyline': directions.get('polyline'),
                    'total_distance': directions.get('total_distance'),
                    'total_duration': directions.get('total_duration')
                }
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Could not calculate directions'}), 400
    except Exception as e:
        print(f"Directions error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Budget API Routes (integrated from backend)
@app.route('/api/budget/calculate', methods=['POST'])
def calculate_budget():
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        from services.pricing_service import PricingService
        
        data = request.get_json()
        stops = data.get('stops', [])
        
        result_stops = []
        total_cost = 0
        
        for stop in stops:
            price = PricingService.calculate_stop_price(
                stop.get('location', [0, 0])[0],
                stop.get('location', [0, 0])[1],
                stop.get('type', 'MISC'),
                []
            )
            result_stops.append({
                'location': stop.get('location'),
                'type': stop.get('type'),
                'estimated_price': price
            })
            total_cost += price
        
        return jsonify({
            'success': True,
            'stops': result_stops,
            'total_cost': total_cost
        }), 200
    except Exception as e:
        print(f"Budget calculation error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/budget/default-price', methods=['GET'])
def get_default_prices():
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        from services.pricing_service import PricingService
        
        prices = {}
        for stop_type in ['FOOD', 'REST', 'FUEL', 'ENTERTAINMENT', 'MISC']:
            prices[stop_type] = PricingService.get_default_price(stop_type)
        
        return jsonify({
            'success': True,
            'default_prices': prices
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ ADMIN API ROUTES ============
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    # Define admin credentials (move to env in production!)
    ADMIN_EMAIL = 'admin@roadrunner.com'
    ADMIN_PASSWORD = 'admin123'
    
    if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
        return jsonify({
            'message': 'Admin login successful',
            'is_admin': True
        }), 200
    else:
        return jsonify({'error': 'Invalid admin credentials'}), 401

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    """Get all users with their trips for admin dashboard"""
    try:
        conn = get_backend_db()
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
                    'description': trip['description'] or '',
                    'image_url': trip['image_url'] if 'image_url' in trip.keys() else '',
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
        
        # Summary stats
        total_users = len(users_data)
        total_trips = sum(u['trip_count'] for u in users_data)
        total_stops = sum(len(t['stops']) for u in users_data for t in u['trips'])
        
        print(f"Admin Dashboard: {total_users} users, {total_trips} trips, {total_stops} stops")
        
        return jsonify({
            'users': users_data,
            'stats': {
                'total_users': total_users,
                'total_trips': total_trips,
                'total_stops': total_stops
            }
        }), 200
    except Exception as e:
        print(f"Admin users error: {e}")
        return jsonify({'error': str(e)}), 500

# Serve frontend
@app.route('/')
def index():
    return send_from_directory('frontend', 'login_page.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('frontend', path)

if __name__ == '__main__':
    init_db()
    print("\n✅ Integrated RoadRunner Server starting...")
    print("✅ Open your browser to: http://localhost:5001\n")
    app.run(host='0.0.0.0', port=5001, debug=True)
