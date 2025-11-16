# Trip model - defines trip data structure and methods
import sqlite3
from datetime import datetime

class Trip:
    def __init__(self, user_id=None, trip_id=None, name="Unnamed Trip", description="No description", image_url=""):
        self.trip_id = trip_id
        self.user_id = user_id
        self.stops = []
        self.name = name
        self.description = description
        self.image_url = image_url
        self.created_at = None

    def add_stop(self, stop):
        self.stops.append(stop)

    def delete_stop(self, index):
        if 0 <= index < len(self.stops):
            del self.stops[index]

    def get_stops(self):
        return self.stops
    
    def get_stop(self, index):
        if 0 <= index < len(self.stops):
            return self.stops[index]

    def get_name(self):
        return self.name
    
    def set_name(self, name):
        self.name = name

    def get_description(self):
        return self.description
    
    def set_description(self, description):
        self.description = description

    def get_image_url(self):
        return self.image_url
    
    def set_image_url(self, image_url):
        self.image_url = image_url

    def total_stops(self):
        return len(self.stops)
    
    def total_time(self):
        total = 0
        for stop in self.stops:
            total += stop.get_time()
        return total

    def total_cost(self):
        total = 0
        for stop in self.stops:
            total += stop.get_cost()
        return total
    
    def sum_time(self):
        pass

    def to_dict(self):
        trip_dict = {
            'trip_id': self.trip_id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'image_url': self.image_url,
            'created_at': self.created_at,
            'stops': [stop.to_dict() for stop in self.stops]
        }
        return trip_dict

    def save_to_db(self):
        """Save trip and all its stops to database"""
        try:
            conn = sqlite3.connect('database.db')
            cursor = conn.cursor()
            
            # Insert trip
            cursor.execute('''
                INSERT INTO trips (user_id, name, description, image_url)
                VALUES (?, ?, ?, ?)
            ''', (self.user_id, self.name, self.description, self.image_url))
            
            trip_id = cursor.lastrowid
            self.trip_id = trip_id
            
            # Insert all stops
            for index, stop in enumerate(self.stops):
                cursor.execute('''
                    INSERT INTO stops (trip_id, latitude, longitude, stop_type, time_minutes, cost, stop_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (trip_id, stop.location[0], stop.location[1], stop.type.name, 
                      stop.time, stop.cost, index))
            
            conn.commit()
            conn.close()
            return {'success': True, 'trip_id': trip_id}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def get_from_db(trip_id):
        """Get a specific trip by ID"""
        try:
            conn = sqlite3.connect('database.db')
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get trip
            trip_row = cursor.execute('SELECT * FROM trips WHERE id = ?', (trip_id,)).fetchone()
            if not trip_row:
                return None
            
            trip = Trip(
                user_id=trip_row['user_id'],
                trip_id=trip_row['id'],
                name=trip_row['name'],
                description=trip_row['description'],
                image_url=trip_row['image_url']
            )
            trip.created_at = trip_row['created_at']
            
            # Get stops for this trip
            stops_rows = cursor.execute(
                'SELECT * FROM stops WHERE trip_id = ? ORDER BY stop_order', 
                (trip_id,)
            ).fetchall()
            
            for stop_row in stops_rows:
                # Import Stop here to avoid circular imports
                from models.stop import Stop, StopType
                stop = Stop(
                    location=(stop_row['latitude'], stop_row['longitude']),
                    type=StopType[stop_row['stop_type']],
                    time=stop_row['time_minutes'],
                    cost=stop_row['cost']
                )
                trip.add_stop(stop)
            
            conn.close()
            return trip
        except Exception as e:
            print(f"Error getting trip from DB: {e}")
            return None

    @staticmethod
    def get_user_trips(user_id):
        """Get all trips for a specific user"""
        try:
            conn = sqlite3.connect('database.db')
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            trips_rows = cursor.execute(
                'SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC', 
                (user_id,)
            ).fetchall()
            
            trips = []
            for trip_row in trips_rows:
                trip = Trip.get_from_db(trip_row['id'])
                if trip:
                    trips.append(trip)
            
            conn.close()
            return trips
        except Exception as e:
            print(f"Error getting user trips: {e}")
            return []
