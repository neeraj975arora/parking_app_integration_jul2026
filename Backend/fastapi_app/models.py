from datetime import datetime, date as date_type
from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean, DateTime,
    Date, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import relationship
import bcrypt as _bcrypt
from .database import Base


# ── Password hashing (direct bcrypt — avoids passlib/bcrypt 5.x incompatibility) ──

def hash_password(plain: str) -> str:
    """Hash password with bcrypt. Truncates to 72 bytes (bcrypt hard limit)."""
    return _bcrypt.hashpw(plain[:72].encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def _verify_werkzeug_scrypt(plain: str, hashed: str) -> bool:
    """Verify passwords hashed by Flask/Werkzeug (scrypt:N:r:p$salt$hash format)."""
    try:
        from werkzeug.security import check_password_hash
        return check_password_hash(hashed, plain)
    except Exception:
        return False


def verify_password(plain: str, hashed: str) -> bool:
    """Verify password — supports both bcrypt (FastAPI) and scrypt (Flask/Werkzeug)."""
    if hashed.startswith("scrypt:") or hashed.startswith("pbkdf2:"):
        return _verify_werkzeug_scrypt(plain, hashed)
    try:
        return _bcrypt.checkpw(plain[:72].encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


class ParkingLotDetails(Base):
    __tablename__ = "parkinglots_details"

    id = Column("parkinglot_id", Integer, primary_key=True)
    name = Column("parking_name", Text)
    city = Column(Text)
    landmark = Column(Text)
    address = Column(Text)
    latitude = Column(Numeric)
    longitude = Column(Numeric)
    physical_appearance = Column(Text)
    parking_ownership = Column(Text)
    parking_surface = Column(Text)
    has_cctv = Column(Text)
    has_boom_barrier = Column(Text)
    ticket_generated = Column(Text)
    entry_exit_gates = Column(Text)
    weekly_off = Column(Text)
    parking_timing = Column(Text)
    vehicle_types = Column(Text)
    car_capacity = Column(Integer)
    available_car_slots = Column(Integer)
    two_wheeler_capacity = Column(Integer)
    available_two_wheeler_slots = Column(Integer)
    parking_type = Column(Text)
    payment_modes = Column(Text)
    car_parking_charge = Column(Text)
    two_wheeler_parking_charge = Column(Text)
    allows_prepaid_passes = Column(Text)
    provides_valet_services = Column(Text)
    value_added_services = Column(Text)

    floors = relationship("Floor", back_populates="parking_lot", lazy="select")
    admin_parking_lots = relationship("AdminParkingLot", back_populates="parking_lot", lazy="select")


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    user_name = Column(String(100), unique=True, nullable=False)
    user_email = Column(String(100), unique=True, nullable=False)
    user_password = Column(String(255), nullable=False)
    user_phone_no = Column(String(15), unique=True, nullable=False)
    user_address = Column(Text, nullable=False)
    role = Column(String(20), nullable=False, default="user")
    created_on = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("ParkingSession", back_populates="user", lazy="select")
    admin_parking_lots = relationship("AdminParkingLot", back_populates="admin", lazy="select")
    vehicles = relationship("UserVehicle", back_populates="user", lazy="select")
    payment_ledgers = relationship("AdminPaymentLedger", back_populates="admin", lazy="dynamic")

    def set_password(self, password: str):
        self.user_password = hash_password(password)

    def check_password(self, password: str) -> bool:
        return verify_password(password, self.user_password)


class Floor(Base):
    __tablename__ = "floors"

    id = Column("floor_id", Integer, primary_key=True)
    name = Column("floor_name", String(50), nullable=False)
    parkinglot_id = Column(Integer, ForeignKey("parkinglots_details.parkinglot_id"), nullable=False)

    parking_lot = relationship("ParkingLotDetails", back_populates="floors")
    rows = relationship("Row", back_populates="floor", lazy="select")


class Row(Base):
    __tablename__ = "rows"

    id = Column("row_id", Integer, primary_key=True)
    name = Column("row_name", String(50), nullable=False)
    floor_id = Column(Integer, ForeignKey("floors.floor_id"), nullable=False)
    parkinglot_id = Column(Integer, nullable=False)

    floor = relationship("Floor", back_populates="rows")
    slots = relationship("Slot", back_populates="row", lazy="select")


class Slot(Base):
    __tablename__ = "slots"

    id = Column("slot_id", Integer, primary_key=True)
    name = Column("slot_name", String(50), nullable=False)
    status = Column(Integer, default=0)
    vehicle_reg_no = Column(String(20))
    ticket_id = Column(String(50))
    row_id = Column(Integer, ForeignKey("rows.row_id"), nullable=False)
    floor_id = Column(Integer, nullable=False)
    parkinglot_id = Column(Integer, nullable=False)

    row = relationship("Row", back_populates="slots")


class UserVehicle(Base):
    __tablename__ = "user_vehicles"

    vehicle_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    registration_number = Column(String(20), nullable=False)
    vehicle_name = Column(String(100))
    make = Column(String(50))
    model = Column(String(50))
    year = Column(Integer)
    vehicle_type = Column(String(20), default="car")
    color = Column(String(30))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="vehicles")
    sessions = relationship("ParkingSession", back_populates="vehicle", lazy="select")

    __table_args__ = (
        UniqueConstraint("user_id", "registration_number", name="uix_user_registration"),
    )

    def to_dict(self):
        return {
            "vehicle_id": self.vehicle_id,
            "user_id": self.user_id,
            "registration_number": self.registration_number,
            "vehicle_name": self.vehicle_name,
            "make": self.make,
            "model": self.model,
            "year": self.year,
            "vehicle_type": self.vehicle_type,
            "color": self.color,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ParkingSession(Base):
    __tablename__ = "parking_sessions"

    ticket_id = Column(String(50), primary_key=True)
    parkinglot_id = Column(Integer)
    floor_id = Column(Integer)
    row_id = Column(Integer)
    slot_id = Column(Integer, ForeignKey("slots.slot_id"))
    vehicle_reg_no = Column(String(20), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    vehicle_id = Column(Integer, ForeignKey("user_vehicles.vehicle_id"))
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    duration_hrs = Column(Numeric, server_default=None)
    amount_paid = Column(Numeric(10, 2), nullable=True, server_default="0")
    total_amount = Column(Numeric(10, 2))
    payment_status = Column(String(20), default="pending")
    payment_method = Column(String(50))
    receipt_url = Column(String(255))
    session_status = Column(String(20), default="active")
    vehicle_type = Column(String(20))

    user = relationship("User", back_populates="sessions")
    vehicle = relationship("UserVehicle", back_populates="sessions")

    def to_dict(self):
        return {
            "ticket_id": self.ticket_id,
            "parkinglot_id": self.parkinglot_id,
            "floor_id": self.floor_id,
            "row_id": self.row_id,
            "slot_id": self.slot_id,
            "vehicle_reg_no": self.vehicle_reg_no,
            "user_id": self.user_id,
            "vehicle_id": self.vehicle_id,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_hrs": float(self.duration_hrs) if self.duration_hrs else None,
            "total_amount": float(self.total_amount) if self.total_amount else None,
            "payment_status": self.payment_status,
            "payment_method": self.payment_method,
            "receipt_url": self.receipt_url,
            "session_status": self.session_status,
            "vehicle_type": self.vehicle_type,
        }

    def calculate_duration(self):
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds() / 3600
        return (datetime.utcnow() - self.start_time).total_seconds() / 3600

    def is_active_session(self):
        return self.session_status == "active" and self.end_time is None


class AdminParkingLot(Base):
    __tablename__ = "admin_parking_lots"

    id = Column(Integer, primary_key=True)
    admin_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    parking_lot_id = Column(Integer, ForeignKey("parkinglots_details.parkinglot_id"), nullable=False)
    assigned_date = Column(Date, nullable=False, default=datetime.utcnow().date())

    admin = relationship("User", back_populates="admin_parking_lots")
    parking_lot = relationship("ParkingLotDetails", back_populates="admin_parking_lots")


class AdminPaymentLedger(Base):
    __tablename__ = "admin_payment_ledger"

    id = Column(Integer, primary_key=True)
    admin_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    date = Column(Date, nullable=False)
    opening_balance = Column(Numeric(12, 2), nullable=False, default=0.0)
    today_collection = Column(Numeric(12, 2), nullable=False, default=0.0)
    payment_made = Column(Numeric(12, 2), nullable=False, default=0.0)
    closing_balance = Column(Numeric(12, 2), nullable=False, default=0.0)

    admin = relationship("User", back_populates="payment_ledgers")

    __table_args__ = (
        UniqueConstraint("admin_id", "date", name="uix_admin_date"),
    )


class PaymentTransaction(Base):
    """Tracks every payment attempt — works with both simulated and Razorpay modes."""
    __tablename__ = "payment_transactions"

    txn_id           = Column(String(30), primary_key=True)
    order_id         = Column(String(50), nullable=False, index=True)
    payment_id       = Column(String(100), nullable=True)   # Razorpay payment_id after success
    user_id          = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    payment_for      = Column(String(20), nullable=False)   # "session" | "booking"
    reference_id     = Column(String(50), nullable=False)   # ticket_id or booking_id
    amount           = Column(Numeric(10, 2), nullable=False)
    currency         = Column(String(5), default="INR")
    payment_method   = Column(String(20), nullable=False)   # upi | card | netbanking | wallet
    upi_id           = Column(String(100), nullable=True)
    card_last4       = Column(String(4), nullable=True)
    wallet_name      = Column(String(50), nullable=True)
    status           = Column(String(20), default="pending")  # pending | paid | failed | refunded
    description      = Column(Text, nullable=True)
    parking_lot_name = Column(String(200), nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    paid_at          = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id])


# ─────────────────────────────────────────────────────────────────────────────
# FUTURE BOOKING  (BookMyShow-style advance slot reservation)
# ─────────────────────────────────────────────────────────────────────────────

class ParkingBooking(Base):
    """
    Advance / future parking booking.
    A user reserves a slot at a parking lot for a specific date & time window
    before physically arriving — similar to BookMyShow seat reservation.
    """
    __tablename__ = "parking_bookings"

    booking_id    = Column(String(20), primary_key=True)          # e.g. BK-A1B2C3
    user_id       = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    vehicle_id    = Column(Integer, ForeignKey("user_vehicles.vehicle_id"), nullable=False)
    parkinglot_id = Column(Integer, ForeignKey("parkinglots_details.parkinglot_id"), nullable=False)
    slot_id       = Column(Integer, ForeignKey("slots.slot_id"), nullable=True)  # assigned on confirm

    # Time window the user wants to park
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end   = Column(DateTime, nullable=False)
    duration_hours  = Column(Numeric(6, 2), nullable=False)

    vehicle_type    = Column(String(20), default="car")
    vehicle_reg_no  = Column(String(20), nullable=False)

    # Booking lifecycle:  pending → confirmed → checked_in → completed | cancelled
    booking_status  = Column(String(20), default="confirmed", nullable=False)

    # Payment
    estimated_amount = Column(Numeric(10, 2), nullable=False, default=0)
    payment_status   = Column(String(20), default="pending")   # pending | paid | refunded
    payment_method   = Column(String(50), nullable=True)

    # Timestamps
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cancelled_at = Column(DateTime, nullable=True)
    cancel_reason = Column(Text, nullable=True)

    # Relationships
    user        = relationship("User",             foreign_keys=[user_id])
    vehicle     = relationship("UserVehicle",      foreign_keys=[vehicle_id])
    parking_lot = relationship("ParkingLotDetails",foreign_keys=[parkinglot_id])
    slot        = relationship("Slot",             foreign_keys=[slot_id])

    __table_args__ = (
        # A slot cannot be double-booked for overlapping time windows
        # (enforced in application logic — DB constraint would need a range type)
    )
