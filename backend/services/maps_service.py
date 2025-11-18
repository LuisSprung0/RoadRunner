# Maps service - handles Google Maps API integration
import os
from datetime import datetime
from dotenv import load_dotenv
import googlemaps

#loads in key from .env file to create gmaps client
load_dotenv()
GOOGLE_MAPS_API_KEY = os.getenv('SECRET_KEY')
if not GOOGLE_MAPS_API_KEY:
    raise ValueError("No GOOGLE_MAPS_API_KEY found")
gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)

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
    def get_directions(origin, destination, waypoints=[], mode='driving', departure_time=None):
        if departure_time is None:
            departure_time = datetime.now()
        directions_result = gmaps.directions(origin,
                                            destination,
                                            waypoints=waypoints,
                                            mode=mode,
                                            departure_time=departure_time)
        
        route = directions_result[0] if directions_result else None
        polyline = route['overview_polyline']['points'] if directions_result else None
        total_distance = sum(leg['distance']['value'] for leg in route['legs']) if route else 0
        total_duration = sum(leg['duration']['value'] for leg in route['legs'])

        return {'route': route, 
                'polyline': polyline, 
                'total_distance': total_distance, #in meters
                'total_duration': total_duration} #in seconds
    
if __name__ == "__main__":
    # Example usage
    address = "1600 Amphitheatre Parkway, Mountain View, CA"
    latlng = MapsService.geocode(address)
    print(f"Geocoded '{address}' to: {latlng}")

    if latlng:
        rev_address = MapsService.reverse_geocode(latlng[0], latlng[1])
        print(f"Reverse geocoded {latlng} to: '{rev_address}'")

    directions = MapsService.get_directions("New York, NY", "Los Angeles, CA")
    print(f"Directions from New York, NY to Los Angeles, CA: {directions['total_distance']} meters, {directions['total_duration']} seconds")