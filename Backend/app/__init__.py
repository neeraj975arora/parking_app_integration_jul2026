from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import logging

from .config import setup_logging

db = SQLAlchemy()
ma = Marshmallow()
jwt = JWTManager()

def create_app(config_name=None):
    from .config import Config, TestingConfig
    
    app = Flask(__name__)
    
    if config_name == 'testing':
        app.config.from_object(TestingConfig)
        logger = logging.getLogger(__name__)
        logger.info("Using TestingConfig")
    else:
        app.config.from_object(Config)
    
    setup_logging()
    logger = logging.getLogger(__name__)
    
    db.init_app(app)
    ma.init_app(app)
    jwt.init_app(app)
    CORS(app)
    
    from .models import User, ParkingLotDetails, Floor, Row, Slot, UserVehicle, ParkingSession, AdminParkingLot, AdminPaymentLedger
    
    try:
        from .auth_middleware import decode_jwt_token
        
        def auth_middleware():
            public_paths = ['/auth/login', '/auth/register', '/health']
            if request.path in public_paths or request.path.startswith('/static'):
                return None
            
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return None
            
            token = auth_header.split(' ')[1]
            try:
                payload = decode_jwt_token(token)
                if payload:
                    request.user_id = payload.get('user_id')
                    request.user_role = payload.get('role')
            except Exception as e:
                logger.warning(f"Auth middleware error: {e}")
            return None
        
        app.before_request(auth_middleware)
        logger.info("Auth middleware registered")
    except ImportError as e:
        logger.warning(f"Could not import from auth_middleware: {e}")
    
    from .auth import auth_bp
    from .parking import parking_bp
    from .admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')

    from .api_v1 import api_v1_bp
    app.register_blueprint(api_v1_bp)
    app.register_blueprint(parking_bp, url_prefix='/parking')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    
    try:
        from .vehicles_api import vehicles_bp, vehicles_test_bp
        app.register_blueprint(vehicles_bp)
        app.register_blueprint(vehicles_test_bp)
        logger.info("Vehicle blueprints registered")
    except ImportError as e:
        logger.warning(f"Could not import vehicles blueprints: {e}")
    
    try:
        from .sessions import sessions_bp, sessions_test_bp
        app.register_blueprint(sessions_bp)
        app.register_blueprint(sessions_test_bp)
        logger.info("Sessions blueprints registered")
    except ImportError as e:
        logger.warning(f"Could not import sessions blueprints: {e}")
    
    with app.app_context():
        db.create_all()
        logger.info("Database tables created")
    
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy", "message": "Parking App API is running"}), 200
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"msg": "Resource not found"}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"msg": "Internal server error"}), 500
    
    return app
