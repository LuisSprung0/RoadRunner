# Budget routes - handles budget and pricing calculations
from flask import request, jsonify, Blueprint
from services.pricing_service import PricingService

budget_bp = Blueprint('budget', __name__, url_prefix='/api/budget')

@budget_bp.route('/calculate', methods=['POST'])
def calculate_budget():
    """Calculate trip budget from stops"""
    try:
        data = request.get_json()
        stops_data = data.get('stops', [])
        distances = data.get('distances')  # Optional: distance to each stop in meters
        
        if not stops_data:
            return jsonify({'error': 'No stops provided'}), 400
        
        result = PricingService.calculate_trip_budget(stops_data, distances)
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify({'error': result.get('error', 'Failed to calculate budget')}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@budget_bp.route('/stop-price', methods=['POST'])
def get_stop_price():
    """Get estimated price for a single stop"""
    try:
        data = request.get_json()
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        stop_type = data.get('type', 'MISC')
        distance_km = data.get('distance_km', 0)
        
        if latitude is None or longitude is None:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        price = PricingService.calculate_stop_price(
            latitude, 
            longitude, 
            stop_type, 
            distance_km
        )
        
        return jsonify({
            'success': True,
            'estimated_price': price,
            'stop_type': stop_type,
            'location': [latitude, longitude],
            'currency': 'USD'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@budget_bp.route('/default-price', methods=['GET'])
def get_default_price():
    """Get default prices for all stop types"""
    try:
        stop_types = ['FOOD', 'REST', 'FUEL', 'ENTERTAINMENT', 'MISC']
        prices = {}
        
        for stop_type in stop_types:
            prices[stop_type] = PricingService.get_default_price(stop_type)
        
        return jsonify({
            'success': True,
            'default_prices': prices,
            'currency': 'USD'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
