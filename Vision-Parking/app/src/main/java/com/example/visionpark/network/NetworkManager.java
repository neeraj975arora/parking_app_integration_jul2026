package com.example.visionpark.network;

import android.content.Context;
import android.util.Log;

import com.example.visionpark.models.ParkingLot;
import com.example.visionpark.models.ParkingSession;
import com.example.visionpark.models.PaymentInfo;
import com.example.visionpark.models.UserVehicle;
import com.example.visionpark.utils.TokenManager;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

import java.util.List;

/**
 * Network manager class that handles API calls and provides a simplified interface
 * for the application to interact with backend services
 */
public class NetworkManager {
    
    private static final String TAG = "NetworkManager";
    private static NetworkManager instance;
    private ApiService apiService;
    private Context context;
    
    private NetworkManager(Context context) {
        this.context = context.getApplicationContext();
        this.apiService = ApiClient.getClient().create(ApiService.class);
    }
    
    public static synchronized NetworkManager getInstance(Context context) {
        if (instance == null) {
            instance = new NetworkManager(context);
        }
        return instance;
    }
    
    /**
     * Fetch detailed information about a specific parking lot
     * @param lotId The parking lot ID
     * @param callback Callback to handle success/error responses
     */
    public void getParkingLotDetails(String lotId, ApiCallback<ParkingLot> callback) {
        Log.d(TAG, "Fetching parking lot details for ID: " + lotId);
        
        Call<ApiService.ApiResponse<ParkingLot>> call = apiService.getParkingLotDetails(lotId);
        
        call.enqueue(new Callback<ApiService.ApiResponse<ParkingLot>>() {
            @Override
            public void onResponse(Call<ApiService.ApiResponse<ParkingLot>> call, 
                                 Response<ApiService.ApiResponse<ParkingLot>> response) {
                handleApiResponse(response, callback, "Failed to load parking lot details. Please try again.");
            }
            
            @Override
            public void onFailure(Call<ApiService.ApiResponse<ParkingLot>> call, Throwable t) {
                handleNetworkFailure(t, callback);
            }
        });
    }
    
    /**
     * Fetch nearby parking lots with optional filtering
     * @param latitude User's current latitude
     * @param longitude User's current longitude
     * @param radius Search radius in meters
     * @param callback Callback to handle success/error responses
     */
    public void getNearbyParkingLots(double latitude, double longitude, int radius, 
                                   ApiCallback<List<ParkingLot>> callback) {
        Log.d(TAG, String.format("Fetching nearby parking lots at %.6f, %.6f within %dm", 
                                latitude, longitude, radius));
        
        Call<ApiService.ApiResponse<List<ParkingLot>>> call = apiService.getNearbyParkingLots(
            latitude, longitude, radius, null, null, "car"
        );
        
        call.enqueue(new Callback<ApiService.ApiResponse<List<ParkingLot>>>() {
            @Override
            public void onResponse(Call<ApiService.ApiResponse<List<ParkingLot>>> call, 
                                 Response<ApiService.ApiResponse<List<ParkingLot>>> response) {
                handleApiResponse(response, callback, "Failed to load nearby parking lots. Please try again.");
            }
            
            @Override
            public void onFailure(Call<ApiService.ApiResponse<List<ParkingLot>>> call, Throwable t) {
                handleNetworkFailure(t, callback);
            }
        });
    }
    
    /**
     * Check if user is authenticated
     * @return true if user has valid authentication token
     */
    public boolean isAuthenticated() {
        String token = TokenManager.getToken(context);
        return token != null && !token.isEmpty();
    }
    
    /**
     * Get authentication token for API requests
     * @return JWT token or null if not authenticated
     */
    public String getAuthToken() {
        return TokenManager.getToken(context);
    }
    
    /**
     * Helper method to handle API responses with enhanced error handling
     * Detects 401 UNAUTHORIZED responses and triggers authentication required callback
     * 
     * @param response The Retrofit response
     * @param callback The callback to handle success/error
     * @param defaultErrorMessage Default error message for non-specific errors
     * @param <T> The type of data expected
     */
    private <T> void handleApiResponse(Response<ApiService.ApiResponse<T>> response, 
                                     ApiCallback<T> callback, 
                                     String defaultErrorMessage) {
        if (response.isSuccessful() && response.body() != null) {
            ApiService.ApiResponse<T> apiResponse = response.body();
            
            if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                callback.onSuccess(apiResponse.getData());
            } else {
                String error = apiResponse.getError() != null ? 
                             apiResponse.getError() : defaultErrorMessage;
                Log.e(TAG, "API returned error: " + error);
                callback.onError(error);
            }
        } else {
            int statusCode = response.code();
            String errorMessage = defaultErrorMessage;
            
            // Handle specific HTTP status codes
            if (statusCode == 401) {
                Log.w(TAG, "401 UNAUTHORIZED response received - authentication required");
                callback.onAuthenticationRequired();
                return;
            } else if (statusCode == 403) {
                errorMessage = "Access denied. You don't have permission to perform this action.";
            } else if (statusCode == 404) {
                errorMessage = "The requested resource was not found.";
            } else if (statusCode == 409) {
                errorMessage = "Conflict occurred. The resource already exists or is in use.";
            } else if (statusCode == 422) {
                errorMessage = "Invalid data provided. Please check your input and try again.";
            } else if (statusCode >= 500) {
                errorMessage = "Server error occurred. Please try again later.";
            }
            
            Log.e(TAG, "HTTP error: " + statusCode + " - " + response.message());
            callback.onError(errorMessage, statusCode);
        }
    }
    
    /**
     * Helper method to handle network failures
     * 
     * @param throwable The network error
     * @param callback The callback to handle the error
     * @param <T> The type of data expected
     */
    private <T> void handleNetworkFailure(Throwable throwable, ApiCallback<T> callback) {
        String error = "Network error. Please check your connection and try again.";
        Log.e(TAG, "Network request failed", throwable);
        callback.onError(error);
    }
    
    /**
     * Fetch all vehicles for the authenticated user
     * @param callback Callback to handle success/error responses
     */
    public void getUserVehicles(ApiCallback<List<UserVehicle>> callback) {
        if (!isAuthenticated()) {
            callback.onAuthenticationRequired();
            return;
        }
        
        Log.d(TAG, "Fetching user vehicles");
        
        Call<ApiService.ApiResponse<List<UserVehicle>>> call = apiService.getUserVehicles();
        
        call.enqueue(new Callback<ApiService.ApiResponse<List<UserVehicle>>>() {
            @Override
            public void onResponse(Call<ApiService.ApiResponse<List<UserVehicle>>> call, 
                                 Response<ApiService.ApiResponse<List<UserVehicle>>> response) {
                handleApiResponse(response, callback, "Failed to load vehicles. Please try again.");
            }
            
            @Override
            public void onFailure(Call<ApiService.ApiResponse<List<UserVehicle>>> call, Throwable t) {
                handleNetworkFailure(t, callback);
            }
        });
    }
    
    /**
     * Create a new vehicle for the authenticated user
     * @param request The vehicle creation request
     * @param callback Callback to handle success/error responses
     */
    public void createVehicle(CreateVehicleRequest request, ApiCallback<UserVehicle> callback) {
        if (!isAuthenticated()) {
            callback.onAuthenticationRequired();
            return;
        }
        
        Log.d(TAG, "Creating new vehicle: " + request.getRegistration_number());
        
        Call<ApiService.ApiResponse<UserVehicle>> call = apiService.createVehicle(request);
        
        call.enqueue(new Callback<ApiService.ApiResponse<UserVehicle>>() {
            @Override
            public void onResponse(Call<ApiService.ApiResponse<UserVehicle>> call, 
                                 Response<ApiService.ApiResponse<UserVehicle>> response) {
                handleApiResponse(response, callback, "Failed to create vehicle. Please try again.");
            }
            
            @Override
            public void onFailure(Call<ApiService.ApiResponse<UserVehicle>> call, Throwable t) {
                handleNetworkFailure(t, callback);
            }
        });
    }
    
    /**
     * Update an existing vehicle
     * @param vehicleId The ID of the vehicle to update
     * @param request The vehicle update request
     * @param callback Callback to handle success/error responses
     */
    public void updateVehicle(int vehicleId, UpdateVehicleRequest request, ApiCallback<UserVehicle> callback) {
        if (!isAuthenticated()) {
            callback.onAuthenticationRequired();
            return;
        }
        
        Log.d(TAG, "Updating vehicle: " + vehicleId);
        
        Call<ApiService.ApiResponse<UserVehicle>> call = apiService.updateVehicle(vehicleId, request);
        
        call.enqueue(new Callback<ApiService.ApiResponse<UserVehicle>>() {
            @Override
            public void onResponse(Call<ApiService.ApiResponse<UserVehicle>> call, 
                                 Response<ApiService.ApiResponse<UserVehicle>> response) {
                handleApiResponse(response, callback, "Failed to update vehicle. Please try again.");
            }
            
            @Override
            public void onFailure(Call<ApiService.ApiResponse<UserVehicle>> call, Throwable t) {
                handleNetworkFailure(t, callback);
            }
        });
    }
    
    /**
     * Delete a vehicle (soft delete)
     * @param vehicleId The ID of the vehicle to delete
     * @param callback Callback to handle success/error responses
     */
    public void deleteVehicle(int vehicleId, ApiCallback<Void> callback) {
        if (!isAuthenticated()) {
            callback.onAuthenticationRequired();
            return;
        }
        
        Log.d(TAG, "Deleting vehicle: " + vehicleId);
        
        Call<ApiService.ApiResponse<Void>> call = apiService.deleteVehicle(vehicleId);
        
        call.enqueue(new Callback<ApiService.ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiService.ApiResponse<Void>> call, 
                                 Response<ApiService.ApiResponse<Void>> response) {
                handleApiResponse(response, callback, "Failed to delete vehicle. Please try again.");
            }
            
            @Override
            public void onFailure(Call<ApiService.ApiResponse<Void>> call, Throwable t) {
                handleNetworkFailure(t, callback);
            }
        });
    }
    
    /**
     * Start a new parking session
     * @param request The session check-in request
     * @param callback Callback to handle success/error responses
     */
    public void startParkingSession(SessionCheckInRequest request, ApiCallback<ParkingSession> callback) {
        if (!isAuthenticated()) {
            callback.onAuthenticationRequired();
            return;
        }
        
        Log.d(TAG, "Starting parking session for vehicle: " + request.getVehicle_id());
        
        Call<ApiService.ApiResponse<ParkingSession>> call = apiService.startParkingSession(request);
        
        call.enqueue(new Callback<ApiService.ApiResponse<ParkingSession>>() {
            @Override
            public void onResponse(Call<ApiService.ApiResponse<ParkingSession>> call, 
                                 Response<ApiService.ApiResponse<ParkingSession>> response) {
                handleApiResponse(response, callback, "Failed to start parking session. Please try again.");
            }
            
            @Override
            public void onFailure(Call<ApiService.ApiResponse<ParkingSession>> call, Throwable t) {
                handleNetworkFailure(t, callback);
            }
        });
    }
    
    /**
     * End a parking session
     * @param request The session checkout request
     * @param callback Callback to handle success/error responses
     */
    public void endParkingSession(SessionCheckoutRequest request, ApiCallback<PaymentInfo> callback) {
        if (!isAuthenticated()) {
            callback.onAuthenticationRequired();
            return;
        }
        
        Log.d(TAG, "Ending parking session: " + request.getTicket_id());
        
        Call<ApiService.ApiResponse<PaymentInfo>> call = apiService.endParkingSession(request);
        
        call.enqueue(new Callback<ApiService.ApiResponse<PaymentInfo>>() {
            @Override
            public void onResponse(Call<ApiService.ApiResponse<PaymentInfo>> call, 
                                 Response<ApiService.ApiResponse<PaymentInfo>> response) {
                handleApiResponse(response, callback, "Failed to end parking session. Please try again.");
            }
            
            @Override
            public void onFailure(Call<ApiService.ApiResponse<PaymentInfo>> call, Throwable t) {
                handleNetworkFailure(t, callback);
            }
        });
    }
    
    /**
     * Get all active sessions for the authenticated user
     * @param callback Callback to handle success/error responses
     */
    public void getActiveSessions(ApiCallback<List<ParkingSession>> callback) {
        if (!isAuthenticated()) {
            callback.onAuthenticationRequired();
            return;
        }
        
        Log.d(TAG, "Fetching active sessions");
        
        Call<ApiService.ApiResponse<List<ParkingSession>>> call = apiService.getActiveSessions();
        
        call.enqueue(new Callback<ApiService.ApiResponse<List<ParkingSession>>>() {
            @Override
            public void onResponse(Call<ApiService.ApiResponse<List<ParkingSession>>> call, 
                                 Response<ApiService.ApiResponse<List<ParkingSession>>> response) {
                handleApiResponse(response, callback, "Failed to load active sessions. Please try again.");
            }
            
            @Override
            public void onFailure(Call<ApiService.ApiResponse<List<ParkingSession>>> call, Throwable t) {
                handleNetworkFailure(t, callback);
            }
        });
    }
}