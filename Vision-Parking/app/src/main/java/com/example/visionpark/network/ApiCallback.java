package com.example.visionpark.network;

/**
 * Generic callback interface for API operations
 * Provides success and error handling for asynchronous API calls
 * 
 * @param <T> The type of data expected on success
 */
public interface ApiCallback<T> {
    
    /**
     * Called when the API request is successful
     * @param data The response data
     */
    void onSuccess(T data);
    
    /**
     * Called when the API request fails
     * @param error The error message
     */
    void onError(String error);
    
    /**
     * Called when the API request fails with additional error details
     * @param error The error message
     * @param statusCode The HTTP status code (if available)
     */
    default void onError(String error, int statusCode) {
        onError(error);
    }
    
    /**
     * Called when authentication is required (401 UNAUTHORIZED response)
     * This method provides an opportunity to redirect to login or refresh tokens
     * Default implementation calls onError with authentication message
     */
    default void onAuthenticationRequired() {
        onError("Please log in to continue", 401);
    }
}