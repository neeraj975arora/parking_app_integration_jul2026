import pytest
import uuid
import json
from app import create_app, db as _db
from app.models import ParkingLotDetails, Floor, Row, Slot


@pytest.fixture(scope='function')        # function scope = fresh DB every test
def app():
    app = create_app('testing')
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    return app.test_client()


@pytest.fixture(scope='function')
def auth_headers(client):
    uid = str(uuid.uuid4())[:8]
    email = f"user_{uid}@example.com"
    phone = f"9{uid[:9].ljust(9,'0')}"
    client.post('/auth/register', json={
        'user_name':     f'user_{uid}',
        'user_email':    email,
        'user_password': 'password123',
        'user_phone_no': phone,
        'user_address':  'Test Address'
    })
    resp = client.post('/auth/login', json={
        'user_email':    email,
        'user_password': 'password123',
        'role':          'user'           # required by your login endpoint
    })
    token = resp.json['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture(scope='function')
def super_admin_headers(client):
    uid = str(uuid.uuid4())[:8]
    email = f"super_{uid}@example.com"
    phone = f"1{uid[:9].ljust(9,'0')}"
    client.post('/auth/register', json={
        'user_name':          f'super_{uid}',
        'user_email':         email,
        'user_password':      'password123',
        'user_phone_no':      phone,
        'user_address':       'HQ',
        'role':               'super_admin',
        'super_admin_secret': 'SUPER_SECRET_SUPER_ADMIN_KEY'
    })
    resp = client.post('/auth/login', json={
        'user_email':    email,
        'user_password': 'password123',
        'role':          'super_admin'
    })
    token = resp.json['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture(scope='function')
def admin_headers(client, super_admin_headers):
    uid = str(uuid.uuid4())[:8]
    admin_email = f"admin_{uid}@example.com"
    admin_phone = f"8{uid[:9].ljust(9,'0')}"
    resp = client.post('/admin/register_admin', json={
        'user_name':     f'admin_{uid}',
        'user_email':    admin_email,
        'user_password': 'adminpass',
        'user_phone_no': admin_phone,
        'user_address':  'Admin Desk'
    }, headers=super_admin_headers)
    assert resp.status_code == 201
    resp = client.post('/auth/login', json={
        'user_email':    admin_email,
        'user_password': 'adminpass',
        'role':          'admin'
    })
    token = resp.json['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture(scope='function')
def test_parking_setup(client, auth_headers):
    lot = ParkingLotDetails(
        name='Test Parking Lot',
        address='123 Test St',
        city='Test City',
        car_parking_charge='First hour: €2.50, Each additional hour: €1.50',
        parking_timing='24x7',
        vehicle_types='Car,Bike',
        car_capacity=10,
        available_car_slots=10,
        two_wheeler_capacity=5,
        available_two_wheeler_slots=5,
    )
    _db.session.add(lot)
    _db.session.commit()

    floor = Floor(name='Ground Floor', parkinglot_id=lot.id)
    _db.session.add(floor)
    _db.session.commit()

    row = Row(name='Row A', floor_id=floor.id, parkinglot_id=lot.id)
    _db.session.add(row)
    _db.session.commit()

    slot_ids = []
    for i in range(1, 4):
        slot = Slot(name=f'Slot {i}', status=0,
                    row_id=row.id, floor_id=floor.id, parkinglot_id=lot.id)
        _db.session.add(slot)
        _db.session.flush()
        slot_ids.append(slot.id)
    _db.session.commit()

    return {'lot_id': lot.id, 'floor_id': floor.id,
            'row_id': row.id, 'slot_ids': slot_ids}


@pytest.fixture(scope='function')
def test_vehicle(client, auth_headers):
    resp = client.post('/user/vehicles', headers=auth_headers, json={
        'registration_number': 'TEST123',
        'vehicle_name':        'Test Car',
        'make':                'Toyota',
        'model':               'Camry',
        'vehicle_type':        'car',
    })
    assert resp.status_code == 201, f"Vehicle creation failed: {resp.data}"
    return json.loads(resp.data)['data']['vehicle_id']
