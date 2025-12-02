# Trip routes - handles trip creation, retrieval, updates, and deletion
from flask import request, jsonify, Blueprint
from services.trip_service import TripService

trips_bp = Blueprint('trips', __name__, url_prefix='/api/trips')

@trips_bp.route('/save', methods=['POST'])
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
        
        if not stops_data:
            return jsonify({'error': 'At least one stop is required'}), 400
        
        result = TripService.create_trip(user_id, name, description, image_url, stops_data)
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trips_bp.route('/<int:trip_id>', methods=['GET'])
def get_trip(trip_id):
    """Get a specific trip by ID"""
    try:
        result = TripService.get_trip(trip_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trips_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_trips(user_id):
    """Get all trips for a specific user"""
    try:
        result = TripService.get_user_trips(user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trips_bp.route('/<int:trip_id>', methods=['PUT'])
def update_trip(trip_id):
    """Update trip details"""
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')
        image_url = data.get('image_url')
        
        result = TripService.update_trip(trip_id, name, description, image_url)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trips_bp.route('/<int:trip_id>', methods=['DELETE'])
def delete_trip(trip_id):
    """Delete a trip"""
    try:
        result = TripService.delete_trip(trip_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500