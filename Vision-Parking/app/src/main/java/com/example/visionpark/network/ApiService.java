package com.example.visionpark.network;

import com.example.visionpark.models.ParkingLot;
import com.example.visionpark.models.ParkingSession;
import com.example.visionpark.models.PaymentInfo;
import com.example.visionpark.models.UserVehicle;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

import java.util.List;

/**
 * API Service interface for parking lot related operations
 * This interface defines the REST API endpoints for parking lot discovery and details
 */
public interface ApiService {
    
    /**
     * Get detailed information about a specific parking lot
     * @param lotId The parking lot ID
     * @return Call object containing ParkingLot details
     */
    @GET("parking/lots/{id}/details")
    Call<ApiResponse<ParkingLot>> getParkingLotDetails(@Path("id") String lotId);
    
    /**
     * Get nearby parking lots with optional filtering
     * @param latitude User's current latitude
     * @param longitude User's current longitude
     * @param radius Search radius in meters (default 3000m)
     * @param maxPrice Optional maximum price filter
     * @param minAvailability Optional minimum availability filter
     * @param vehicleType Optional vehicle type filter (default "car")
     * @return Call object containing list of nearby parking lots
     */
    @GET("parking/lots/nearby")
    Call<ApiResponse<List<ParkingLot>>> getNearbyParkingLots(
        @Query("latitude") double latitude,
        @Query("longitude") double longitude,
        @Query("radius") int radius,
        @Query("max_price") Double maxPrice,
        @Query("min_availability") Integer minAvailability,
        @Query("vehicle_type") String vehicleType
    );
    
    /**
     * Get all vehicles for the authenticated user
     * @return Call object containing list of user vehicles
     */
    @GET("user/vehicles")
    Call<ApiResponse<List<UserVehicle>>> getUserVehicles();
    
    /**
     * Create a new vehicle for the authenticated user
     * @param vehicle The vehicle data to create
     * @return Call object containing the created vehicle
     */
    @POST("user/vehicles")
    Call<ApiResponse<UserVehicle>> createVehicle(@Body CreateVehicleRequest vehicle);
    
    /**
     * Update an existing vehicle
     * @param vehicleId The ID of the vehicle to update
     * @param vehicle The updated vehicle data
     * @return Call object containing the updated vehicle
     */
    @PUT("user/vehicles/{vehicleId}")
    Call<ApiResponse<UserVehicle>> updateVehicle(@Path("vehicleId") int vehicleId, @Body UpdateVehicleRequest vehicle);
    
    /**
     * Delete a vehicle (soft delete)
     * @param vehicleId The ID of the vehicle to delete
     * @return Call object containing success response
     */
    @DELETE("user/vehicles/{vehicleId}")
    Call<ApiResponse<Void>> deleteVehicle(@Path("vehicleId") int vehicleId);
    
    /**
     * Start a new parking session (check-in)
     * @param request The session check-in request
     * @return Call object containing the created parking session
     */
    @POST("user/sessions/check-in")
    Call<ApiResponse<ParkingSession>> startParkingSession(@Body SessionCheckInRequest request);
    
    /**
     * End a parking session (checkout)
     * @param request The session checkout request
     * @return Call object containing payment information
     */
    @POST("user/sessions/checkout")
    Call<ApiResponse<PaymentInfo>> endParkingSession(@Body SessionCheckoutRequest request);
    
    /**
     * Get all active sessions for the authenticated user
     * @return Call object containing list of active sessions
     */
    @GET("user/sessions/active")
    Call<ApiResponse<List<ParkingSession>>> getActiveSessions();
    
    /**
     * Get session history for the authenticated user
     * @return Call object containing list of past sessions
     */
    @GET("user/sessions/history")
    Call<ApiResponse<List<ParkingSession>>> getSessionHistory();
    
    /**
     * Generic API response wrapper
     * @param <T> The type of data being returned
     */
    public static class ApiResponse<T> {
        private boolean success;
        private T data;
        private String error;
        private String message;
        
        // Constructors
        public ApiResponse() {}
        
        public ApiResponse(boolean success, T data, String error) {
            this.success = success;
            this.data = data;
            this.error = error;
        }
        
        // Getters and setters
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        
        public T getData() { return data; }
        public void setData(T data) { this.data = data; }
        
        public String getError() { return error; }
        public void setError(String error) { this.error = error; }
        
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}