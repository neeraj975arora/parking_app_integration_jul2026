# Android Authentication and Data Type Fixes Design

## Overview

This design addresses two critical issues in the Android app: ClassCastException when passing parking lot IDs between activities, and missing authentication headers in API requests. The solution involves implementing robust data type handling and automatic token injection via OkHttp interceptors.

## Architecture

### Current Architecture Issues

1. **Data Type Mismatch**: HomeActivity passes Integer parking_lot_id but ParkingLotDetailsActivity expects String
2. **Missing Authentication**: ApiClient lacks automatic token injection mechanism
3. **Manual Token Management**: Each NetworkManager method would need manual token handling

### Proposed Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   HomeActivity  │───▶│ Intent (Fixed)   │───▶│ParkingLotDetails│
│                 │    │ - Consistent IDs │    │   Activity      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  TokenManager   │◀───│ AuthInterceptor  │◀───│ NetworkManager  │
│                 │    │ - Auto Headers   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   OkHttpClient   │───▶│   ApiService    │
                       │ - With Interceptor│    │                 │
                       └──────────────────┘    └─────────────────┘
```

## Components and Interfaces

### 1. Enhanced ParkingLotDetailsActivity

**Purpose**: Handle both Integer and String parking lot IDs gracefully

**Key Methods**:
- `extractParkingLotId()`: Enhanced to handle multiple data types
- `handleDataTypeException()`: Graceful error handling for type mismatches

**Implementation Strategy**:
```java
private void extractParkingLotId() {
    Intent intent = getIntent();
    if (intent == null) {
        showError("Error loading parking lot details", true);
        return;
    }
    
    // Try String first (preferred format)
    parkingLotId = intent.getStringExtra(EXTRA_PARKING_LOT_ID);
    
    if (parkingLotId == null) {
        // Fallback to Integer and convert to String
        int intId = intent.getIntExtra(EXTRA_PARKING_LOT_ID, 0);
        if (intId > 0) {
            parkingLotId = String.valueOf(intId);
        }
    }
    
    if (parkingLotId == null || parkingLotId.isEmpty()) {
        showError("Invalid parking lot ID", true);
    }
}
```

### 2. Authentication Interceptor

**Purpose**: Automatically inject JWT tokens into API requests

**Key Features**:
- Retrieves token from TokenManager
- Adds Authorization header to authenticated endpoints
- Handles missing tokens gracefully
- Provides detailed logging for debugging

**Implementation Strategy**:
```java
public class AuthInterceptor implements Interceptor {
    private Context context;
    
    @Override
    public Response intercept(Chain chain) throws IOException {
        Request originalRequest = chain.request();
        
        // Get token from TokenManager
        String token = TokenManager.getToken(context);
        
        if (token != null && !token.isEmpty()) {
            Request authenticatedRequest = originalRequest.newBuilder()
                .header("Authorization", "Bearer " + token)
                .build();
            return chain.proceed(authenticatedRequest);
        }
        
        // Proceed without auth header for public endpoints
        return chain.proceed(originalRequest);
    }
}
```

### 3. Enhanced ApiClient

**Purpose**: Configure OkHttp with authentication interceptor

**Key Changes**:
- Add AuthInterceptor to OkHttp client
- Maintain singleton pattern
- Preserve existing functionality

**Implementation Strategy**:
```java
public class ApiClient {
    private static Retrofit retrofit = null;
    private static Context appContext;
    
    public static void initialize(Context context) {
        appContext = context.getApplicationContext();
    }
    
    public static Retrofit getClient() {
        if (retrofit == null) {
            OkHttpClient okHttpClient = new OkHttpClient.Builder()
                .addInterceptor(new AuthInterceptor(appContext))
                .addInterceptor(new LoggingInterceptor())
                .build();
                
            retrofit = new Retrofit.Builder()
                .baseUrl(BuildConfig.BASE_URL)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        }
        return retrofit;
    }
}
```

### 4. Enhanced NetworkManager Error Handling

**Purpose**: Handle 401 responses and provide user feedback

**Key Features**:
- Detect 401 UNAUTHORIZED responses
- Trigger re-authentication flow
- Provide user-friendly error messages

## Data Models

### Enhanced ApiCallback Interface

```java
public interface ApiCallback<T> {
    void onSuccess(T data);
    void onError(String error);
    void onError(String error, int httpCode); // Enhanced for HTTP status codes
    void onAuthenticationRequired(); // New method for 401 handling
}
```

### Intent Data Handling

**Current Problem**: 
```java
// HomeActivity (passes Integer)
intent.putExtra(EXTRA_PARKING_LOT_ID, parkingLot.getId()); // getId() returns int

// ParkingLotDetailsActivity (expects String)
parkingLotId = intent.getStringExtra(EXTRA_PARKING_LOT_ID); // ClassCastException
```

**Solution**:
```java
// HomeActivity (convert to String)
intent.putExtra(EXTRA_PARKING_LOT_ID, String.valueOf(parkingLot.getId()));

// ParkingLotDetailsActivity (handle both types)
parkingLotId = extractParkingLotIdSafely(intent);
```

## Error Handling

### 1. Data Type Exception Handling

**Strategy**: Try-catch blocks with graceful fallbacks
- Primary: Extract as String
- Fallback: Extract as Integer and convert
- Error: Show user-friendly message and log details

### 2. Authentication Error Handling

**Strategy**: Centralized 401 response handling
- Detect 401 responses in NetworkManager
- Clear invalid tokens
- Redirect to login screen
- Provide retry mechanism

### 3. Network Error Handling

**Strategy**: Enhanced error reporting
- HTTP status code awareness
- Specific error messages for common scenarios
- Logging for debugging purposes

## Testing Strategy

### 1. Unit Tests

**ParkingLotDetailsActivity**:
- Test Integer ID extraction
- Test String ID extraction
- Test invalid ID handling
- Test error message display

**AuthInterceptor**:
- Test token injection with valid token
- Test request without token
- Test token retrieval failure

### 2. Integration Tests

**End-to-End Flow**:
- Login → Token storage → API request with auth header
- Parking lot click → Details activity with correct ID
- 401 response → Login redirect

### 3. Error Scenario Tests

**Data Type Errors**:
- Invalid Intent extras
- Null parking lot ID
- Malformed data

**Authentication Errors**:
- Missing token
- Invalid token
- Expired token
- Network failures

## Implementation Phases

### Phase 1: Data Type Fixes
1. Update ParkingLotDetailsActivity.extractParkingLotId()
2. Add robust error handling
3. Test with both Integer and String IDs

### Phase 2: Authentication Infrastructure
1. Create AuthInterceptor class
2. Update ApiClient with OkHttp interceptor
3. Initialize ApiClient in Application class

### Phase 3: Enhanced Error Handling
1. Update NetworkManager with 401 handling
2. Add authentication required callbacks
3. Implement login redirect logic

### Phase 4: Testing and Validation
1. Test all data type scenarios
2. Verify authentication headers in requests
3. Test error handling flows
4. Performance and stability testing

## Security Considerations

### Token Security
- Tokens stored in EncryptedSharedPreferences
- No token logging in production builds
- Automatic token cleanup on logout

### Request Security
- HTTPS enforcement
- Certificate pinning (future enhancement)
- Request timeout configuration

### Error Information
- Sanitized error messages for users
- Detailed logging for developers only
- No sensitive data in logs