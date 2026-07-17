from . import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class ParkingLotDetails(db.Model):
    __tablename__ = 'parkinglots_details'
    id = db.Column('parkinglot_id', db.Integer, primary_key=True)
    name = db.Column('parking_name', db.Text)
    city = db.Column(db.Text)
    landmark = db.Column(db.Text)
    address = db.Column(db.Text)
    latitude = db.Column(db.Numeric)
    longitude = db.Column(db.Numeric)
    physical_appearance = db.Column(db.Text)
    parking_ownership = db.Column(db.Text)
    parking_surface = db.Column(db.Text)
    has_cctv = db.Column(db.Text)
    has_boom_barrier = db.Column(db.Text)
    ticket_generated = db.Column(db.Text)
    entry_exit_gates = db.Column(db.Text)
    weekly_off = db.Column(db.Text)
    parking_timing = db.Column(db.Text)
    vehicle_types = db.Column(db.Text)
    car_capacity = db.Column(db.Integer)
    available_car_slots = db.Column(db.Integer)
    two_wheeler_capacity = db.Column(db.Integer)
    available_two_wheeler_slots = db.Column(db.Integer)
    parking_type = db.Column(db.Text)
    payment_modes = db.Column(db.Text)
    car_parking_charge = db.Column(db.Text)
    two_wheeler_parking_charge = db.Column(db.Text)
    allows_prepaid_passes = db.Column(db.Text)
    provides_valet_services = db.Column(db.Text)
    value_added_services = db.Column(db.Text)

    floors = db.relationship('Floor', backref='parking_lot', lazy=True)
    admin_parking_lots = db.relationship('AdminParkingLot', backref='parking_lot', lazy=True)

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(100), unique=True, nullable=False)
    user_email = db.Column(db.String(100), unique=True, nullable=False)
    user_password = db.Column(db.String(255), nullable=False)
    user_phone_no = db.Column(db.String(15), unique=True, nullable=False)
    user_address = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # 'user' or 'admin' or 'super_admin'
    created_on = db.Column(db.DateTime, default=datetime.utcnow)

    sessions = db.relationship('ParkingSession', backref='user', lazy=True)
    admin_parking_lots = db.relationship('AdminParkingLot', backref='admin', lazy=True)

    def set_password(self, password):
        self.user_password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.user_password, password)

class Floor(db.Model):
    __tablename__ = 'floors'
    id = db.Column('floor_id', db.Integer, primary_key=True)
    name = db.Column('floor_name', db.String(50), nullable=False)
    parkinglot_id = db.Column(db.Integer, db.ForeignKey('parkinglots_details.parkinglot_id'), nullable=False)

    rows = db.relationship('Row', backref='floor', lazy=True)

class Row(db.Model):
    __tablename__ = 'rows'
    id = db.Column('row_id', db.Integer, primary_key=True)
    name = db.Column('row_name', db.String(50), nullable=False)
    floor_id = db.Column(db.Integer, db.ForeignKey('floors.floor_id'), nullable=False)
    parkinglot_id = db.Column(db.Integer, nullable=False) # Denormalized for easier lookup

    slots = db.relationship('Slot', backref='row', lazy=True)

class Slot(db.Model):
    __tablename__ = 'slots'
    id = db.Column('slot_id', db.Integer, primary_key=True)
    name = db.Column('slot_name', db.String(50), nullable=False)
    status = db.Column(db.Integer, default=0) # 0 for free, 1 for occupied
    vehicle_reg_no = db.Column(db.String(20))
    ticket_id = db.Column(db.String(50))
    row_id = db.Column(db.Integer, db.ForeignKey('rows.row_id'), nullable=False)
    floor_id = db.Column(db.Integer, nullable=False) # Denormalized
    parkinglot_id = db.Column(db.Integer, nullable=False) # Denormalized

class UserVehicle(db.Model):
    __tablename__ = 'user_vehicles'
    vehicle_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    registration_number = db.Column(db.String(20), nullable=False)
    vehicle_name = db.Column(db.String(100))
    make = db.Column(db.String(50))
    model = db.Column(db.String(50))
    year = db.Column(db.Integer)
    vehicle_type = db.Column(db.String(20), default='car')
    color = db.Column(db.String(30))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='vehicles')
    sessions = db.relationship('ParkingSession', backref='vehicle', lazy=True)

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('user_id', 'registration_number', name='uix_user_registration'),
    )

    def to_dict(self):
        return {
            'vehicle_id': self.vehicle_id,
            'user_id': self.user_id,
            'registration_number': self.registration_number,
            'vehicle_name': self.vehicle_name,
            'make': self.make,
            'model': self.model,
            'year': self.year,
            'vehicle_type': self.vehicle_type,
            'color': self.color,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def get_display_name(self):
        """Return user-friendly display name for the vehicle"""
        if self.vehicle_name:
            return f"{self.vehicle_name} ({self.registration_number})"
        elif self.make and self.model:
            return f"{self.make} {self.model} ({self.registration_number})"
        else:
            return self.registration_number

    def get_vehicle_details(self):
        """Return formatted vehicle details"""
        details = []
        if self.make:
            details.append(self.make)
        if self.model:
            details.append(self.model)
        if self.year:
            details.append(str(self.year))
        return " ".join(details) if details else "Vehicle Details"

class ParkingSession(db.Model):
    __tablename__ = 'parking_sessions'
    ticket_id = db.Column(db.String(50), primary_key=True)
    parkinglot_id = db.Column(db.Integer)
    floor_id = db.Column(db.Integer)
    row_id = db.Column(db.Integer)
    slot_id = db.Column(db.Integer, db.ForeignKey('slots.slot_id'))
    vehicle_reg_no = db.Column(db.String(20), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    vehicle_id = db.Column(db.Integer, db.ForeignKey('user_vehicles.vehicle_id'))
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    duration_hrs = db.Column(db.Numeric, server_default=None)
    amount_paid = db.Column(db.Numeric(10, 2), nullable=True, server_default="0")  # Legacy field
    total_amount = db.Column(db.Numeric(10, 2))  # New enhanced field
    payment_status = db.Column(db.String(20), default='pending')  # pending, completed, failed
    payment_method = db.Column(db.String(50))  # card, upi, cash, etc.
    receipt_url = db.Column(db.String(255))
    session_status = db.Column(db.String(20), default='active')  # active, completed, cancelled
    vehicle_type = db.Column(db.String(20))  # Car, Two-Wheeler, etc.

    def to_dict(self):
        return {
            'ticket_id': self.ticket_id,
            'parkinglot_id': self.parkinglot_id,
            'floor_id': self.floor_id,
            'row_id': self.row_id,
            'slot_id': self.slot_id,
            'vehicle_reg_no': self.vehicle_reg_no,
            'user_id': self.user_id,
            'vehicle_id': self.vehicle_id,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration_hrs': float(self.duration_hrs) if self.duration_hrs else None,
            'total_amount': float(self.total_amount) if self.total_amount else None,
            'payment_status': self.payment_status,
            'payment_method': self.payment_method,
            'receipt_url': self.receipt_url,
            'session_status': self.session_status,
            'vehicle_type': self.vehicle_type
        }

    def calculate_duration(self):
        """Calculate current duration of the session"""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds() / 3600
        else:
            return (datetime.utcnow() - self.start_time).total_seconds() / 3600

    def is_active(self):
        """Check if session is currently active"""
        return self.session_status == 'active' and self.end_time is None

class AdminParkingLot(db.Model):
    __tablename__ = 'admin_parking_lots'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    parking_lot_id = db.Column(db.Integer, db.ForeignKey('parkinglots_details.parkinglot_id'), nullable=False)
    assigned_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date()) 

class AdminPaymentLedger(db.Model):
    __tablename__ = 'admin_payment_ledger'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    opening_balance = db.Column(db.Float, nullable=False, default=0.0)
    today_collection = db.Column(db.Float, nullable=False, default=0.0)
    payment_made = db.Column(db.Float, nullable=False, default=0.0)
    closing_balance = db.Column(db.Float, nullable=False, default=0.0)

    admin = db.relationship('User', back_populates='payment_ledgers')

    __table_args__ = (
        db.UniqueConstraint('admin_id', 'date', name='uix_admin_date'),
    ) 

# Add relationship to User model if not present
if not hasattr(User, 'payment_ledgers'):
    User.payment_ledgers = db.relationship('AdminPaymentLedger', back_populates='admin', lazy='dynamic') 