package com.example.visionpark.network;

import android.content.Context;
import com.example.visionpark.BuildConfig;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class ApiClient {

    private static Retrofit retrofit = null;
    private static Context appContext = null;

    /**
     * Initialize ApiClient with application context
     * This must be called before using getClient()
     */
    public static void initialize(Context context) {
        appContext = context.getApplicationContext();
        // Reset retrofit instance to force recreation with new context
        retrofit = null;
    }

    public static Retrofit getClient() {
        if (retrofit == null) {
            // Create OkHttp client with interceptors
            OkHttpClient.Builder okHttpBuilder = new OkHttpClient.Builder();
            
            // Add authentication interceptor if context is available
            if (appContext != null) {
                okHttpBuilder.addInterceptor(new AuthInterceptor(appContext));
            }
            
            // Add logging interceptor for debugging (only in debug builds)
            if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor loggingInterceptor = new HttpLoggingInterceptor();
                loggingInterceptor.setLevel(HttpLoggingInterceptor.Level.HEADERS);
                okHttpBuilder.addInterceptor(loggingInterceptor);
            }
            
            OkHttpClient okHttpClient = okHttpBuilder.build();
            
            // Configure Gson to handle ISO 8601 date formats with timezone
            Gson gson = new GsonBuilder()
                    .setDateFormat("yyyy-MM-dd'T'HH:mm:ss")
                    .setLenient()
                    .create();
            
            retrofit = new Retrofit.Builder()
                    // This uses the URL from your build.gradle.kts file
                    .baseUrl(BuildConfig.BASE_URL)
                    .client(okHttpClient)
                    .addConverterFactory(GsonConverterFactory.create(gson))
                    .build();
        }
        return retrofit;
    }
}
