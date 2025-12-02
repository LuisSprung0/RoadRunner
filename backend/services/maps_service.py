# Maps service - handles Google Maps API integration
import os
from datetime import datetime
from dotenv import load_dotenv
import googlemaps

# Load .env from the backend directory (works regardless of where script is run from)
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(backend_dir, '.env')
load_dotenv(env_path)

GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
print(f"DEBUG - Maps service loading API key from: {env_path}")
print(f"DEBUG - API key found: {'Yes' if GOOGLE_MAPS_API_KEY else 'No'}")

if not GOOGLE_MAPS_API_KEY:
    raise ValueError("No GOOGLE_MAPS_API_KEY found in .env file")
try:
    gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
    print("DEBUG - Google Maps client initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize Google Maps client. Error: {e}")
    gmaps = None

class MapsService:
    @staticmethod
    def geocode(address):
        result = gmaps.geocode(address)
        if result:
            location = result[0]['geometry']['location']
            return [location['lat'], location['lng']]
        return None

    @staticmethod
    def reverse_geocode(latitude, longitude):
        result = gmaps.reverse_geocode((latitude, longitude))
        if result:
            return result[0]['formatted_address']
        return None

    @staticmethod
    def get_directions(origin, destination, waypoints=[], mode='driving'):
        directions_result = gmaps.directions(origin,
                                            destination,
                                            waypoints=waypoints,
                                            mode=mode)
        
        if not directions_result:
            return None
        
        route = directions_result[0]
        polyline = route['overview_polyline']['points']
        total_distance = sum(leg['distance']['value'] for leg in route['legs']) if route else 0
        total_duration = sum(leg['duration']['value'] for leg in route['legs']) if route else 0

        return {'route': route, 
                'polyline': polyline, 
                'total_distance': total_distance, #in meters
                'total_duration': total_duration} #in seconds
    
