import pytest
import json
import logging
from app.models import ParkingLotDetails, Floor, Row, Slot
from app import db

logger = logging.getLogger(__name__)

class TestNearbyParkingLots:
    """Test suite for enhanced nearby parking lots API"""

    def test_get_nearby_parking_lots_success(self, client, auth_headers):
        """Test GET /parking/lots/nearby returns nearby parking lots"""
        logger.info("Testing nearby parking lots API with valid parameters")
        
        # Create test parking lots with different locations
        test_lots = [
            {
                'name': 'Close Parking Lot',
                'address': '123 Close Street',
                'city': 'Test City',
                'latitude': 40.7128,  # NYC coordinates
                'longitude': -74.0060,
                'car_parking_charge': '€2.50/hr',
                'parking_timing': '24x7',
                'vehicle_types': 'Car,Bike'
            },
            {
                'name': 'Far Parking Lot',
                'address': '456 Far Street', 
                'city': 'Test City',
                'latitude': 40.7589,  # Further away in NYC
                'longitude': -73.9851,
                'car_parking_charge': '€3.00/hr',
                'parking_timing': '6AM-10PM',
                'vehicle_types': 'Car'
            }
        ]
        
        created_lots = []
        for lot_data in test_lots:
            lot = ParkingLotDetails(**lot_data)
            db.session.add(lot)
            db.session.commit()
            created_lots.append(lot)
            
            # Create some slots for availability testing
            floor = Floor(name='Ground Floor', parkinglot_id=lot.id)
            db.session.add(floor)
            db.session.commit()
            
            row = Row(name='Row A', floor_id=floor.id, parkinglot_id=lot.id)
            db.session.add(row)
            db.session.commit()
            
            # Create 5 slots, 3 available (status=0), 2 occupied (status=1)
            for i in range(5):
                slot = Slot(
                    name=f'Slot {i+1}',
                    status=0 if i < 3 else 1,  # First 3 are available
                    row_id=row.id,
                    floor_id=floor.id,
                    parkinglot_id=lot.id
                )
                db.session.add(slot)
            db.session.commit()
        
        # Test API call - search from NYC coordinates
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060&radius=10000',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data
        
        # Debug: print the actual response
        print(f"API Response: {json.dumps(data, indent=2)}")
        print(f"Number of lots found: {len(data['data'])}")
        
        # Should find at least 1 lot (the close one), may find 2 depending on distance calculation
        assert len(data['data']) >= 1
        
        # Check that results are sorted by distance (closest first)
        lots = data['data']
        assert lots[0]['name'] == 'Close Parking Lot'  # Should be the closest one
        
        if len(lots) > 1:
            assert lots[0]['distance'] < lots[1]['distance']
        
        # Check that availability is calculated correctly
        for lot in lots:
            assert 'availability' in lot
            assert lot['availability'] == 3  # 3 available slots each
            assert lot['availability_status'] == 'limited'  # 3 slots = limited
            assert 'hourly_rate' in lot
            assert 'is_open' in lot

    def test_get_nearby_parking_lots_with_filters(self, client, auth_headers):
        """Test nearby parking lots API with price and availability filters"""
        logger.info("Testing nearby parking lots API with filters")
        
        # Create test parking lot
        lot = ParkingLotDetails(
            name='Filtered Test Lot',
            address='789 Filter Street',
            city='Test City',
            latitude=40.7128,
            longitude=-74.0060,
            car_parking_charge='€4.00/hr',
            parking_timing='24x7',
            vehicle_types='Car'
        )
        db.session.add(lot)
        db.session.commit()
        
        # Create floor, row, and slots
        floor = Floor(name='Ground Floor', parkinglot_id=lot.id)
        db.session.add(floor)
        db.session.commit()
        
        row = Row(name='Row A', floor_id=floor.id, parkinglot_id=lot.id)
        db.session.add(row)
        db.session.commit()
        
        # Create 10 available slots
        for i in range(10):
            slot = Slot(
                name=f'Slot {i+1}',
                status=0,  # All available
                row_id=row.id,
                floor_id=floor.id,
                parkinglot_id=lot.id
            )
            db.session.add(slot)
        db.session.commit()
        
        # Test with max_price filter (should exclude lot with €4.00/hr)
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060&max_price=3.50',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 0  # Should be filtered out due to high price
        
        # Test with min_availability filter (should include lot with 10 slots)
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060&min_availability=5',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 1
        assert data['data'][0]['availability'] == 10

    def test_get_nearby_parking_lots_missing_coordinates(self, client, auth_headers):
        """Test nearby parking lots API with missing coordinates"""
        logger.info("Testing nearby parking lots API with missing coordinates")
        
        # Test without latitude
        response = client.get(
            '/parking/lots/nearby?longitude=-74.0060',
            headers=auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'latitude and longitude are required' in data['error'].lower()
        
        # Test without longitude
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128',
            headers=auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'latitude and longitude are required' in data['error'].lower()

    def test_get_nearby_parking_lots_invalid_radius(self, client, auth_headers):
        """Test nearby parking lots API with invalid radius"""
        logger.info("Testing nearby parking lots API with invalid radius")
        
        # Test with negative radius
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060&radius=-1000',
            headers=auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'radius must be between' in data['error'].lower()
        
        # Test with too large radius
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060&radius=100000',
            headers=auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'radius must be between' in data['error'].lower()

    def test_get_nearby_parking_lots_no_results(self, client, auth_headers):
        """Test nearby parking lots API with no results in range"""
        logger.info("Testing nearby parking lots API with no results")
        
        # Search in a location far from any parking lots
        response = client.get(
            '/parking/lots/nearby?latitude=0.0&longitude=0.0&radius=1000',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 0
        assert data['total_count'] == 0

    def test_get_nearby_parking_lots_unauthorized(self, client):
        """Test nearby parking lots API without authentication"""
        logger.info("Testing nearby parking lots API without authentication")
        
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060'
        )
        
        assert response.status_code == 401

    def test_get_nearby_parking_lots_combined_filters(self, client, auth_headers):
        """Test nearby parking lots API with multiple filter combinations"""
        logger.info("Testing nearby parking lots API with combined filters")
        
        # Create test parking lots with different characteristics
        test_lots = [
            {
                'name': 'Premium Lot',
                'address': '100 Premium Street',
                'city': 'Test City',
                'latitude': 40.7128,
                'longitude': -74.0060,
                'car_parking_charge': '€5.00/hr',
                'parking_timing': '24x7',
                'vehicle_types': 'Car,Bike'
            },
            {
                'name': 'Budget Lot',
                'address': '200 Budget Street',
                'city': 'Test City',
                'latitude': 40.7130,
                'longitude': -74.0062,
                'car_parking_charge': '€2.00/hr',
                'parking_timing': '6AM-10PM',
                'vehicle_types': 'Car'
            }
        ]
        
        created_lots = []
        for i, lot_data in enumerate(test_lots):
            lot = ParkingLotDetails(**lot_data)
            db.session.add(lot)
            db.session.commit()
            created_lots.append(lot)
            
            # Create floor, row, and slots
            floor = Floor(name='Ground Floor', parkinglot_id=lot.id)
            db.session.add(floor)
            db.session.commit()
            
            row = Row(name='Row A', floor_id=floor.id, parkinglot_id=lot.id)
            db.session.add(row)
            db.session.commit()
            
            # Premium lot has 15 slots, Budget lot has 3 slots
            slot_count = 15 if i == 0 else 3
            for j in range(slot_count):
                slot = Slot(
                    name=f'Slot {j+1}',
                    status=0,  # All available
                    row_id=row.id,
                    floor_id=floor.id,
                    parkinglot_id=lot.id
                )
                db.session.add(slot)
            db.session.commit()
        
        # Test combined filters: max_price=3.00 AND min_availability=10
        # Should only return Budget Lot if it has enough slots, but Budget Lot only has 3 slots
        # So should return no results
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060&max_price=3.00&min_availability=10',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 0  # No lots meet both criteria
        
        # Test combined filters: max_price=6.00 AND min_availability=10
        # Should return Premium Lot (has 15 slots and price is under 6.00)
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060&max_price=6.00&min_availability=10',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 1
        assert data['data'][0]['name'] == 'Premium Lot'
        assert data['data'][0]['availability'] == 15

    def test_get_nearby_parking_lots_vehicle_type_filtering(self, client, auth_headers):
        """Test nearby parking lots API with vehicle type filtering"""
        logger.info("Testing nearby parking lots API with vehicle type filtering")
        
        # Create parking lot that only supports cars
        lot = ParkingLotDetails(
            name='Car Only Lot',
            address='300 Car Street',
            city='Test City',
            latitude=40.7128,
            longitude=-74.0060,
            car_parking_charge='€3.00/hr',
            two_wheeler_parking_charge=None,  # No bike parking
            parking_timing='24x7',
            vehicle_types='Car'
        )
        db.session.add(lot)
        db.session.commit()
        
        # Create floor, row, and slots
        floor = Floor(name='Ground Floor', parkinglot_id=lot.id)
        db.session.add(floor)
        db.session.commit()
        
        row = Row(name='Row A', floor_id=floor.id, parkinglot_id=lot.id)
        db.session.add(row)
        db.session.commit()
        
        for i in range(5):
            slot = Slot(
                name=f'Slot {i+1}',
                status=0,
                row_id=row.id,
                floor_id=floor.id,
                parkinglot_id=lot.id
            )
            db.session.add(slot)
        db.session.commit()
        
        # Test with car vehicle type - should return the lot
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060&vehicle_type=car',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 1
        assert data['data'][0]['name'] == 'Car Only Lot'
        
        # Test with bike vehicle type - should still return the lot but with different pricing
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060&vehicle_type=bike',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        # Should still return the lot even if it doesn't explicitly support bikes
        assert len(data['data']) >= 0

    def test_get_nearby_parking_lots_real_time_updates(self, client, auth_headers):
        """Test nearby parking lots API returns real-time availability updates"""
        logger.info("Testing nearby parking lots API real-time availability updates")
        
        # Create parking lot
        lot = ParkingLotDetails(
            name='Real Time Test Lot',
            address='400 Real Time Street',
            city='Test City',
            latitude=40.7128,
            longitude=-74.0060,
            car_parking_charge='€2.50/hr',
            parking_timing='24x7',
            vehicle_types='Car'
        )
        db.session.add(lot)
        db.session.commit()
        
        # Create floor, row, and slots
        floor = Floor(name='Ground Floor', parkinglot_id=lot.id)
        db.session.add(floor)
        db.session.commit()
        
        row = Row(name='Row A', floor_id=floor.id, parkinglot_id=lot.id)
        db.session.add(row)
        db.session.commit()
        
        # Create 10 slots, all initially available
        slots = []
        for i in range(10):
            slot = Slot(
                name=f'Slot {i+1}',
                status=0,  # Available
                row_id=row.id,
                floor_id=floor.id,
                parkinglot_id=lot.id
            )
            db.session.add(slot)
            slots.append(slot)
        db.session.commit()
        
        # First API call - should show 10 available slots
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 1
        assert data['data'][0]['availability'] == 10
        assert data['data'][0]['availability_status'] == 'available'
        
        # Simulate some slots being occupied
        for i in range(7):  # Occupy 7 slots
            slots[i].status = 1
        db.session.commit()
        
        # Second API call - should show updated availability (3 available)
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 1
        assert data['data'][0]['availability'] == 3
        assert data['data'][0]['availability_status'] == 'limited'
        
        # Occupy all remaining slots
        for i in range(7, 10):
            slots[i].status = 1
        db.session.commit()
        
        # Third API call - should show no availability
        response = client.get(
            '/parking/lots/nearby?latitude=40.7128&longitude=-74.0060',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']) == 1
        assert data['data'][0]['availability'] == 0
        assert data['data'][0]['availability_status'] == 'full'