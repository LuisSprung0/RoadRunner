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
    
if __name__ == "__main__":
    # Example usage
    address = "1600 Amphitheatre Parkway, Mountain View, CA"
    latlng = MapsService.geocode(address)
    print(f"Geocoded '{address}' to: {latlng}")

    if latlng:
        rev_address = MapsService.reverse_geocode(latlng[0], latlng[1])
        print(f"Reverse geocoded {latlng} to: '{rev_address}'")

    directions = MapsService.get_directions("New York, NY", "Los Angeles, CA")
    if directions is None:
        print("Directions result: None (as expected for unreachable points)")
    else:
        print(f"Directions from New York, NY to Los Angeles, CA: {directions['total_distance']} meters, {directions['total_duration']} seconds")

    directions = MapsService.get_directions( #unreachable ocean points for testing
        [31.0456, -67.6765],  #Ocean
        [31.8404, -67.3313]  #Ocean
    )
    if directions is None:
        print("Directions result: None (as expected for unreachable points)")
    else:
        print(f"Directions from Ocean Point A to Ocean Point B: {directions['total_distance']} meters, {directions['total_duration']} seconds")