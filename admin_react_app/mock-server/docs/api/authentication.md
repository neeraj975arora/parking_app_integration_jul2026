# Authentication Guide

## Overview

The Parking Admin Mock Server uses JWT (JSON Web Token) based authentication with role-based access control (RBAC). This guide explains how to authenticate and authorize API requests.

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthService
    participant DataStore

    Client->>API: POST /auth/login
    API->>AuthService: Validate credentials
    AuthService->>DataStore: Check user exists
    DataStore-->>AuthService: User data
    AuthService->>AuthService: Verify password
    AuthService->>AuthService: Generate JWT token
    AuthService-->>API: JWT token + user data
    API-->>Client: Login response with token
    
    Note over Client: Store JWT token
    
    Client->>API: API request with Bearer token
    API->>AuthService: Validate JWT token
    AuthService->>AuthService: Verify token signature
    AuthService->>AuthService: Check token expiration
    AuthService-->>API: User context
    API->>API: Process request
    API-->>Client: API response
```

## User Roles

The system supports three user roles with different permission levels:

### 1. Super Admin
- **Full system access**
- Can manage all admins and their lot assignments
- Can view all parking sessions across all lots
- Can access all financial data and closures
- Can perform all administrative operations

**Default Credentials:**
```json
{
  "user_email": "superadmin@parking.com",
  "user_password": "superadmin123",
  "role": "super_admin"
}
```

### 2. Admin
- **Limited system access**
- Can only manage sessions in assigned parking lots
- Can view sessions only for their assigned lots
- Can perform financial operations for their assigned lots
- Cannot manage other admins

**Default Credentials:**
```json
{
  "user_email": "admin@parking.com",
  "user_password": "admin123",
  "role": "admin"
}
```

### 3. User (Regular User)
- **Minimal access** (primarily for session data)
- Can view their own parking sessions
- Cannot perform administrative operations
- Not used for admin dashboard authentication

## Login Process

### 1. Login Request

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "user_email": "admin@parking.com",
  "user_password": "admin123",
  "role": "admin"
}
```

**Validation Rules:**
- `user_email`: Must be a valid email format
- `user_password`: Required, minimum 1 character
- `role`: Must be either "super_admin" or "admin" for dashboard access

### 2. Login Response

**Success Response (200):**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 2,
    "username": "John Doe",
    "user_email": "admin@parking.com",
    "role": "admin",
    "user_phone_no": "+91-9876543211",
    "user_address": "Delhi Office",
    "assigned_lots": [1, 2, 3],
    "created_at": "2024-01-15T00:00:00Z",
    "last_login": "2025-01-21T10:30:00Z",
    "is_active": true
  },
  "expires_in": 86400
}
```

**Error Responses:**

**400 - Validation Error:**
```json
{
  "success": false,
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": {
    "errors": [
      {
        "field": "user_email",
        "message": "Please provide a valid email address"
      }
    ]
  }
}
```

**401 - Invalid Credentials:**
```json
{
  "success": false,
  "error": "Invalid credentials",
  "errorCode": "AUTHENTICATION_ERROR"
}
```

**403 - Role Access Denied:**
```json
{
  "success": false,
  "error": "Access denied for this role",
  "errorCode": "AUTHORIZATION_ERROR"
}
```

## JWT Token Structure

### Token Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Token Payload
```json
{
  "user_id": 2,
  "role": "admin",
  "email": "admin@parking.com",
  "iat": 1642781400,
  "exp": 1642867800
}
```

### Token Configuration
- **Algorithm:** HS256 (HMAC SHA-256)
- **Expiration:** 24 hours (configurable via `JWT_EXPIRES_IN`)
- **Secret:** Configurable via `JWT_SECRET` environment variable
- **Refresh Token:** 7 days expiration

## Using JWT Tokens

### 1. Include in Authorization Header

For all protected endpoints, include the JWT token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Example API Request

```bash
curl -X GET \
  http://localhost:3001/auth/me \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

### 3. JavaScript Example

```javascript
// Store token after login
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_email: 'admin@parking.com',
    user_password: 'admin123',
    role: 'admin'
  })
});

const { access_token } = await loginResponse.json();
localStorage.setItem('jwt_token', access_token);

// Use token for subsequent requests
const apiResponse = await fetch('/admin/sessions/details/all', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
    'Content-Type': 'application/json'
  }
});
```

## Token Validation

### Server-Side Validation Process

1. **Extract Token:** Get token from Authorization header
2. **Verify Signature:** Validate token signature using secret key
3. **Check Expiration:** Ensure token hasn't expired
4. **Validate User:** Verify user still exists and is active
5. **Inject Context:** Add user information to request context

### Token Validation Errors

**401 - Missing Token:**
```json
{
  "success": false,
  "error": "Access token is required",
  "errorCode": "AUTHENTICATION_ERROR"
}
```

**401 - Invalid Token:**
```json
{
  "success": false,
  "error": "Invalid token",
  "errorCode": "AUTHENTICATION_ERROR"
}
```

**401 - Expired Token:**
```json
{
  "success": false,
  "error": "Token has expired",
  "errorCode": "AUTHENTICATION_ERROR"
}
```

**401 - User Not Found:**
```json
{
  "success": false,
  "error": "User not found",
  "errorCode": "AUTHENTICATION_ERROR"
}
```

**403 - Inactive User:**
```json
{
  "success": false,
  "error": "Account is not active",
  "errorCode": "AUTHORIZATION_ERROR"
}
```

## Security Best Practices

### 1. Token Storage
- **Frontend:** Store tokens in secure HTTP-only cookies or secure localStorage
- **Mobile:** Use secure keychain/keystore
- **Never:** Store tokens in plain text or unsecured locations

### 2. Token Transmission
- **Always:** Use HTTPS in production
- **Always:** Include tokens in Authorization header
- **Never:** Include tokens in URL parameters or query strings

### 3. Token Lifecycle
- **Implement:** Token refresh mechanism
- **Set:** Appropriate expiration times
- **Implement:** Logout functionality to invalidate tokens
- **Monitor:** Token usage patterns for anomalies

### 4. Error Handling
- **Don't:** Expose sensitive information in error messages
- **Do:** Log authentication failures for monitoring
- **Implement:** Rate limiting for login attempts
- **Use:** Generic error messages for security

## Rate Limiting

Authentication endpoints are protected by rate limiting:

- **Limit:** 1000 requests per 15-minute window per IP
- **Headers:** Rate limit information included in response headers
- **Error:** 429 status code when limit exceeded

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642781400
```

**Rate Limit Error:**
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later",
  "errorCode": "RATE_LIMIT_ERROR",
  "details": {
    "retryAfter": 900
  }
}
```

## Testing Authentication

### Using Postman

1. **Import Collection:** Use the provided Postman collection
2. **Set Variables:** Configure base_url, admin_email, admin_password
3. **Login:** Run the login request to get JWT token
4. **Auto-Token:** Collection automatically sets token for subsequent requests

### Using cURL

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "admin@parking.com",
    "user_password": "admin123",
    "role": "admin"
  }'

# Use token (replace with actual token)
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Using JavaScript/React

```javascript
// Authentication service
class AuthService {
  static async login(email, password, role) {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: email,
        user_password: password,
        role: role
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('jwt_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      return data;
    } else {
      throw new Error('Login failed');
    }
  }
  
  static getToken() {
    return localStorage.getItem('jwt_token');
  }
  
  static isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    // Check if token is expired (basic check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }
  
  static logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_data');
  }
}

// API service with automatic token inclusion
class ApiService {
  static async request(url, options = {}) {
    const token = AuthService.getToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };
    
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      AuthService.logout();
      window.location.href = '/login';
      return;
    }
    
    return response;
  }
}
```

## Troubleshooting

### Common Issues

1. **"Invalid token" Error**
   - Check token format and ensure it's properly formatted
   - Verify token hasn't expired
   - Ensure correct Authorization header format

2. **"Access denied" Error**
   - Verify user role has permission for the endpoint
   - Check if user account is active
   - Ensure correct role specified during login

3. **"Token has expired" Error**
   - Implement token refresh mechanism
   - Re-authenticate user
   - Check token expiration settings

4. **Rate Limiting Issues**
   - Implement exponential backoff
   - Check rate limit headers
   - Consider implementing token refresh

### Debug Tips

1. **Decode JWT Token:** Use jwt.io to decode and inspect token payload
2. **Check Server Logs:** Review authentication logs for detailed error information
3. **Verify Environment:** Ensure JWT_SECRET is properly configured
4. **Test with Postman:** Use provided collection for isolated testing

## Environment Configuration

### Required Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Server Configuration
NODE_ENV=development
PORT=3001

# CORS Configuration
REACT_APP_URL=http://localhost:5173
```

### Security Considerations

- **JWT_SECRET:** Use a strong, randomly generated secret key
- **HTTPS:** Always use HTTPS in production
- **CORS:** Configure CORS properly for your frontend domain
- **Rate Limiting:** Adjust rate limits based on your requirements