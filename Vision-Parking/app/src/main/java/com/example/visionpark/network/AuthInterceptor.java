package com.example.visionpark.network;

import android.content.Context;
import android.util.Log;
import androidx.annotation.NonNull;
import com.example.visionpark.utils.TokenManager;
import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;
import java.io.IOException;

/**
 * AuthInterceptor automatically injects JWT tokens into API requests
 * Implements OkHttp Interceptor interface for automatic token management
 */
public class AuthInterceptor implements Interceptor {
    private static final String TAG = "AuthInterceptor";
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    
    private final Context context;
    
    public AuthInterceptor(Context context) {
        this.context = context.getApplicationContext();
    }
    
    @NonNull
    @Override
    public Response intercept(@NonNull Chain chain) throws IOException {
        Request originalRequest = chain.request();
        
        // Get token from TokenManager
        String token = TokenManager.getToken(context);
        
        if (token != null && !token.trim().isEmpty()) {
            // Add Authorization header with Bearer token
            Request authenticatedRequest = originalRequest.newBuilder()
                    .header(AUTHORIZATION_HEADER, BEARER_PREFIX + token)
                    .build();
            
            Log.d(TAG, "Adding Authorization header to request: " + originalRequest.url());
            Log.d(TAG, "Token present: true");
            
            return chain.proceed(authenticatedRequest);
        } else {
            // Proceed without auth header for public endpoints
            Log.d(TAG, "No token available for request: " + originalRequest.url());
            Log.d(TAG, "Token present: false");
            
            return chain.proceed(originalRequest);
        }
    }
}