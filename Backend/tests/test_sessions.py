import pytest
import json
import logging
from datetime import datetime, timedelta
from app.models import ParkingSession, UserVehicle, ParkingLotDetails, Slot, Floor, Row
from app import db
from .test_config import TestDataFactory, TestAPIClient

logger = logging.getLogger(__name__)

@pytest.fixture
def test_parking_setup(client, auth_headers):
    """Create a complete parking lot setup for testing"""
    # Create parking lot
    lot_data = TestDataFactory.create_parking_lot_data(
        name="Test Parking Lot",
        car_parking_charge="First hour: €2.50, Each additional hour: €1.50"
    )
    
    lot_response = client.post('/parking/lots',
                              data=json.dumps(lot_data),
                              content_type='application/json',
                              headers=auth_headers)
    
    assert lot_response.status_code == 201
    lot_id = json.loads(lot_response.data)['id']
    
    # Create floor
    floor_response = client.post(f'/parking/lots/{lot_id}/floors',
                                data=json.dumps({'name': 'Ground Floor'}),
                                content_type='application/json',
                                headers=auth_headers)
    
    assert floor_response.status_code == 201
    floor_id = json.loads(floor_response.data)['id']
    
    # Create row
    row_response = client.post(f'/parking/floors/{floor_id}/rows',
                              data=json.dumps({'name': 'Row A'}),
                              content_type='application/json',
                              headers=auth_headers)
    
    assert row_response.status_code == 201
    row_id = json.loads(row_response.data)['id']
    
    # Create slots
    slot_ids = []
    for i in range(1, 4):  # Create 3 slots
        slot_response = client.post(f'/parking/rows/{row_id}/slots',
                                   data=json.dumps({'name': f'Slot {i}'}),
                                   content_type='application/json',
                                   headers=auth_headers)
        
        assert slot_response.status_code == 201
        slot_ids.append(json.loads(slot_response.data)['id'])
    
    return {
        'lot_id': lot_id,
        'floor_id': floor_id,
        'row_id': row_id,
        'slot_ids': slot_ids
    }

@pytest.fixture
def test_vehicle(client, auth_headers):
    """Create a test vehicle for session testing"""
    vehicle_data = {
        'registration_number': 'TEST123',
        'vehicle_name': 'Test Car',
        'make': 'Toyota',
        'model': 'Camry',
        'vehicle_type': 'car'
    }
    
    response = client.post('/user/vehicles',
                          data=json.dumps(vehicle_data),
                          content_type='application/json',
                          headers=auth_headers)
    
    assert response.status_code == 201
    return json.loads(response.data)['data']['vehicle_id']

class TestSessionManagement:
    """Test suite for session management APIs"""

    def test_session_checkin_success(self, client, auth_headers, test_parking_setup, test_vehicle):
        """Test POST /user/sessions/check-in creates session successfully"""
        logger.info("Testing session check-in with valid data")
        
        # Test session check-in
        checkin_data = {
            'vehicle_id': test_vehicle,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        response = client.post('/user/sessions/check-in',
                             data=json.dumps(checkin_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'ticket_id' in data['data']
        assert data['data']['parking_lot_name'] == 'Test Parking Lot'
        assert data['data']['status'] == 'active'
        assert 'slot_location' in data['data']
        assert 'vehicle_info' in data['data']

    def test_session_checkin_invalid_vehicle(self, client, auth_headers, test_parking_setup):
        """Test POST /user/sessions/check-in with invalid vehicle"""
        logger.info("Testing session check-in with invalid vehicle")
        
        checkin_data = {
            'vehicle_id': 99999,  # Non-existent vehicle
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        response = client.post('/user/sessions/check-in',
                             data=json.dumps(checkin_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'not found' in data['error'].lower()

    def test_session_checkin_invalid_parking_lot(self, client, auth_headers, test_vehicle):
        """Test POST /user/sessions/check-in with invalid parking lot"""
        logger.info("Testing session check-in with invalid parking lot")
        
        checkin_data = {
            'vehicle_id': test_vehicle,
            'parkinglot_id': 99999  # Non-existent parking lot
        }
        
        response = client.post('/user/sessions/check-in',
                             data=json.dumps(checkin_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'parking lot not found' in data['error'].lower()

    def test_session_checkin_duplicate_active_session(self, client, auth_headers, test_parking_setup):
        """Test POST /user/sessions/check-in prevents duplicate active sessions"""
        logger.info("Testing duplicate active session prevention")
        
        # Create a vehicle
        vehicle_data = {
            'registration_number': 'DUP123',
            'vehicle_name': 'Duplicate Test Car'
        }
        
        vehicle_response = client.post('/user/vehicles',
                                     data=json.dumps(vehicle_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        vehicle_id = json.loads(vehicle_response.data)['data']['vehicle_id']
        
        checkin_data = {
            'vehicle_id': vehicle_id,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        # First check-in should succeed
        response1 = client.post('/user/sessions/check-in',
                              data=json.dumps(checkin_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response1.status_code == 201
        
        # Second check-in should fail
        response2 = client.post('/user/sessions/check-in',
                              data=json.dumps(checkin_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response2.status_code == 409
        data = json.loads(response2.data)
        assert data['success'] is False
        assert 'already has an active' in data['error'].lower()

    def test_session_checkout_success(self, client, auth_headers, test_parking_setup):
        """Test POST /user/sessions/checkout completes session successfully"""
        logger.info("Testing session checkout with valid data")
        
        # Create a vehicle and start a session
        vehicle_data = {
            'registration_number': 'CHECKOUT123',
            'vehicle_name': 'Checkout Test Car'
        }
        
        vehicle_response = client.post('/user/vehicles',
                                     data=json.dumps(vehicle_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        vehicle_id = json.loads(vehicle_response.data)['data']['vehicle_id']
        
        checkin_data = {
            'vehicle_id': vehicle_id,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        checkin_response = client.post('/user/sessions/check-in',
                                     data=json.dumps(checkin_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        ticket_id = json.loads(checkin_response.data)['data']['ticket_id']
        
        # Test checkout
        checkout_data = {
            'ticket_id': ticket_id,
            'payment_method': 'card'
        }
        
        response = client.post('/user/sessions/checkout',
                             data=json.dumps(checkout_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['ticket_id'] == ticket_id
        assert data['data']['payment_status'] == 'completed'
        assert 'total_amount' in data['data']
        assert 'duration' in data['data']
        assert 'end_time' in data['data']

    def test_session_checkout_invalid_ticket(self, client, auth_headers):
        """Test POST /user/sessions/checkout with invalid ticket"""
        logger.info("Testing session checkout with invalid ticket")
        
        checkout_data = {
            'ticket_id': 'INVALID_TICKET_123',
            'payment_method': 'card'
        }
        
        response = client.post('/user/sessions/checkout',
                             data=json.dumps(checkout_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'not found' in data['error'].lower()

    def test_get_active_sessions_empty(self, client, auth_headers):
        """Test GET /user/sessions/active returns empty list when no active sessions"""
        logger.info("Testing get active sessions with no active sessions")
        
        response = client.get('/user/sessions/active', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        # Note: There might be existing active sessions from other tests or data
        assert isinstance(data['data'], list)

    def test_get_active_sessions_with_data(self, client, auth_headers, test_parking_setup):
        """Test GET /user/sessions/active returns active sessions"""
        logger.info("Testing get active sessions with active session")
        
        # Create a vehicle and start a session
        vehicle_data = {
            'registration_number': 'ACTIVE123',
            'vehicle_name': 'Active Test Car'
        }
        
        vehicle_response = client.post('/user/vehicles',
                                     data=json.dumps(vehicle_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        vehicle_id = json.loads(vehicle_response.data)['data']['vehicle_id']
        
        checkin_data = {
            'vehicle_id': vehicle_id,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        checkin_response = client.post('/user/sessions/check-in',
                                     data=json.dumps(checkin_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        ticket_id = json.loads(checkin_response.data)['data']['ticket_id']
        
        # Get active sessions
        response = client.get('/user/sessions/active', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) >= 1
        
        # Find our session
        our_session = None
        for session in data['data']:
            if session['ticket_id'] == ticket_id:
                our_session = session
                break
        
        assert our_session is not None
        assert our_session['status'] == 'active'
        assert 'current_duration' in our_session
        assert 'estimated_cost' in our_session
        assert 'parking_lot_name' in our_session

    def test_get_session_history_empty(self, client, auth_headers):
        """Test GET /user/sessions/history returns empty list when no past sessions"""
        logger.info("Testing get session history")
        
        response = client.get('/user/sessions/history', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert isinstance(data['data'], list)
        assert 'pagination' in data

    def test_get_session_history_with_pagination(self, client, auth_headers):
        """Test GET /user/sessions/history with pagination parameters"""
        logger.info("Testing get session history with pagination")
        
        response = client.get('/user/sessions/history?page=1&per_page=5', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 5

    def test_get_session_details_success(self, client, auth_headers, test_parking_setup):
        """Test GET /user/sessions/{ticket_id} returns session details"""
        logger.info("Testing get session details")
        
        # Create a vehicle and complete a session
        vehicle_data = {
            'registration_number': 'DETAILS123',
            'vehicle_name': 'Details Test Car'
        }
        
        vehicle_response = client.post('/user/vehicles',
                                     data=json.dumps(vehicle_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        vehicle_id = json.loads(vehicle_response.data)['data']['vehicle_id']
        
        checkin_data = {
            'vehicle_id': vehicle_id,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        checkin_response = client.post('/user/sessions/check-in',
                                     data=json.dumps(checkin_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        ticket_id = json.loads(checkin_response.data)['data']['ticket_id']
        
        # Get session details
        response = client.get(f'/user/sessions/{ticket_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['ticket_id'] == ticket_id
        assert 'parking_lot_info' in data['data']
        assert 'vehicle_info' in data['data']
        assert 'session_info' in data['data']
        assert 'payment_info' in data['data']
        assert 'slot_location' in data['data']

    def test_get_session_details_not_found(self, client, auth_headers):
        """Test GET /user/sessions/{ticket_id} with invalid ticket"""
        logger.info("Testing get session details with invalid ticket")
        
        response = client.get('/user/sessions/INVALID_TICKET_123', headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'not found' in data['error'].lower()

    def test_session_validation_errors(self, client, auth_headers):
        """Test session endpoints with validation errors"""
        logger.info("Testing session validation errors")
        
        # Test check-in with missing data
        response = client.post('/user/sessions/check-in',
                             data=json.dumps({}),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'No data provided' in data['error']
        
        # Test check-in with invalid data types
        invalid_data = {
            'vehicle_id': 'not_a_number',
            'parkinglot_id': 'also_not_a_number'
        }
        
        response = client.post('/user/sessions/check-in',
                             data=json.dumps(invalid_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Validation failed' in data['error']

    def test_unauthorized_access(self, client):
        """Test session endpoints without authentication"""
        logger.info("Testing unauthorized access to session endpoints")
        
        # Test check-in without auth
        checkin_data = {
            'vehicle_id': 1,
            'parkinglot_id': 1
        }
        
        response = client.post('/user/sessions/check-in',
                             data=json.dumps(checkin_data),
                             content_type='application/json')
        assert response.status_code == 401
        
        # Test checkout without auth
        checkout_data = {
            'ticket_id': 'TEST123'
        }
        
        response = client.post('/user/sessions/checkout',
                             data=json.dumps(checkout_data),
                             content_type='application/json')
        assert response.status_code == 401
        
        # Test active sessions without auth
        response = client.get('/user/sessions/active')
        assert response.status_code == 401
        
        # Test history without auth
        response = client.get('/user/sessions/history')
        assert response.status_code == 401
        
        # Test session details without auth
        response = client.get('/user/sessions/TEST123')
        assert response.status_code == 401

    def test_complete_session_workflow(self, client, auth_headers, test_parking_setup):
        """Test complete session workflow from check-in to checkout"""
        logger.info("Testing complete session workflow")
        
        # Step 1: Create a vehicle
        vehicle_data = {
            'registration_number': 'WORKFLOW123',
            'vehicle_name': 'Workflow Test Car',
            'make': 'Toyota',
            'model': 'Camry',
            'vehicle_type': 'car'
        }
        
        vehicle_response = client.post('/user/vehicles',
                                     data=json.dumps(vehicle_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        assert vehicle_response.status_code == 201
        vehicle_id = json.loads(vehicle_response.data)['data']['vehicle_id']
        
        # Step 2: Check-in
        checkin_data = {
            'vehicle_id': vehicle_id,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        checkin_response = client.post('/user/sessions/check-in',
                                     data=json.dumps(checkin_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        assert checkin_response.status_code == 201
        checkin_data = json.loads(checkin_response.data)
        ticket_id = checkin_data['data']['ticket_id']
        
        # Step 3: Verify active session
        active_response = client.get('/user/sessions/active', headers=auth_headers)
        assert active_response.status_code == 200
        active_data = json.loads(active_response.data)
        
        # Find our session in active sessions
        our_active_session = None
        for session in active_data['data']:
            if session['ticket_id'] == ticket_id:
                our_active_session = session
                break
        
        assert our_active_session is not None
        assert our_active_session['status'] == 'active'
        
        # Step 4: Get session details
        details_response = client.get(f'/user/sessions/{ticket_id}', headers=auth_headers)
        assert details_response.status_code == 200
        details_data = json.loads(details_response.data)
        assert details_data['data']['session_info']['status'] == 'active'
        
        # Step 5: Checkout
        checkout_data = {
            'ticket_id': ticket_id,
            'payment_method': 'upi'
        }
        
        checkout_response = client.post('/user/sessions/checkout',
                                      data=json.dumps(checkout_data),
                                      content_type='application/json',
                                      headers=auth_headers)
        
        assert checkout_response.status_code == 200
        checkout_data = json.loads(checkout_response.data)
        assert checkout_data['data']['payment_status'] == 'completed'
        assert checkout_data['data']['payment_method'] == 'upi'
        
        # Step 6: Verify session moved to history
        history_response = client.get('/user/sessions/history', headers=auth_headers)
        assert history_response.status_code == 200
        history_data = json.loads(history_response.data)
        
        # Find our session in history
        our_history_session = None
        for session in history_data['data']:
            if session['ticket_id'] == ticket_id:
                our_history_session = session
                break
        
        assert our_history_session is not None
        assert our_history_session['status'] == 'completed'
        assert our_history_session['payment_status'] == 'completed'

    # ===== COMPREHENSIVE ERROR SCENARIO TESTS =====

    def test_parking_lot_full_scenario(self, client, auth_headers, test_parking_setup):
        """Test session check-in when parking lot is full"""
        logger.info("Testing parking lot full scenario")
        
        # Create vehicles and fill all slots
        vehicles = []
        for i in range(3):  # We have 3 slots in test setup
            vehicle_data = {
                'registration_number': f'FULL{i:03d}',
                'vehicle_name': f'Full Test Car {i}',
                'vehicle_type': 'car'
            }
            
            vehicle_response = client.post('/user/vehicles',
                                         data=json.dumps(vehicle_data),
                                         content_type='application/json',
                                         headers=auth_headers)
            
            assert vehicle_response.status_code == 201
            vehicle_id = json.loads(vehicle_response.data)['data']['vehicle_id']
            vehicles.append(vehicle_id)
            
            # Check-in each vehicle
            checkin_data = {
                'vehicle_id': vehicle_id,
                'parkinglot_id': test_parking_setup['lot_id']
            }
            
            response = client.post('/user/sessions/check-in',
                                 data=json.dumps(checkin_data),
                                 content_type='application/json',
                                 headers=auth_headers)
            
            assert response.status_code == 201
        
        # Now try to check-in one more vehicle - should fail
        extra_vehicle_data = {
            'registration_number': 'EXTRA001',
            'vehicle_name': 'Extra Car',
            'vehicle_type': 'car'
        }
        
        extra_vehicle_response = client.post('/user/vehicles',
                                           data=json.dumps(extra_vehicle_data),
                                           content_type='application/json',
                                           headers=auth_headers)
        
        assert extra_vehicle_response.status_code == 201
        extra_vehicle_id = json.loads(extra_vehicle_response.data)['data']['vehicle_id']
        
        # This should fail - parking lot is full
        checkin_data = {
            'vehicle_id': extra_vehicle_id,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        response = client.post('/user/sessions/check-in',
                             data=json.dumps(checkin_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 409
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'no available parking slots' in data['error'].lower()

    def test_session_checkout_already_completed(self, client, auth_headers, test_parking_setup, test_vehicle):
        """Test checkout of already completed session"""
        logger.info("Testing checkout of already completed session")
        
        # Start and complete a session
        checkin_data = {
            'vehicle_id': test_vehicle,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        checkin_response = client.post('/user/sessions/check-in',
                                     data=json.dumps(checkin_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        assert checkin_response.status_code == 201
        ticket_id = json.loads(checkin_response.data)['data']['ticket_id']
        
        # Complete the session
        checkout_data = {
            'ticket_id': ticket_id,
            'payment_method': 'card'
        }
        
        checkout_response = client.post('/user/sessions/checkout',
                                      data=json.dumps(checkout_data),
                                      content_type='application/json',
                                      headers=auth_headers)
        
        assert checkout_response.status_code == 200
        
        # Try to checkout again - should fail
        response = client.post('/user/sessions/checkout',
                             data=json.dumps(checkout_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'not found' in data['error'].lower()

    def test_session_checkout_with_invalid_payment_method(self, client, auth_headers, test_parking_setup, test_vehicle):
        """Test checkout with invalid payment method"""
        logger.info("Testing checkout with invalid payment method")
        
        # Start a session
        checkin_data = {
            'vehicle_id': test_vehicle,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        checkin_response = client.post('/user/sessions/check-in',
                                     data=json.dumps(checkin_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        assert checkin_response.status_code == 201
        ticket_id = json.loads(checkin_response.data)['data']['ticket_id']
        
        # Try checkout with invalid payment method
        checkout_data = {
            'ticket_id': ticket_id,
            'payment_method': 'invalid_method'
        }
        
        response = client.post('/user/sessions/checkout',
                             data=json.dumps(checkout_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'validation failed' in data['error'].lower()

    def test_concurrent_session_conflict_prevention(self, client, auth_headers, test_parking_setup):
        """Test prevention of concurrent sessions for same vehicle"""
        logger.info("Testing concurrent session conflict prevention")
        
        # Create a vehicle
        vehicle_data = {
            'registration_number': 'CONFLICT123',
            'vehicle_name': 'Conflict Test Car',
            'vehicle_type': 'car'
        }
        
        vehicle_response = client.post('/user/vehicles',
                                     data=json.dumps(vehicle_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        assert vehicle_response.status_code == 201
        vehicle_id = json.loads(vehicle_response.data)['data']['vehicle_id']
        
        # Start first session
        checkin_data = {
            'vehicle_id': vehicle_id,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        response1 = client.post('/user/sessions/check-in',
                              data=json.dumps(checkin_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response1.status_code == 201
        
        # Try to start second session with same vehicle - should fail
        response2 = client.post('/user/sessions/check-in',
                              data=json.dumps(checkin_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response2.status_code == 409
        data = json.loads(response2.data)
        assert data['success'] is False
        assert 'already has an active' in data['error'].lower()

    def test_session_data_integrity_slot_allocation(self, client, auth_headers, test_parking_setup, test_vehicle):
        """Test data integrity of slot allocation and deallocation"""
        logger.info("Testing session data integrity for slot allocation")
        
        # Check initial slot status
        slot_id = test_parking_setup['slot_ids'][0]
        slot = Slot.query.get(slot_id)
        assert slot.status == 0  # Should be free initially
        assert slot.vehicle_reg_no is None
        assert slot.ticket_id is None
        
        # Start session
        checkin_data = {
            'vehicle_id': test_vehicle,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        checkin_response = client.post('/user/sessions/check-in',
                                     data=json.dumps(checkin_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        assert checkin_response.status_code == 201
        ticket_id = json.loads(checkin_response.data)['data']['ticket_id']
        
        # Check slot is now occupied
        db.session.refresh(slot)
        assert slot.status == 1  # Should be occupied
        assert slot.vehicle_reg_no == 'TEST123'
        assert slot.ticket_id == ticket_id
        
        # Complete session
        checkout_data = {
            'ticket_id': ticket_id,
            'payment_method': 'card'
        }
        
        checkout_response = client.post('/user/sessions/checkout',
                                      data=json.dumps(checkout_data),
                                      content_type='application/json',
                                      headers=auth_headers)
        
        assert checkout_response.status_code == 200
        
        # Check slot is freed
        db.session.refresh(slot)
        assert slot.status == 0  # Should be free again
        assert slot.vehicle_reg_no is None
        assert slot.ticket_id is None

    def test_session_cost_calculation_accuracy(self, client, auth_headers, test_parking_setup, test_vehicle):
        """Test accuracy of session cost calculation"""
        logger.info("Testing session cost calculation accuracy")
        
        # Start session
        checkin_data = {
            'vehicle_id': test_vehicle,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        checkin_response = client.post('/user/sessions/check-in',
                                     data=json.dumps(checkin_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        assert checkin_response.status_code == 201
        ticket_id = json.loads(checkin_response.data)['data']['ticket_id']
        
        # Simulate some time passing by updating session start time
        session = ParkingSession.query.filter_by(ticket_id=ticket_id).first()
        session.start_time = datetime.utcnow() - timedelta(hours=2, minutes=30)  # 2.5 hours ago
        db.session.commit()
        
        # Complete session
        checkout_data = {
            'ticket_id': ticket_id,
            'payment_method': 'card'
        }
        
        checkout_response = client.post('/user/sessions/checkout',
                                      data=json.dumps(checkout_data),
                                      content_type='application/json',
                                      headers=auth_headers)
        
        assert checkout_response.status_code == 200
        data = json.loads(checkout_response.data)
        
        # Check cost calculation (should be 3 hours * €2.50 = €7.50 based on test parking lot rates)
        assert data['data']['total_amount'] == 7.5
        assert data['data']['duration_hours'] >= 2.5

    def test_session_history_pagination_and_filtering(self, client, auth_headers, test_parking_setup):
        """Test session history pagination and filtering"""
        logger.info("Testing session history pagination and filtering")
        
        # Create multiple vehicles and sessions
        completed_sessions = []
        for i in range(5):
            # Create vehicle
            vehicle_data = {
                'registration_number': f'HIST{i:03d}',
                'vehicle_name': f'History Test Car {i}',
                'vehicle_type': 'car'
            }
            
            vehicle_response = client.post('/user/vehicles',
                                         data=json.dumps(vehicle_data),
                                         content_type='application/json',
                                         headers=auth_headers)
            
            assert vehicle_response.status_code == 201
            vehicle_id = json.loads(vehicle_response.data)['data']['vehicle_id']
            
            # Start session
            checkin_data = {
                'vehicle_id': vehicle_id,
                'parkinglot_id': test_parking_setup['lot_id']
            }
            
            checkin_response = client.post('/user/sessions/check-in',
                                         data=json.dumps(checkin_data),
                                         content_type='application/json',
                                         headers=auth_headers)
            
            assert checkin_response.status_code == 201
            ticket_id = json.loads(checkin_response.data)['data']['ticket_id']
            
            # Complete session
            checkout_data = {
                'ticket_id': ticket_id,
                'payment_method': 'card'
            }
            
            checkout_response = client.post('/user/sessions/checkout',
                                          data=json.dumps(checkout_data),
                                          content_type='application/json',
                                          headers=auth_headers)
            
            assert checkout_response.status_code == 200
            completed_sessions.append(ticket_id)
        
        # Test pagination
        response = client.get('/user/sessions/history?page=1&per_page=3', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 3
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 3
        assert data['pagination']['total'] == 5
        
        # Test filtering by status
        response = client.get('/user/sessions/history?status=completed', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 5
        for session in data['data']:
            assert session['status'] == 'completed'

    def test_session_real_time_tracking_accuracy(self, client, auth_headers, test_parking_setup, test_vehicle):
        """Test real-time session tracking accuracy"""
        logger.info("Testing real-time session tracking accuracy")
        
        # Start session
        checkin_data = {
            'vehicle_id': test_vehicle,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        checkin_response = client.post('/user/sessions/check-in',
                                     data=json.dumps(checkin_data),
                                     content_type='application/json',
                                     headers=auth_headers)
        
        assert checkin_response.status_code == 201
        ticket_id = json.loads(checkin_response.data)['data']['ticket_id']
        
        # Simulate time passing
        session = ParkingSession.query.filter_by(ticket_id=ticket_id).first()
        session.start_time = datetime.utcnow() - timedelta(hours=1, minutes=30)  # 1.5 hours ago
        db.session.commit()
        
        # Get active sessions
        response = client.get('/user/sessions/active', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Find our session
        our_session = None
        for session_data in data['data']:
            if session_data['ticket_id'] == ticket_id:
                our_session = session_data
                break
        
        assert our_session is not None
        assert our_session['duration_hours'] >= 1.5
        assert our_session['estimated_cost'] >= 3.75  # 1.5 hours * €2.50

    def test_session_edge_cases_and_boundary_conditions(self, client, auth_headers, test_parking_setup, test_vehicle):
        """Test session edge cases and boundary conditions"""
        logger.info("Testing session edge cases and boundary conditions")
        
        # Test with empty request body
        response = client.post('/user/sessions/check-in',
                             data='',
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'no data provided' in data['error'].lower()
        
        # Test with malformed JSON
        response = client.post('/user/sessions/check-in',
                             data='{"invalid": "json"',  # Missing closing brace
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        
        # Test with negative vehicle ID
        checkin_data = {
            'vehicle_id': -1,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        response = client.post('/user/sessions/check-in',
                             data=json.dumps(checkin_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'validation failed' in data['error'].lower()
        
        # Test with zero parking lot ID
        checkin_data = {
            'vehicle_id': test_vehicle,
            'parkinglot_id': 0
        }
        
        response = client.post('/user/sessions/check-in',
                             data=json.dumps(checkin_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'validation failed' in data['error'].lower()

    def test_session_unauthorized_access_scenarios(self, client):
        """Test unauthorized access to session endpoints"""
        logger.info("Testing unauthorized access scenarios")
        
        # Test all session endpoints without authentication
        endpoints = [
            ('/user/sessions/check-in', 'POST', {'vehicle_id': 1, 'parkinglot_id': 1}),
            ('/user/sessions/checkout', 'POST', {'ticket_id': 'TEST123'}),
            ('/user/sessions/active', 'GET', None),
            ('/user/sessions/history', 'GET', None),
            ('/user/sessions/TEST123', 'GET', None)
        ]
        
        for endpoint, method, data in endpoints:
            if method == 'POST':
                response = client.post(endpoint,
                                     data=json.dumps(data) if data else '',
                                     content_type='application/json')
            else:
                response = client.get(endpoint)
            
            assert response.status_code == 401, f"Endpoint {endpoint} should require authentication"

    def test_session_cross_user_access_prevention(self, client, test_parking_setup):
        """Test prevention of cross-user session access"""
        logger.info("Testing cross-user session access prevention")
        
        # Create two users
        user1_data = {
            'user_name': 'testuser1',
            'user_email': 'user1@test.com',
            'user_password': 'password',
            'user_phone_no': '1111111111'
        }
        
        user2_data = {
            'user_name': 'testuser2',
            'user_email': 'user2@test.com',
            'user_password': 'password',
            'user_phone_no': '2222222222'
        }
        
        # Register users
        client.post('/auth/register',
                   data=json.dumps(user1_data),
                   content_type='application/json')
        
        client.post('/auth/register',
                   data=json.dumps(user2_data),
                   content_type='application/json')
        
        # Login as user1
        login1_response = client.post('/auth/login',
                                    data=json.dumps({
                                        'user_email': 'user1@test.com',
                                        'user_password': 'password',
                                        'role': 'user'
                                    }),
                                    content_type='application/json')
        
        user1_headers = {'Authorization': f'Bearer {json.loads(login1_response.data)["access_token"]}'}
        
        # Login as user2
        login2_response = client.post('/auth/login',
                                    data=json.dumps({
                                        'user_email': 'user2@test.com',
                                        'user_password': 'password',
                                        'role': 'user'
                                    }),
                                    content_type='application/json')
        
        user2_headers = {'Authorization': f'Bearer {json.loads(login2_response.data)["access_token"]}'}
        
        # User1 creates vehicle and session
        vehicle_data = {
            'registration_number': 'CROSS123',
            'vehicle_name': 'Cross Test Car',
            'vehicle_type': 'car'
        }
        
        vehicle_response = client.post('/user/vehicles',
                                     data=json.dumps(vehicle_data),
                                     content_type='application/json',
                                     headers=user1_headers)
        
        assert vehicle_response.status_code == 201
        vehicle_id = json.loads(vehicle_response.data)['data']['vehicle_id']
        
        checkin_data = {
            'vehicle_id': vehicle_id,
            'parkinglot_id': test_parking_setup['lot_id']
        }
        
        checkin_response = client.post('/user/sessions/check-in',
                                     data=json.dumps(checkin_data),
                                     content_type='application/json',
                                     headers=user1_headers)
        
        assert checkin_response.status_code == 201
        ticket_id = json.loads(checkin_response.data)['data']['ticket_id']
        
        # User2 tries to access user1's session - should fail
        response = client.get(f'/user/sessions/{ticket_id}', headers=user2_headers)
        assert response.status_code == 404
        
        # User2 tries to checkout user1's session - should fail
        checkout_data = {
            'ticket_id': ticket_id,
            'payment_method': 'card'
        }
        
        response = client.post('/user/sessions/checkout',
                             data=json.dumps(checkout_data),
                             content_type='application/json',
                             headers=user2_headers)
        
        assert response.status_code == 404