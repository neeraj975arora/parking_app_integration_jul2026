from flask import request, jsonify, current_app
from flask_jwt_extended import decode_token
from flask_jwt_extended.exceptions import JWTExtendedException
from jwt.exceptions import PyJWTError
from functools import wraps
from .config import setup_logging
import logging

setup_logging()
logger = logging.getLogger(__name__)
logger.info("Auth middleware module initialized with centralized logging")

class AuthError(Exception):
    pass

def decode_jwt_token(token):
    logger.debug("Attempting to decode JWT token")
    try:
        payload = decode_token(token)
        logger.debug(f"JWT token decoded successfully for sub: {payload.get('sub')}")
        return payload
    except Exception as e:
        logger.warning(f"Invalid JWT token provided: {e}")
        raise AuthError("Invalid token")

def role_required(required_role):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                auth_header = request.headers.get("Authorization")
                if not auth_header or not auth_header.startswith("Bearer"):
                    return jsonify({"error": "Missing or invalid authorization header"}), 401
                token = auth_header.split(" ")[1]
                payload = decode_jwt_token(token)
                user_role = payload.get("role")
                if not user_role:
                    return jsonify({"error": "Token missing role information"}), 401
                user_id = payload.get('user_id') or payload.get('sub')
                if not _has_required_role(user_role, required_role):
                    return jsonify({"error": f"Insufficient permissions. Required: {required_role}"}), 403
                request.current_user = {'user_id': user_id, 'role': user_role}
                return f(*args, **kwargs)
            except AuthError as e:
                return jsonify({"error": str(e)}), 401
            except Exception as e:
                return jsonify({"error": "Authentication failed"}), 401
        return wrapper
    return decorator

def _has_required_role(user_role, required_role):
    role_permissions = {
        'super_admin': ['super_admin', 'admin', 'user'],
        'admin': ['admin', 'user'],
        'user': ['user']
    }
    return required_role in role_permissions.get(user_role, [user_role])

def get_current_user():
    return getattr(request, 'current_user', None)
