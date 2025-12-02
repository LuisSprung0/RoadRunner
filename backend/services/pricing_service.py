# Pricing service - handles budget and price calculations
import googlemaps
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')

# Initialize Google Maps client if API key exists
gmaps = None
if GOOGLE_MAPS_API_KEY:
    try:
        gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
    except Exception as e:
        print(f"Warning: Could not initialize Google Maps client. Using fallback pricing. Error: {e}")
        gmaps = None

class PricingService:
    
    # Price mapping based on Places API price level (0-4)
    PRICE_MAP = {
        0: 0,       # Free
        1: 15,      # Inexpensive
        2: 25,      # Moderate
        3: 50,      # Expensive
        4: 100      # Very Expensive
    }
    
    # Stop type to Places search query mapping
    STOP_TYPE_QUERIES = {
        'FOOD': 'restaurant',
        'REST': 'hotel',
        'FUEL': 'gas_station',
        'ENTERTAINMENT': 'amusement_park',
        'MISC': 'point_of_interest'
    }
    
    @staticmethod
    def get_place_price_level(latitude, longitude, stop_type='MISC'):
        """
        Get price level for a place near coordinates
        Uses Places API to find nearby places and get price level
        
        Args:
            latitude: Latitude of the stop
            longitude: Longitude of the stop
            stop_type: Type of stop (FOOD, REST, FUEL, ENTERTAINMENT, MISC)
            
        Returns:
            Estimated price in dollars
        """
        if not gmaps:
            # Fall back to default pricing if API not available
            return PricingService.get_default_price(stop_type)
        
        try:
            # Get query type for this stop
            query_type = PricingService.STOP_TYPE_QUERIES.get(stop_type, 'point_of_interest')
            
            # Search for nearby places
            places_result = gmaps.places_nearby(
                location=(latitude, longitude),
                radius=1000,  # 1km radius
                type=query_type
            )
            
            if not places_result.get('results'):
                return PricingService.get_default_price(stop_type)
            
            # Get the first result's price level
            first_place = places_result['results'][0]
            place_id = first_place.get('place_id')
            
            # Get detailed place info including price_level
            if place_id:
                place_details = gmaps.place(
                    place_id,
                    fields=['price_level', 'name', 'rating']
                )
                
                price_level = place_details.get('result', {}).get('price_level')
                
                if price_level is not None:
                    return PricingService.PRICE_MAP.get(price_level, 
                                                       PricingService.get_default_price(stop_type))
            
            return PricingService.get_default_price(stop_type)
            
        except Exception as e:
            print(f"Error getting price level: {e}")
            return PricingService.get_default_price(stop_type)
    
    @staticmethod
    def get_default_price(stop_type):
        """
        Get default price for a stop type when API is not available
        
        Args:
            stop_type: Type of stop (FOOD, REST, FUEL, ENTERTAINMENT, MISC)
            
        Returns:
            Default estimated price in dollars
        """
        default_prices = {
            'FOOD': 20,           # Average meal
            'REST': 100,          # Average hotel night
            'FUEL': 60,           # Average gas fill-up
            'ENTERTAINMENT': 35,  # Average activity
            'MISC': 15            # Miscellaneous
        }
        
        return default_prices.get(stop_type, 15)
    
    @staticmethod
    def calculate_stop_price(latitude, longitude, stop_type='MISC', distance_km=0):
        """
        Calculate stop price based on location, type, and distance
        
        Args:
            latitude: Latitude of the stop
            longitude: Longitude of the stop
            stop_type: Type of stop (FOOD, REST, FUEL, ENTERTAINMENT, MISC)
            distance_km: Distance traveled to reach this stop (in kilometers)
            
        Returns:
            Estimated price in dollars
        """
        # Get base price from Places API or default
        base_price = PricingService.get_place_price_level(latitude, longitude, stop_type)
        
        # Add distance surcharge (more remote = more expensive)
        # Add $0.05 per km over 100km
        distance_surcharge = max(0, (distance_km - 100) * 0.05)
        
        total_price = base_price + distance_surcharge
        
        return round(total_price, 2)
    
    @staticmethod
    def calculate_trip_budget(stops_data, distances=None):
        """
        Calculate total trip budget from stops
        
        Args:
            stops_data: List of stop dictionaries with location and type
            distances: Optional list of distances for each stop
            
        Returns:
            Dictionary with total cost and breakdown by stop
        """
        if not stops_data:
            return {'total_cost': 0, 'stops': [], 'error': 'No stops provided'}
        
        total_cost = 0
        stops_breakdown = []
        
        for index, stop in enumerate(stops_data):
            latitude = stop.get('location')[0]
            longitude = stop.get('location')[1]
            stop_type = stop.get('type', 'MISC')
            distance = distances[index] if distances and index < len(distances) else 0
            
            # Calculate price for this stop
            stop_price = PricingService.calculate_stop_price(
                latitude, 
                longitude, 
                stop_type, 
                distance / 1000  # Convert meters to km
            )
            
            total_cost += stop_price
            
            stops_breakdown.append({
                'location': stop.get('location'),
                'type': stop_type,
                'estimated_price': stop_price,
                'index': index
            })
        
        return {
            'success': True,
            'total_cost': round(total_cost, 2),
            'stops': stops_breakdown,
            'currency': 'USD'
        }
