package com.example.visionpark;

import android.app.Application;
import com.example.visionpark.network.ApiClient;

/**
 * Custom Application class for VisionPark
 * Handles application-level initialization including ApiClient setup
 */
public class VisionParkApplication extends Application {
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        // Initialize ApiClient with application context
        // This ensures the AuthInterceptor has access to TokenManager
        ApiClient.initialize(this);
    }
}