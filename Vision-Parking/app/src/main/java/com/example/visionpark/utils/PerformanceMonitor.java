package com.example.visionpark.utils;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

/**
 * Simple performance monitoring utility to detect main thread blocking
 */
public class PerformanceMonitor {
    private static final String TAG = "PerformanceMonitor";
    private static final long MAIN_THREAD_SLOW_THRESHOLD_MS = 16; // 60 FPS = 16ms per frame
    
    private static Handler mainHandler = new Handler(Looper.getMainLooper());
    private static boolean isMonitoring = false;
    
    /**
     * Start monitoring main thread performance
     */
    public static void startMonitoring() {
        if (isMonitoring) return;
        
        isMonitoring = true;
        Log.d(TAG, "Starting performance monitoring");
        
        // Post a recurring task to check main thread responsiveness
        checkMainThreadResponsiveness();
    }
    
    /**
     * Stop monitoring main thread performance
     */
    public static void stopMonitoring() {
        isMonitoring = false;
        Log.d(TAG, "Stopping performance monitoring");
    }
    
    private static void checkMainThreadResponsiveness() {
        if (!isMonitoring) return;
        
        long startTime = System.currentTimeMillis();
        
        mainHandler.post(() -> {
            long endTime = System.currentTimeMillis();
            long delay = endTime - startTime;
            
            if (delay > MAIN_THREAD_SLOW_THRESHOLD_MS) {
                Log.w(TAG, "⚠️ Main thread blocked for " + delay + "ms - consider moving work to background thread");
            }
            
            // Schedule next check
            if (isMonitoring) {
                mainHandler.postDelayed(PerformanceMonitor::checkMainThreadResponsiveness, 1000);
            }
        });
    }
    
    /**
     * Execute a task on background thread with performance logging
     */
    public static void executeOnBackground(String taskName, Runnable task, Runnable onComplete) {
        long startTime = System.currentTimeMillis();
        Log.d(TAG, "Starting background task: " + taskName);
        
        new Thread(() -> {
            try {
                task.run();
                long duration = System.currentTimeMillis() - startTime;
                Log.d(TAG, "Background task '" + taskName + "' completed in " + duration + "ms");
                
                if (onComplete != null) {
                    mainHandler.post(onComplete);
                }
            } catch (Exception e) {
                Log.e(TAG, "Background task '" + taskName + "' failed: " + e.getMessage(), e);
                if (onComplete != null) {
                    mainHandler.post(onComplete);
                }
            }
        }).start();
    }
    
    /**
     * Log memory usage
     */
    public static void logMemoryUsage(String context) {
        Runtime runtime = Runtime.getRuntime();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        
        Log.d(TAG, "Memory usage [" + context + "]: " + 
              (usedMemory / 1024 / 1024) + "MB / " + 
              (maxMemory / 1024 / 1024) + "MB (" + 
              (usedMemory * 100 / maxMemory) + "%)");
    }
}