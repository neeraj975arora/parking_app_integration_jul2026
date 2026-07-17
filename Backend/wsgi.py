from app import create_app, db
from app.models import User, UserVehicle, ParkingLotDetails, Floor, Row, Slot, ParkingSession, AdminParkingLot, AdminPaymentLedger
import os

app = create_app(os.getenv('FLASK_CONFIG') or 'default')

@app.shell_context_processor
def make_shell_context():
    return dict(
        db=db, 
        User=User, 
        UserVehicle=UserVehicle,
        ParkingLotDetails=ParkingLotDetails, 
        Floor=Floor, 
        Row=Row, 
        Slot=Slot, 
        ParkingSession=ParkingSession,
        AdminParkingLot=AdminParkingLot,
        AdminPaymentLedger=AdminPaymentLedger
    ) 