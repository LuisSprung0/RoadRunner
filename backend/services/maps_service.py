# Maps service - handles Google Maps API integration
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')

gmaps = None
if GOOGLE_MAPS_API_KEY and GOOGLE_MAPS_API_KEY != 'your-api-key-here':
    try:
        import googlemaps
        gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
    except Exception as e:
        print(f"Warning: Could not initialize Google Maps: {e}")

class MapsService:
    @staticmethod
    def geocode(address):
        if not gmaps:
            return None
        result = gmaps.geocode(address)
        if result:
            location = result[0]['geometry']['location']
            return [location['lat'], location['lng']]
        return None

    @staticmethod
    def reverse_geocode(latitude, longitude):
        if not gmaps:
            return None
        result = gmaps.reverse_geocode((latitude, longitude))
        if result:
            return result[0]['formatted_address']
        return None

    @staticmethod
    def get_directions(origin, destination, waypoints=[], mode='driving'):
        if not gmaps:
            return None
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
                'total_distance': total_distance,
                'total_duration': total_duration}
    
