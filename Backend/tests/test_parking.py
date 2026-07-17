import json

def test_create_parking_lot(client, auth_headers):
    """
    GIVEN a Flask application and authenticated user
    WHEN a POST request is sent to '/parking/lots'
    THEN check that a '201' status code is returned and a new parking lot is created.
    """
    response = client.post('/parking/lots',
                           headers=auth_headers,
                           data=json.dumps(dict(
                               name='My Test Lot',
                               address='123 Pytest Ave',
                               city='Testville',
                               landmark='Near Test Landmark',
                               latitude=12.345,
                               longitude=67.890,
                               physical_appearance='Multi-storey',
                               parking_ownership='Private',
                               parking_surface='Concrete',
                               has_cctv='Yes',
                               has_boom_barrier='Yes',
                               ticket_generated='Yes',
                               entry_exit_gates='2',
                               weekly_off='Sunday',
                               parking_timing='24x7',
                               vehicle_types='Car,Bike',
                               car_capacity=50,
                               available_car_slots=50,
                               two_wheeler_capacity=100,
                               available_two_wheeler_slots=100,
                               parking_type='Open',
                               payment_modes='Cash,Card,UPI',
                               car_parking_charge='20/hr',
                               two_wheeler_parking_charge='10/hr',
                               allows_prepaid_passes='Yes',
                               provides_valet_services='No',
                               value_added_services='Car Wash'
                           )),
                           content_type='application/json')
    if response.status_code != 201:
        print('Error response:', response.data)
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['name'] == 'My Test Lot'
    assert data['address'] == '123 Pytest Ave'

def test_get_parking_lots(client, auth_headers):
    """
    GIVEN a Flask application and an existing parking lot
    WHEN a GET request is sent to '/parking/lots'
    THEN check that a '200' status code is returned and the list contains the parking lot.
    """
    # First create a parking lot
    create_response = client.post('/parking/lots',
                                 headers=auth_headers,
                                 data=json.dumps(dict(
                                     name='My Test Lot',
                                     address='123 Pytest Ave',
                                     city='Testville',
                                     landmark='Near Test Landmark',
                                     latitude=12.345,
                                     longitude=67.890,
                                     physical_appearance='Multi-storey',
                                     parking_ownership='Private',
                                     parking_surface='Concrete',
                                     has_cctv='Yes',
                                     has_boom_barrier='Yes',
                                     ticket_generated='Yes',
                                     entry_exit_gates='2',
                                     weekly_off='Sunday',
                                     parking_timing='24x7',
                                     vehicle_types='Car,Bike',
                                     car_capacity=50,
                                     available_car_slots=50,
                                     two_wheeler_capacity=100,
                                     available_two_wheeler_slots=100,
                                     parking_type='Open',
                                     payment_modes='Cash,Card,UPI',
                                     car_parking_charge='20/hr',
                                     two_wheeler_parking_charge='10/hr',
                                     allows_prepaid_passes='Yes',
                                     provides_valet_services='No',
                                     value_added_services='Car Wash'
                                 )),
                                 content_type='application/json')
    assert create_response.status_code == 201
    
    # Now get the parking lots
    response = client.get('/parking/lots', headers=auth_headers)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]['name'] == 'My Test Lot'

def test_create_floor(client, auth_headers):
    """
    GIVEN a Flask application and an existing parking lot
    WHEN a POST request is sent to '/parking/lots/1/floors'
    THEN check that a '201' status code is returned and a new floor is created.
    """
    # First create a parking lot
    create_response = client.post('/parking/lots',
                                 headers=auth_headers,
                                 data=json.dumps(dict(
                                     name='My Test Lot',
                                     address='123 Pytest Ave',
                                     city='Testville',
                                     landmark='Near Test Landmark',
                                     latitude=12.345,
                                     longitude=67.890,
                                     physical_appearance='Multi-storey',
                                     parking_ownership='Private',
                                     parking_surface='Concrete',
                                     has_cctv='Yes',
                                     has_boom_barrier='Yes',
                                     ticket_generated='Yes',
                                     entry_exit_gates='2',
                                     weekly_off='Sunday',
                                     parking_timing='24x7',
                                     vehicle_types='Car,Bike',
                                     car_capacity=50,
                                     available_car_slots=50,
                                     two_wheeler_capacity=100,
                                     available_two_wheeler_slots=100,
                                     parking_type='Open',
                                     payment_modes='Cash,Card,UPI',
                                     car_parking_charge='20/hr',
                                     two_wheeler_parking_charge='10/hr',
                                     allows_prepaid_passes='Yes',
                                     provides_valet_services='No',
                                     value_added_services='Car Wash'
                                 )),
                                 content_type='application/json')
    assert create_response.status_code == 201
    lot_data = json.loads(create_response.data)
    lot_id = lot_data['id']
    
    # Now create a floor
    response = client.post(f'/parking/lots/{lot_id}/floors',
                           headers=auth_headers,
                           data=json.dumps(dict(name='Floor 1')),
                           content_type='application/json')
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['name'] == 'Floor 1'

def test_create_row(client, auth_headers):
    """
    GIVEN a Flask application and an existing floor
    WHEN a POST request is sent to '/parking/floors/1/rows'
    THEN check that a '201' status code is returned and a new row is created.
    """
    # First create a parking lot
    create_lot_response = client.post('/parking/lots',
                                     headers=auth_headers,
                                     data=json.dumps(dict(
                                         name='My Test Lot',
                                         address='123 Pytest Ave',
                                         city='Testville',
                                         landmark='Near Test Landmark',
                                         latitude=12.345,
                                         longitude=67.890,
                                         physical_appearance='Multi-storey',
                                         parking_ownership='Private',
                                         parking_surface='Concrete',
                                         has_cctv='Yes',
                                         has_boom_barrier='Yes',
                                         ticket_generated='Yes',
                                         entry_exit_gates='2',
                                         weekly_off='Sunday',
                                         parking_timing='24x7',
                                         vehicle_types='Car,Bike',
                                         car_capacity=50,
                                         available_car_slots=50,
                                         two_wheeler_capacity=100,
                                         available_two_wheeler_slots=100,
                                         parking_type='Open',
                                         payment_modes='Cash,Card,UPI',
                                         car_parking_charge='20/hr',
                                         two_wheeler_parking_charge='10/hr',
                                         allows_prepaid_passes='Yes',
                                         provides_valet_services='No',
                                         value_added_services='Car Wash'
                                     )),
                                     content_type='application/json')
    assert create_lot_response.status_code == 201
    lot_data = json.loads(create_lot_response.data)
    lot_id = lot_data['id']
    
    # Create a floor
    create_floor_response = client.post(f'/parking/lots/{lot_id}/floors',
                                       headers=auth_headers,
                                       data=json.dumps(dict(name='Floor 1')),
                                       content_type='application/json')
    assert create_floor_response.status_code == 201
    floor_data = json.loads(create_floor_response.data)
    floor_id = floor_data['id']
    
    # Now create a row
    response = client.post(f'/parking/floors/{floor_id}/rows',
                           headers=auth_headers,
                           data=json.dumps(dict(name='Row A')),
                           content_type='application/json')
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['name'] == 'Row A'

def test_create_slot(client, auth_headers):
    """
    GIVEN a Flask application and an existing row
    WHEN a POST request is sent to '/parking/rows/1/slots'
    THEN check that a '201' status code is returned and a new slot is created.
    """
    # First create a parking lot
    create_lot_response = client.post('/parking/lots',
                                     headers=auth_headers,
                                     data=json.dumps(dict(
                                         name='My Test Lot',
                                         address='123 Pytest Ave',
                                         city='Testville',
                                         landmark='Near Test Landmark',
                                         latitude=12.345,
                                         longitude=67.890,
                                         physical_appearance='Multi-storey',
                                         parking_ownership='Private',
                                         parking_surface='Concrete',
                                         has_cctv='Yes',
                                         has_boom_barrier='Yes',
                                         ticket_generated='Yes',
                                         entry_exit_gates='2',
                                         weekly_off='Sunday',
                                         parking_timing='24x7',
                                         vehicle_types='Car,Bike',
                                         car_capacity=50,
                                         available_car_slots=50,
                                         two_wheeler_capacity=100,
                                         available_two_wheeler_slots=100,
                                         parking_type='Open',
                                         payment_modes='Cash,Card,UPI',
                                         car_parking_charge='20/hr',
                                         two_wheeler_parking_charge='10/hr',
                                         allows_prepaid_passes='Yes',
                                         provides_valet_services='No',
                                         value_added_services='Car Wash'
                                     )),
                                     content_type='application/json')
    assert create_lot_response.status_code == 201
    lot_data = json.loads(create_lot_response.data)
    lot_id = lot_data['id']
    
    # Create a floor
    create_floor_response = client.post(f'/parking/lots/{lot_id}/floors',
                                       headers=auth_headers,
                                       data=json.dumps(dict(name='Floor 1')),
                                       content_type='application/json')
    assert create_floor_response.status_code == 201
    floor_data = json.loads(create_floor_response.data)
    floor_id = floor_data['id']
    
    # Create a row
    create_row_response = client.post(f'/parking/floors/{floor_id}/rows',
                                     headers=auth_headers,
                                     data=json.dumps(dict(name='Row A')),
                                     content_type='application/json')
    assert create_row_response.status_code == 201
    row_data = json.loads(create_row_response.data)
    row_id = row_data['id']
    
    # Now create a slot
    response = client.post(f'/parking/rows/{row_id}/slots',
                           headers=auth_headers,
                           data=json.dumps(dict(name='A1')),
                           content_type='application/json')
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['name'] == 'A1'
    assert data['status'] == 0 # Default status

def test_get_parking_lot_details_success(client, auth_headers):
    """
    GIVEN a Flask application and an existing parking lot with slots
    WHEN a GET request is sent to '/parking/lots/{id}/details'
    THEN check that comprehensive parking lot details are returned with real-time availability
    """
    # Create a complete parking lot setup
    create_lot_response = client.post('/parking/lots',
                                     headers=auth_headers,
                                     data=json.dumps(dict(
                                         name='Detailed Test Lot',
                                         address='456 Detail Ave',
                                         city='DetailCity',
                                         landmark='Near Detail Landmark',
                                         latitude=12.345,
                                         longitude=67.890,
                                         physical_appearance='Modern multi-storey',
                                         parking_ownership='Private',
                                         parking_surface='Concrete',
                                         has_cctv='Yes',
                                         has_boom_barrier='Yes',
                                         ticket_generated='Yes',
                                         entry_exit_gates='2 automated gates',
                                         weekly_off='None',
                                         parking_timing='6:00 AM - 10:00 PM',
                                         vehicle_types='Car,Bike',
                                         car_capacity=100,
                                         available_car_slots=100,
                                         two_wheeler_capacity=50,
                                         available_two_wheeler_slots=50,
                                         parking_type='Multi-storey',
                                         payment_modes='Cash,Card,UPI,Digital Wallet',
                                         car_parking_charge='€2.50/hr, Daily max €20',
                                         two_wheeler_parking_charge='€1.50/hr, Daily max €12',
                                         allows_prepaid_passes='Yes',
                                         provides_valet_services='Yes',
                                         value_added_services='Car Wash,EV Charging'
                                     )),
                                     content_type='application/json')
    assert create_lot_response.status_code == 201
    lot_data = json.loads(create_lot_response.data)
    lot_id = lot_data['id']
    
    # Create floor, row, and slots for availability calculation
    create_floor_response = client.post(f'/parking/lots/{lot_id}/floors',
                                       headers=auth_headers,
                                       data=json.dumps(dict(name='Ground Floor')),
                                       content_type='application/json')
    assert create_floor_response.status_code == 201
    floor_data = json.loads(create_floor_response.data)
    floor_id = floor_data['id']
    
    create_row_response = client.post(f'/parking/floors/{floor_id}/rows',
                                     headers=auth_headers,
                                     data=json.dumps(dict(name='Row A')),
                                     content_type='application/json')
    assert create_row_response.status_code == 201
    row_data = json.loads(create_row_response.data)
    row_id = row_data['id']
    
    # Create some slots
    for i in range(5):
        slot_response = client.post(f'/parking/rows/{row_id}/slots',
                                   headers=auth_headers,
                                   data=json.dumps(dict(name=f'A{i+1}', status=0)),
                                   content_type='application/json')
        assert slot_response.status_code == 201
    
    # Test the detailed parking lot API
    response = client.get(f'/parking/lots/{lot_id}/details', headers=auth_headers)
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['success'] is True
    
    # Verify basic information
    lot_details = data['data']
    assert lot_details['parkinglot_id'] == lot_id
    assert lot_details['name'] == 'Detailed Test Lot'
    assert lot_details['address'] == '456 Detail Ave'
    assert lot_details['city'] == 'DetailCity'
    assert lot_details['latitude'] == 12.345
    assert lot_details['longitude'] == 67.890
    
    # Verify operating hours parsing
    assert 'operating_hours' in lot_details
    operating_hours = lot_details['operating_hours']
    assert operating_hours['is_24x7'] is False
    assert operating_hours['opening_time'] == '06:00'
    assert operating_hours['closing_time'] == '22:00'
    assert operating_hours['timing_text'] == '6:00 AM - 10:00 PM'
    
    # Verify pricing tiers
    assert 'pricing_tiers' in lot_details
    pricing = lot_details['pricing_tiers']
    assert 'car_pricing' in pricing
    assert 'two_wheeler_pricing' in pricing
    assert pricing['car_pricing']['hourly_rate'] == 2.50
    assert pricing['car_pricing']['daily_max'] == 20.00
    assert pricing['two_wheeler_pricing']['hourly_rate'] == 1.50
    assert pricing['two_wheeler_pricing']['daily_max'] == 12.00
    assert 'Cash' in pricing['payment_modes']
    assert 'Card' in pricing['payment_modes']
    assert pricing['allows_prepaid_passes'] is True
    
    # Verify capacity information
    assert 'capacity_info' in lot_details
    capacity = lot_details['capacity_info']
    assert capacity['total_capacity'] == 5  # We created 5 slots
    assert capacity['car_capacity'] == 100
    assert capacity['two_wheeler_capacity'] == 50
    
    # Verify real-time availability
    assert 'real_time_availability' in lot_details
    availability = lot_details['real_time_availability']
    assert availability['total_slots'] == 5
    assert availability['available_slots'] == 5  # All slots are free (status=0)
    assert availability['occupied_slots'] == 0
    assert availability['availability_status'] == 'available'
    assert availability['availability_percentage'] == 100.0
    assert availability['is_currently_open'] is True
    assert 'last_updated' in availability
    
    # Verify facilities
    assert 'facilities' in lot_details
    facilities = lot_details['facilities']
    assert facilities['security']['has_cctv'] is True
    assert facilities['security']['has_boom_barrier'] is True
    assert 'CCTV Surveillance' in facilities['security']['security_features']
    assert 'Boom Barrier' in facilities['security']['security_features']
    assert facilities['services']['provides_valet_services'] is True
    assert facilities['services']['ticket_generated'] is True
    assert 'Car Wash' in facilities['services']['value_added_services']
    assert 'EV Charging' in facilities['services']['value_added_services']
    
    # Verify additional information
    assert lot_details['parking_type'] == 'Multi-storey'
    assert lot_details['parking_surface'] == 'Concrete'
    assert lot_details['parking_ownership'] == 'Private'
    assert 'Car' in lot_details['vehicle_types_supported']
    assert 'Bike' in lot_details['vehicle_types_supported']
    
    # Verify structure info
    assert 'structure_info' in lot_details
    structure = lot_details['structure_info']
    assert structure['total_floors'] == 1
    assert 'Ground Floor' in structure['floor_names']

def test_get_parking_lot_details_with_vehicle_type_filter(client, auth_headers):
    """
    GIVEN a Flask application and an existing parking lot
    WHEN a GET request is sent to '/parking/lots/{id}/details?vehicle_type=two_wheeler'
    THEN check that vehicle-specific pricing and availability are returned
    """
    # Create a parking lot
    create_lot_response = client.post('/parking/lots',
                                     headers=auth_headers,
                                     data=json.dumps(dict(
                                         name='Vehicle Type Test Lot',
                                         address='789 Vehicle Ave',
                                         car_parking_charge='€3.00/hr',
                                         two_wheeler_parking_charge='€1.00/hr'
                                     )),
                                     content_type='application/json')
    assert create_lot_response.status_code == 201
    lot_data = json.loads(create_lot_response.data)
    lot_id = lot_data['id']
    
    # Test with two_wheeler vehicle type
    response = client.get(f'/parking/lots/{lot_id}/details?vehicle_type=two_wheeler', 
                         headers=auth_headers)
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['success'] is True
    
    # Verify two-wheeler specific pricing is highlighted
    pricing = data['data']['pricing_tiers']
    assert pricing['two_wheeler_pricing']['hourly_rate'] == 1.00

def test_get_parking_lot_details_not_found(client, auth_headers):
    """
    GIVEN a Flask application
    WHEN a GET request is sent to '/parking/lots/99999/details' (non-existent lot)
    THEN check that a '404' status code is returned
    """
    response = client.get('/parking/lots/99999/details', headers=auth_headers)
    assert response.status_code == 404
    
    data = json.loads(response.data)
    assert data['success'] is False
    assert 'not found' in data['error'].lower()

def test_get_parking_lot_details_24x7_parsing(client, auth_headers):
    """
    GIVEN a Flask application and a 24x7 parking lot
    WHEN a GET request is sent to '/parking/lots/{id}/details'
    THEN check that 24x7 operating hours are correctly parsed
    """
    # Create a 24x7 parking lot
    create_lot_response = client.post('/parking/lots',
                                     headers=auth_headers,
                                     data=json.dumps(dict(
                                         name='24x7 Test Lot',
                                         address='24x7 Street',
                                         parking_timing='24x7 Open Always'
                                     )),
                                     content_type='application/json')
    assert create_lot_response.status_code == 201
    lot_data = json.loads(create_lot_response.data)
    lot_id = lot_data['id']
    
    response = client.get(f'/parking/lots/{lot_id}/details', headers=auth_headers)
    assert response.status_code == 200
    
    data = json.loads(response.data)
    operating_hours = data['data']['operating_hours']
    assert operating_hours['is_24x7'] is True
    assert operating_hours['opening_time'] == '00:00'
    assert operating_hours['closing_time'] == '23:59'
    assert operating_hours['timing_text'] == 'Open 24/7'

def test_get_parking_lot_details_real_time_availability_accuracy(client, auth_headers):
    """
    GIVEN a Flask application and a parking lot with changing slot availability
    WHEN GET requests are sent to '/parking/lots/{id}/details' at different times
    THEN check that real-time availability is accurately calculated and updated
    """
    # Create parking lot
    create_lot_response = client.post('/parking/lots',
                                     headers=auth_headers,
                                     data=json.dumps(dict(
                                         name='Real Time Accuracy Test Lot',
                                         address='500 Accuracy Street',
                                         city='Test City',
                                         car_parking_charge='€2.00/hr',
                                         parking_timing='24x7'
                                     )),
                                     content_type='application/json')
    assert create_lot_response.status_code == 201
    lot_data = json.loads(create_lot_response.data)
    lot_id = lot_data['id']
    
    # Create floor, row, and slots
    create_floor_response = client.post(f'/parking/lots/{lot_id}/floors',
                                       headers=auth_headers,
                                       data=json.dumps(dict(name='Test Floor')),
                                       content_type='application/json')
    assert create_floor_response.status_code == 201
    floor_data = json.loads(create_floor_response.data)
    floor_id = floor_data['id']
    
    create_row_response = client.post(f'/parking/floors/{floor_id}/rows',
                                     headers=auth_headers,
                                     data=json.dumps(dict(name='Test Row')),
                                     content_type='application/json')
    assert create_row_response.status_code == 201
    row_data = json.loads(create_row_response.data)
    row_id = row_data['id']
    
    # Create 8 slots
    slot_ids = []
    for i in range(8):
        slot_response = client.post(f'/parking/rows/{row_id}/slots',
                                   headers=auth_headers,
                                   data=json.dumps(dict(name=f'Slot-{i+1}', status=0)),
                                   content_type='application/json')
        assert slot_response.status_code == 201
        slot_data = json.loads(slot_response.data)
        slot_ids.append(slot_data['id'])
    
    # Test initial state - all slots available
    response = client.get(f'/parking/lots/{lot_id}/details', headers=auth_headers)
    assert response.status_code == 200
    
    data = json.loads(response.data)
    availability = data['data']['real_time_availability']
    assert availability['total_slots'] == 8
    assert availability['available_slots'] == 8
    assert availability['occupied_slots'] == 0
    assert availability['availability_status'] == 'available'
    assert availability['availability_percentage'] == 100.0
    assert availability['is_currently_open'] is True
    
    # Simulate occupying 3 slots (status=1 means occupied)
    from app.models import Slot
    from app import db
    
    for i in range(3):
        slot = db.session.get(Slot, slot_ids[i])
        slot.status = 1
    db.session.commit()
    
    # Test updated availability
    response = client.get(f'/parking/lots/{lot_id}/details', headers=auth_headers)
    assert response.status_code == 200
    
    data = json.loads(response.data)
    availability = data['data']['real_time_availability']
    assert availability['total_slots'] == 8
    assert availability['available_slots'] == 5
    assert availability['occupied_slots'] == 3
    assert availability['availability_status'] == 'available'
    assert availability['availability_percentage'] == 62.5
    
    # Occupy more slots to test 'limited' status
    for i in range(3, 7):  # Occupy 4 more slots (total 7 occupied, 1 available)
        slot = db.session.get(Slot, slot_ids[i])
        slot.status = 1
    db.session.commit()
    
    response = client.get(f'/parking/lots/{lot_id}/details', headers=auth_headers)
    assert response.status_code == 200
    
    data = json.loads(response.data)
    availability = data['data']['real_time_availability']
    assert availability['total_slots'] == 8
    assert availability['available_slots'] == 1
    assert availability['occupied_slots'] == 7
    assert availability['availability_status'] == 'limited'
    assert availability['availability_percentage'] == 12.5
    
    # Occupy the last slot
    slot = db.session.get(Slot, slot_ids[7])
    slot.status = 1
    db.session.commit()
    
    response = client.get(f'/parking/lots/{lot_id}/details', headers=auth_headers)
    assert response.status_code == 200
    
    data = json.loads(response.data)
    availability = data['data']['real_time_availability']
    assert availability['total_slots'] == 8
    assert availability['available_slots'] == 0
    assert availability['occupied_slots'] == 8
    assert availability['availability_status'] == 'full'
    assert availability['availability_percentage'] == 0.0

def test_get_parking_lot_details_comprehensive_information_accuracy(client, auth_headers):
    """
    GIVEN a Flask application and a fully configured parking lot
    WHEN a GET request is sent to '/parking/lots/{id}/details'
    THEN check that all comprehensive information is accurately returned
    """
    # Create a comprehensive parking lot with all details
    create_lot_response = client.post('/parking/lots',
                                     headers=auth_headers,
                                     data=json.dumps(dict(
                                         name='Comprehensive Test Lot',
                                         address='600 Comprehensive Ave',
                                         city='Detail City',
                                         landmark='Near Comprehensive Mall',
                                         latitude=41.8781,
                                         longitude=-87.6298,
                                         physical_appearance='Modern glass structure',
                                         parking_ownership='Public',
                                         parking_surface='Asphalt',
                                         has_cctv='Yes',
                                         has_boom_barrier='Yes',
                                         ticket_generated='Yes',
                                         entry_exit_gates='4 automated gates',
                                         weekly_off='Sunday',
                                         parking_timing='5:00 AM - 11:00 PM',
                                         vehicle_types='Car,Bike,Motorcycle',
                                         car_capacity=200,
                                         available_car_slots=200,
                                         two_wheeler_capacity=100,
                                         available_two_wheeler_slots=100,
                                         parking_type='Multi-level',
                                         payment_modes='Cash,Card,UPI,Mobile Wallet',
                                         car_parking_charge='€3.50/hr, Daily max €25',
                                         two_wheeler_parking_charge='€2.00/hr, Daily max €15',
                                         allows_prepaid_passes='Yes',
                                         provides_valet_services='Yes',
                                         value_added_services='Car Wash,EV Charging,Tire Air'
                                     )),
                                     content_type='application/json')
    assert create_lot_response.status_code == 201
    lot_data = json.loads(create_lot_response.data)
    lot_id = lot_data['id']
    
    # Create multiple floors for structure testing
    floor_ids = []
    for floor_num in range(1, 4):  # Create 3 floors
        create_floor_response = client.post(f'/parking/lots/{lot_id}/floors',
                                           headers=auth_headers,
                                           data=json.dumps(dict(name=f'Floor {floor_num}')),
                                           content_type='application/json')
        assert create_floor_response.status_code == 201
        floor_data = json.loads(create_floor_response.data)
        floor_ids.append(floor_data['id'])
    
    # Test comprehensive details API
    response = client.get(f'/parking/lots/{lot_id}/details', headers=auth_headers)
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['success'] is True
    
    lot_details = data['data']
    
    # Verify basic information accuracy
    assert lot_details['parkinglot_id'] == lot_id
    assert lot_details['name'] == 'Comprehensive Test Lot'
    assert lot_details['address'] == '600 Comprehensive Ave'
    assert lot_details['city'] == 'Detail City'
    assert lot_details['landmark'] == 'Near Comprehensive Mall'
    assert lot_details['latitude'] == 41.8781
    assert lot_details['longitude'] == -87.6298
    assert lot_details['description'] == 'Modern glass structure'
    
    # Verify operating hours parsing accuracy
    operating_hours = lot_details['operating_hours']
    assert operating_hours['is_24x7'] is False
    assert operating_hours['opening_time'] == '05:00'
    assert operating_hours['closing_time'] == '23:00'
    assert 'Sunday' in operating_hours.get('weekly_off', '')
    
    # Verify pricing tiers accuracy
    pricing = lot_details['pricing_tiers']
    assert pricing['car_pricing']['hourly_rate'] == 3.50
    assert pricing['car_pricing']['daily_max'] == 25.00
    assert pricing['two_wheeler_pricing']['hourly_rate'] == 2.00
    assert pricing['two_wheeler_pricing']['daily_max'] == 15.00
    assert 'Cash' in pricing['payment_modes']
    assert 'UPI' in pricing['payment_modes']
    assert 'Mobile Wallet' in pricing['payment_modes']
    assert pricing['allows_prepaid_passes'] is True
    
    # Verify capacity information accuracy
    capacity = lot_details['capacity_info']
    assert capacity['car_capacity'] == 200
    assert capacity['two_wheeler_capacity'] == 100
    
    # Verify facilities information accuracy
    facilities = lot_details['facilities']
    assert facilities['security']['has_cctv'] is True
    assert facilities['security']['has_boom_barrier'] is True
    assert facilities['services']['provides_valet_services'] is True
    assert facilities['services']['ticket_generated'] is True
    assert 'Car Wash' in facilities['services']['value_added_services']
    assert 'EV Charging' in facilities['services']['value_added_services']
    assert 'Tire Air' in facilities['services']['value_added_services']
    
    # Verify additional information accuracy
    assert lot_details['parking_type'] == 'Multi-level'
    assert lot_details['parking_surface'] == 'Asphalt'
    assert lot_details['parking_ownership'] == 'Public'
    assert 'Car' in lot_details['vehicle_types_supported']
    assert 'Bike' in lot_details['vehicle_types_supported']
    assert 'Motorcycle' in lot_details['vehicle_types_supported']
    
    # Verify structure information accuracy
    structure = lot_details['structure_info']
    assert structure['total_floors'] == 3
    assert 'Floor 1' in structure['floor_names']
    assert 'Floor 2' in structure['floor_names']
    assert 'Floor 3' in structure['floor_names']

def test_get_parking_lot_details_error_handling(client, auth_headers):
    """
    GIVEN a Flask application
    WHEN GET requests are sent to '/parking/lots/{id}/details' with various error conditions
    THEN check that appropriate error responses are returned
    """
    # Test with non-existent parking lot ID
    response = client.get('/parking/lots/99999/details', headers=auth_headers)
    assert response.status_code == 404
    
    data = json.loads(response.data)
    assert data['success'] is False
    assert 'not found' in data['error'].lower()
    
    # Test with invalid parking lot ID format (non-integer)
    response = client.get('/parking/lots/invalid/details', headers=auth_headers)
    assert response.status_code == 404  # Flask routing will handle this as not found
    
    # Test without authentication
    response = client.get('/parking/lots/1/details')
    assert response.status_code == 401 