# Error Reference Guide

## Overview

The Parking Admin Mock Server uses a standardized error response format with consistent HTTP status codes and detailed error information. This guide provides comprehensive information about all possible errors and how to handle them.

## Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "errorCode": "MACHINE_READABLE_ERROR_CODE",
  "timestamp": "2025-01-21T10:30:00Z",
  "correlationId": "err_1642781400_abc123def",
  "details": {
    // Additional error-specific information
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `false` for error responses |
| `error` | string | Human-readable error message |
| `errorCode` | string | Machine-readable error identifier |
| `timestamp` | string | ISO 8601 timestamp when error occurred |
| `correlationId` | string | Unique identifier for error tracking |
| `details` | object | Additional context-specific information |

## HTTP Status Codes

### 2xx Success
- **200 OK** - Request successful
- **201 Created** - Resource created successfully

### 4xx Client Errors
- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Authentication required or failed
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource conflict (duplicate, business rule violation)
- **422 Unprocessable Entity** - Business logic validation failed
- **429 Too Many Requests** - Rate limit exceeded

### 5xx Server Errors
- **500 Internal Server Error** - Unexpected server error
- **502 Bad Gateway** - External service error
- **503 Service Unavailable** - Server temporarily unavailable

## Error Categories

### 1. Validation Errors (400)

**Error Code:** `VALIDATION_ERROR`

Occurs when request data doesn't meet validation requirements.

**Example Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "timestamp": "2025-01-21T10:30:00Z",
  "correlationId": "err_1642781400_abc123def",
  "details": {
    "source": "body",
    "errors": [
      {
        "field": "user_email",
        "message": "Please provide a valid email address",
        "value": "invalid-email",
        "type": "string.email"
      },
      {
        "field": "assigned_lots",
        "message": "At least one parking lot must be assigned",
        "value": [],
        "type": "array.min"
      }
    ]
  }
}
```

**Common Validation Errors:**

| Field Type | Error | Message |
|------------|-------|---------|
| Email | Invalid format | "Please provide a valid email address" |
| Password | Too weak | "Password must contain at least 8 characters with uppercase, lowercase, number and special character" |
| Phone | Invalid format | "Phone number must be a valid Indian mobile number" |
| Vehicle Reg | Invalid format | "Vehicle registration number must be in valid Indian format (e.g., DL01AB1234)" |
| Required Field | Missing | "{field} is required" |
| Array | Too few items | "At least {min} items must be provided" |
| Number | Out of range | "{field} must be between {min} and {max}" |

### 2. Authentication Errors (401)

**Error Code:** `AUTHENTICATION_ERROR`

Occurs when authentication is required but missing or invalid.

**Common Scenarios:**

**Missing Token:**
```json
{
  "success": false,
  "error": "Access token is required",
  "errorCode": "AUTHENTICATION_ERROR",
  "timestamp": "2025-01-21T10:30:00Z",
  "help": "Please check your credentials and try again",
  "loginUrl": "/auth/login"
}
```

**Invalid Token:**
```json
{
  "success": false,
  "error": "Invalid token",
  "errorCode": "AUTHENTICATION_ERROR",
  "timestamp": "2025-01-21T10:30:00Z"
}
```

**Expired Token:**
```json
{
  "success": false,
  "error": "Token has expired",
  "errorCode": "AUTHENTICATION_ERROR",
  "timestamp": "2025-01-21T10:30:00Z"
}
```

**Invalid Credentials:**
```json
{
  "success": false,
  "error": "Invalid credentials",
  "errorCode": "AUTHENTICATION_ERROR",
  "timestamp": "2025-01-21T10:30:00Z"
}
```

### 3. Authorization Errors (403)

**Error Code:** `AUTHORIZATION_ERROR`

Occurs when user lacks sufficient permissions for the requested operation.

**Example Response:**
```json
{
  "success": false,
  "error": "Insufficient permissions for this operation",
  "errorCode": "AUTHORIZATION_ERROR",
  "timestamp": "2025-01-21T10:30:00Z",
  "help": "You do not have permission to perform this action",
  "details": {
    "requiredRole": "super_admin",
    "currentRole": "admin"
  }
}
```

**Common Authorization Scenarios:**

| Scenario | Error Message |
|----------|---------------|
| Super Admin Only | "Only super administrators can manage admin accounts" |
| Admin Access | "You do not have access to perform this operation on the specified parking lot" |
| Self Access | "You can only access your own data" |
| Inactive Account | "Account is not active" |

### 4. Not Found Errors (404)

**Error Code:** `NOT_FOUND_ERROR`

Occurs when requested resource doesn't exist.

**Example Response:**
```json
{
  "success": false,
  "error": "Admin with ID 999 not found",
  "errorCode": "NOT_FOUND_ERROR",
  "timestamp": "2025-01-21T10:30:00Z",
  "help": "The requested resource could not be found",
  "details": {
    "resource": "Admin",
    "identifier": "999"
  }
}
```

**Common Not Found Scenarios:**

| Resource | Error Message |
|----------|---------------|
| Admin | "Admin with ID {id} not found" |
| Session | "No session found with ticket ID {ticket_id}" |
| Parking Lot | "Parking lot with ID {lot_id} does not exist" |
| Closure | "No closure found with ID {closure_id}" |
| Payment | "No payment found with ID {payment_id}" |

### 5. Conflict Errors (409)

**Error Code:** `CONFLICT_ERROR`

Occurs when request conflicts with current resource state.

**Example Response:**
```json
{
  "success": false,
  "error": "Email address is already registered with another admin account",
  "errorCode": "CONFLICT_ERROR",
  "timestamp": "2025-01-21T10:30:00Z",
  "help": "The request conflicts with the current state of the resource"
}
```

**Common Conflict Scenarios:**

| Scenario | Error Message |
|----------|---------------|
| Duplicate Email | "Email address is already registered" |
| Slot Occupied | "Slot {slot_id} in lot {lot_id} is already occupied" |
| Vehicle Active | "Vehicle {reg_no} is already in an active parking session" |
| Closure Exists | "Closure already exists for date {date} and admin {admin_id}" |
| Session Not Active | "Session {ticket_id} is not active (current status: {status})" |

### 6. Business Logic Errors (422)

**Error Code:** `BUSINESS_LOGIC_ERROR`

Occurs when request violates business rules.

**Example Response:**
```json
{
  "success": false,
  "error": "Payment amount ₹100.00 is less than due amount ₹125.00",
  "errorCode": "BUSINESS_LOGIC_ERROR",
  "timestamp": "2025-01-21T10:30:00Z",
  "details": {
    "rule": "payment_amount_validation",
    "expected": 125.00,
    "received": 100.00
  }
}
```

**Common Business Logic Errors:**

| Rule | Error Message |
|------|---------------|
| Lot Capacity | "No {vehicle_type} slots available in {lot_name}" |
| Payment Amount | "Payment amount ₹{amount} is less than due amount ₹{due}" |
| Session Duration | "Total session duration cannot exceed 24 hours" |
| Financial Calculation | "Amount paid ₹{paid} significantly exceeds total due ₹{due}" |
| Date Range | "Start date cannot be later than end date" |

### 7. Rate Limit Errors (429)

**Error Code:** `RATE_LIMIT_ERROR`

Occurs when request rate limit is exceeded.

**Example Response:**
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later",
  "errorCode": "RATE_LIMIT_ERROR",
  "timestamp": "2025-01-21T10:30:00Z",
  "help": "You have exceeded the rate limit. Please try again later",
  "details": {
    "retryAfter": 900,
    "limit": 1000,
    "window": "15 minutes"
  }
}
```

### 8. Server Errors (500)

**Error Code:** `INTERNAL_SERVER_ERROR`

Occurs when unexpected server error happens.

**Example Response:**
```json
{
  "success": false,
  "error": "An internal server error occurred. Please try again later",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "timestamp": "2025-01-21T10:30:00Z",
  "correlationId": "err_1642781400_abc123def",
  "help": "An internal server error occurred. Please try again later"
}
```

## Error Handling Best Practices

### 1. Client-Side Error Handling

```javascript
async function handleApiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new ApiError(data);
    }
    
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      handleApiError(error);
    } else {
      handleNetworkError(error);
    }
  }
}

class ApiError extends Error {
  constructor(errorData) {
    super(errorData.error);
    this.name = 'ApiError';
    this.errorCode = errorData.errorCode;
    this.statusCode = errorData.statusCode;
    this.details = errorData.details;
    this.correlationId = errorData.correlationId;
  }
}

function handleApiError(error) {
  switch (error.errorCode) {
    case 'AUTHENTICATION_ERROR':
      // Redirect to login
      window.location.href = '/login';
      break;
      
    case 'AUTHORIZATION_ERROR':
      // Show access denied message
      showErrorMessage('You do not have permission to perform this action');
      break;
      
    case 'VALIDATION_ERROR':
      // Show field-specific validation errors
      showValidationErrors(error.details.errors);
      break;
      
    case 'RATE_LIMIT_ERROR':
      // Show rate limit message with retry time
      showRateLimitMessage(error.details.retryAfter);
      break;
      
    default:
      // Show generic error message
      showErrorMessage(error.message);
  }
}
```

### 2. React Error Handling

```jsx
import { useState } from 'react';

function useApiError() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleRequest = async (requestFn) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await requestFn();
      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const clearError = () => setError(null);
  
  return { error, loading, handleRequest, clearError };
}

// Usage in component
function AdminForm() {
  const { error, loading, handleRequest } = useApiError();
  
  const handleSubmit = async (formData) => {
    try {
      await handleRequest(() => createAdmin(formData));
      // Success handling
    } catch (error) {
      // Error is already set in state
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorDisplay error={error} />}
      {/* Form fields */}
    </form>
  );
}

function ErrorDisplay({ error }) {
  if (error.errorCode === 'VALIDATION_ERROR') {
    return (
      <div className="validation-errors">
        {error.details.errors.map((err, index) => (
          <div key={index} className="field-error">
            <strong>{err.field}:</strong> {err.message}
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="error-message">
      {error.message}
      {error.correlationId && (
        <small>Error ID: {error.correlationId}</small>
      )}
    </div>
  );
}
```

### 3. Retry Logic

```javascript
async function apiRequestWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After') || 60;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      if (response.status >= 500 && attempt < maxRetries) {
        // Server error - exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Network error - exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Troubleshooting Guide

### Common Error Scenarios

#### 1. Authentication Issues

**Problem:** Getting 401 errors on protected endpoints

**Solutions:**
1. Check if JWT token is included in Authorization header
2. Verify token format: `Bearer <token>`
3. Check if token has expired
4. Ensure user account is still active
5. Verify JWT_SECRET configuration

**Debug Steps:**
```bash
# Decode JWT token to check expiration
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | cut -d. -f2 | base64 -d | jq

# Test authentication endpoint
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 2. Permission Issues

**Problem:** Getting 403 errors for admin operations

**Solutions:**
1. Verify user role (super_admin vs admin)
2. Check if admin has access to specified parking lots
3. Ensure operation is allowed for user's role
4. Verify user account is active

#### 3. Validation Errors

**Problem:** Getting 400 errors with validation messages

**Solutions:**
1. Check request body format and required fields
2. Verify data types and formats (email, phone, vehicle registration)
3. Ensure array fields have minimum required items
4. Check field length constraints

#### 4. Resource Not Found

**Problem:** Getting 404 errors for existing resources

**Solutions:**
1. Verify resource ID is correct
2. Check if resource exists in mock data
3. Ensure user has access to the resource
4. Verify URL path and parameters

#### 5. Business Logic Violations

**Problem:** Getting 422 errors for business rule violations

**Solutions:**
1. Check business rule constraints (capacity, payment amounts, etc.)
2. Verify data relationships (sessions, lots, users)
3. Ensure operation timing is valid
4. Check financial calculation accuracy

### Error Monitoring

#### 1. Correlation IDs

Use correlation IDs to track errors across requests:

```javascript
// Include correlation ID in API requests
const correlationId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

fetch('/api/endpoint', {
  headers: {
    'X-Correlation-ID': correlationId,
    'Authorization': `Bearer ${token}`
  }
});
```

#### 2. Error Logging

Log errors for monitoring and debugging:

```javascript
function logError(error, context) {
  console.error('API Error:', {
    message: error.message,
    errorCode: error.errorCode,
    correlationId: error.correlationId,
    context: context,
    timestamp: new Date().toISOString()
  });
  
  // Send to error monitoring service
  if (window.errorTracker) {
    window.errorTracker.captureException(error, { extra: context });
  }
}
```

#### 3. Health Monitoring

Monitor API health and error rates:

```javascript
// Check API health
async function checkApiHealth() {
  try {
    const response = await fetch('/health');
    const health = await response.json();
    
    if (health.status !== 'healthy') {
      console.warn('API health degraded:', health);
    }
    
    return health;
  } catch (error) {
    console.error('API health check failed:', error);
    return { status: 'unhealthy', error: error.message };
  }
}

// Monitor error rates
setInterval(async () => {
  const metrics = await fetch('/metrics').then(r => r.json());
  const errorRate = metrics.derived.errorRate;
  
  if (errorRate > 5) { // 5% error rate threshold
    console.warn(`High error rate detected: ${errorRate}%`);
  }
}, 60000); // Check every minute
```

## Error Code Reference

### Complete Error Code List

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request data validation failed |
| `AUTHENTICATION_ERROR` | 401 | Authentication required or failed |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND_ERROR` | 404 | Requested resource not found |
| `CONFLICT_ERROR` | 409 | Resource conflict or duplicate |
| `BUSINESS_LOGIC_ERROR` | 422 | Business rule violation |
| `RATE_LIMIT_ERROR` | 429 | Request rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `EXTERNAL_SERVICE_ERROR` | 502 | External service failure |
| `SERVICE_UNAVAILABLE` | 503 | Server temporarily unavailable |

### Error Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| **Critical** | System failure, data corruption | Immediate attention |
| **Warning** | Degraded functionality | Monitor and investigate |
| **Info** | Expected errors (validation, auth) | Normal handling |

This comprehensive error reference should help you understand, handle, and troubleshoot all possible error scenarios in the Parking Admin Mock Server API.