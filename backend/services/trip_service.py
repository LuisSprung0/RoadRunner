# Trip service - business logic for trip operations
import sqlite3
from models.trip import Trip
from models.stop import Stop, StopType
from datetime import datetime

class TripService:
    
    @staticmethod
    def create_trip(user_id, name, description, image_url, stops_data):
        """Create and save a new trip"""
        try:
            trip = Trip(user_id=user_id, name=name, description=description, image_url=image_url)
            
            for stop_data in stops_data:
                location = stop_data.get('location')
                stop_type = StopType[stop_data.get('type', 'MISC').upper()]
                time = stop_data.get('time', 0)
                cost = stop_data.get('cost', 0)
                
                stop = Stop(location=location, stop_type=stop_type, time=time, cost=cost)
                trip.add_stop(stop)
            
            trip.save_to_db()
            return {'success': True, 'trip_id': trip.trip_id, 'trip': trip.to_dict()}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def get_trip(trip_id):
        """Fetch a trip by ID"""
        try:
            conn = sqlite3.connect('database.db')
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get trip
            cursor.execute('SELECT * FROM trips WHERE id = ?', (trip_id,))
            trip_row = cursor.fetchone()
            
            if not trip_row:
                return {'success': False, 'error': 'Trip not found'}
            
            # Get stops for this trip
            cursor.execute('SELECT * FROM stops WHERE trip_id = ? ORDER BY stop_order', (trip_id,))
            stops_rows = cursor.fetchall()
            
            conn.close()
            
            # Build trip object
            trip = Trip(
                user_id=trip_row['user_id'],
                trip_id=trip_row['id'],
                name=trip_row['name'],
                description=trip_row['description'],
                image_url=trip_row['image_url']
            )
            trip.created_at = trip_row['created_at']
            
            # Add stops
            for stop_row in stops_rows:
                stop = Stop(
                    location=[stop_row['latitude'], stop_row['longitude']],
                    stop_type=StopType[stop_row['stop_type']],
                    time=stop_row['time_minutes'],
                    cost=stop_row['cost']
                )
                trip.add_stop(stop)
            
            return {'success': True, 'trip': trip.to_dict()}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def get_user_trips(user_id):
        """Fetch all trips for a user"""
        try:
            conn = sqlite3.connect('database.db')
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC', (user_id,))
            trips_rows = cursor.fetchall()
            conn.close()
            
            trips = []
            for trip_row in trips_rows:
                trip = Trip(
                    user_id=trip_row['user_id'],
                    trip_id=trip_row['id'],
                    name=trip_row['name'],
                    description=trip_row['description'],
                    image_url=trip_row['image_url']
                )
                trip.created_at = trip_row['created_at']
                trips.append(trip.to_dict())
            
            return {'success': True, 'trips': trips}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def update_trip(trip_id, name=None, description=None, image_url=None):
        """Update trip details"""
        try:
            conn = sqlite3.connect('database.db')
            cursor = conn.cursor()
            
            updates = []
            params = []
            
            if name is not None:
                updates.append('name = ?')
                params.append(name)
            if description is not None:
                updates.append('description = ?')
                params.append(description)
            if image_url is not None:
                updates.append('image_url = ?')
                params.append(image_url)
            
            if not updates:
                conn.close()
                return {'success': False, 'error': 'No fields to update'}
            
            params.append(trip_id)
            query = f"UPDATE trips SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(query, params)
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Trip updated successfully'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def delete_trip(trip_id):
        """Delete a trip and its stops"""
        try:
            conn = sqlite3.connect('database.db')
            cursor = conn.cursor()
            
            # Delete stops first
            cursor.execute('DELETE FROM stops WHERE trip_id = ?', (trip_id,))
            # Delete trip
            cursor.execute('DELETE FROM trips WHERE id = ?', (trip_id,))
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Trip deleted successfully'}
        except Exception as e:
            return {'success': False, 'error': str(e)}