import pytest
import json
import logging
from app.models import UserVehicle, User

logger = logging.getLogger(__name__)

class TestVehicleManagement:
    """Test suite for vehicle management APIs"""

    def test_get_empty_vehicles_list(self, client, auth_headers):
        """Test GET /user/vehicles returns empty list for new user"""
        logger.info("Testing GET /user/vehicles with no vehicles")
        
        response = client.get('/user/vehicles', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data'] == []

    def test_create_vehicle_success(self, client, auth_headers):
        """Test POST /user/vehicles creates vehicle successfully"""
        logger.info("Testing POST /user/vehicles with valid data")
        
        vehicle_data = {
            'registration_number': 'ABC123',
            'vehicle_name': 'My Car',
            'make': 'Toyota',
            'model': 'Camry',
            'year': 2020,
            'vehicle_type': 'car',
            'color': 'Blue'
        }
        
        response = client.post('/user/vehicles',
                             data=json.dumps(vehicle_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['registration_number'] == 'ABC123'
        assert data['data']['vehicle_name'] == 'My Car'
        assert data['data']['make'] == 'Toyota'
        assert data['data']['model'] == 'Camry'
        assert data['data']['year'] == 2020
        assert data['data']['vehicle_type'] == 'car'
        assert data['data']['color'] == 'Blue'
        assert data['data']['is_active'] is True
        assert 'vehicle_id' in data['data']

    def test_create_vehicle_minimal_data(self, client, auth_headers):
        """Test POST /user/vehicles with minimal required data"""
        logger.info("Testing POST /user/vehicles with minimal data")
        
        vehicle_data = {
            'registration_number': 'XYZ789',
            'vehicle_name': 'Basic Car'
        }
        
        response = client.post('/user/vehicles',
                             data=json.dumps(vehicle_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['registration_number'] == 'XYZ789'
        assert data['data']['vehicle_name'] == 'Basic Car'
        assert data['data']['vehicle_type'] == 'car'  # Default value

    def test_create_vehicle_duplicate_registration(self, client, auth_headers):
        """Test POST /user/vehicles prevents duplicate registration numbers"""
        logger.info("Testing duplicate registration prevention")
        
        vehicle_data = {
            'registration_number': 'DUP123',
            'vehicle_name': 'First Car'
        }
        
        # Create first vehicle
        response1 = client.post('/user/vehicles',
                              data=json.dumps(vehicle_data),
                              content_type='application/json',
                              headers=auth_headers)
        assert response1.status_code == 201
        
        # Try to create duplicate
        duplicate_data = {
            'registration_number': 'DUP123',
            'vehicle_name': 'Second Car'
        }
        
        response2 = client.post('/user/vehicles',
                              data=json.dumps(duplicate_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response2.status_code == 409
        data = json.loads(response2.data)
        assert data['success'] is False
        assert 'already registered' in data['error']

    def test_create_vehicle_validation_errors(self, client, auth_headers):
        """Test POST /user/vehicles validation errors"""
        logger.info("Testing vehicle creation validation")
        
        # Test missing registration number
        invalid_data = {
            'vehicle_name': 'Car without registration'
        }
        
        response = client.post('/user/vehicles',
                             data=json.dumps(invalid_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Validation failed' in data['error']

    def test_create_vehicle_invalid_year(self, client, auth_headers):
        """Test POST /user/vehicles with invalid year"""
        logger.info("Testing vehicle creation with invalid year")
        
        vehicle_data = {
            'registration_number': 'YEAR123',
            'vehicle_name': 'Future Car',
            'year': 2030  # Future year
        }
        
        response = client.post('/user/vehicles',
                             data=json.dumps(vehicle_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Validation failed' in data['error']

    def test_get_vehicles_after_creation(self, client, auth_headers):
        """Test GET /user/vehicles returns created vehicles"""
        logger.info("Testing GET /user/vehicles after creating vehicles")
        
        # Create two vehicles
        vehicle1 = {
            'registration_number': 'GET123',
            'vehicle_name': 'First Car'
        }
        vehicle2 = {
            'registration_number': 'GET456',
            'vehicle_name': 'Second Car'
        }
        
        client.post('/user/vehicles',
                   data=json.dumps(vehicle1),
                   content_type='application/json',
                   headers=auth_headers)
        
        client.post('/user/vehicles',
                   data=json.dumps(vehicle2),
                   content_type='application/json',
                   headers=auth_headers)
        
        # Get vehicles
        response = client.get('/user/vehicles', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 2
        
        # Check vehicles are ordered by creation date (newest first)
        registrations = [v['registration_number'] for v in data['data']]
        assert 'GET456' in registrations
        assert 'GET123' in registrations

    def test_update_vehicle_success(self, client, auth_headers):
        """Test PUT /user/vehicles/{id} updates vehicle successfully"""
        logger.info("Testing PUT /user/vehicles/{id}")
        
        # Create vehicle first
        vehicle_data = {
            'registration_number': 'UPD123',
            'vehicle_name': 'Original Car',
            'color': 'Blue'
        }
        
        create_response = client.post('/user/vehicles',
                                    data=json.dumps(vehicle_data),
                                    content_type='application/json',
                                    headers=auth_headers)
        
        vehicle_id = json.loads(create_response.data)['data']['vehicle_id']
        
        # Update vehicle
        update_data = {
            'vehicle_name': 'Updated Car',
            'color': 'Red',
            'make': 'Honda'
        }
        
        response = client.put(f'/user/vehicles/{vehicle_id}',
                            data=json.dumps(update_data),
                            content_type='application/json',
                            headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['vehicle_name'] == 'Updated Car'
        assert data['data']['color'] == 'Red'
        assert data['data']['make'] == 'Honda'
        assert data['data']['registration_number'] == 'UPD123'  # Should not change

    def test_update_nonexistent_vehicle(self, client, auth_headers):
        """Test PUT /user/vehicles/{id} with non-existent vehicle"""
        logger.info("Testing PUT /user/vehicles/{id} with non-existent vehicle")
        
        update_data = {
            'vehicle_name': 'Non-existent Car'
        }
        
        response = client.put('/user/vehicles/999',
                            data=json.dumps(update_data),
                            content_type='application/json',
                            headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'not found' in data['error']

    def test_delete_vehicle_success(self, client, auth_headers):
        """Test DELETE /user/vehicles/{id} soft deletes vehicle"""
        logger.info("Testing DELETE /user/vehicles/{id}")
        
        # Create vehicle first
        vehicle_data = {
            'registration_number': 'DEL123',
            'vehicle_name': 'To Delete Car'
        }
        
        create_response = client.post('/user/vehicles',
                                    data=json.dumps(vehicle_data),
                                    content_type='application/json',
                                    headers=auth_headers)
        
        vehicle_id = json.loads(create_response.data)['data']['vehicle_id']
        
        # Delete vehicle
        response = client.delete(f'/user/vehicles/{vehicle_id}',
                               headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'deleted successfully' in data['message']
        
        # Verify vehicle is not returned in GET request
        get_response = client.get('/user/vehicles', headers=auth_headers)
        get_data = json.loads(get_response.data)
        vehicle_ids = [v['vehicle_id'] for v in get_data['data']]
        assert vehicle_id not in vehicle_ids

    def test_delete_nonexistent_vehicle(self, client, auth_headers):
        """Test DELETE /user/vehicles/{id} with non-existent vehicle"""
        logger.info("Testing DELETE /user/vehicles/{id} with non-existent vehicle")
        
        response = client.delete('/user/vehicles/999',
                               headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'not found' in data['error']

    def test_unauthorized_access(self, client):
        """Test vehicle endpoints without authentication"""
        logger.info("Testing unauthorized access to vehicle endpoints")
        
        # Test GET without auth
        response = client.get('/user/vehicles')
        assert response.status_code == 401
        
        # Test POST without auth
        vehicle_data = {
            'registration_number': 'UNAUTH123',
            'vehicle_name': 'Unauthorized Car'
        }
        response = client.post('/user/vehicles',
                             data=json.dumps(vehicle_data),
                             content_type='application/json')
        assert response.status_code == 401
        
        # Test PUT without auth
        response = client.put('/user/vehicles/1',
                            data=json.dumps({'vehicle_name': 'Updated'}),
                            content_type='application/json')
        assert response.status_code == 401
        
        # Test DELETE without auth
        response = client.delete('/user/vehicles/1')
        assert response.status_code == 401

    def test_registration_number_normalization(self, client, auth_headers):
        """Test registration number is normalized (uppercase, no spaces)"""
        logger.info("Testing registration number normalization")
        
        vehicle_data = {
            'registration_number': 'abc 123',  # lowercase with space
            'vehicle_name': 'Normalized Car'
        }
        
        response = client.post('/user/vehicles',
                             data=json.dumps(vehicle_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['registration_number'] == 'ABC123'

    def test_vehicle_type_validation(self, client, auth_headers):
        """Test vehicle type validation"""
        logger.info("Testing vehicle type validation")
        
        # Test valid vehicle type
        vehicle_data = {
            'registration_number': 'TYPE123',
            'vehicle_name': 'Motorcycle',
            'vehicle_type': 'motorcycle'
        }
        
        response = client.post('/user/vehicles',
                             data=json.dumps(vehicle_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['vehicle_type'] == 'motorcycle'

    def test_empty_request_body(self, client, auth_headers):
        """Test endpoints with empty request body"""
        logger.info("Testing empty request body")
        
        response = client.post('/user/vehicles',
                             data=json.dumps({}),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'No data provided' in data['error']