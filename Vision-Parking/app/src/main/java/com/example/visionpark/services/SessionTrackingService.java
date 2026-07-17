package com.example.visionpark.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;
import com.example.visionpark.R;
import com.example.visionpark.activities.MySessionsActivity;
import com.example.visionpark.models.ParkingSession;
import java.util.HashMap;
import java.util.Map;

/**
 * Foreground service for real-time session tracking
 * Provides timer functionality and session duration updates
 */
public class SessionTrackingService extends Service {
    
    private static final String CHANNEL_ID = "session_tracking_channel";
    private static final int NOTIFICATION_ID = 1001;
    
    private final IBinder binder = new SessionBinder();
    private Map<String, SessionTimer> activeTimers = new HashMap<>();
    private SessionUpdateListener updateListener;
    private Handler mainHandler = new Handler(Looper.getMainLooper());
    
    // Interface for session update callbacks
    public interface SessionUpdateListener {
        void onSessionUpdated(ParkingSession session);
    }
    
    // Interface for timer callbacks
    public interface TimerCallback {
        void onTimerUpdate(ParkingSession updatedSession);
    }
    
    public class SessionBinder extends Binder {
        public SessionTrackingService getService() {
            return SessionTrackingService.this;
        }
        
        public void setSessionUpdateListener(SessionUpdateListener listener) {
            updateListener = listener;
        }
        
        public void startTrackingSession(ParkingSession session) {
            SessionTrackingService.this.startTrackingSession(session);
        }
        
        public void stopTrackingSession(String sessionId) {
            SessionTimer timer = activeTimers.remove(sessionId);
            if (timer != null) {
                timer.stop();
            }
            
            // If no more active sessions, stop the service
            if (activeTimers.isEmpty()) {
                stopForeground(true);
                stopSelf();
            }
        }
        
        public boolean isTrackingSession(String sessionId) {
            return activeTimers.containsKey(sessionId);
        }
        
        public int getActiveSessionCount() {
            return activeTimers.size();
        }
    }
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra("session_data")) {
            ParkingSession session = (ParkingSession) intent.getSerializableExtra("session_data");
            if (session != null) {
                startTrackingSession(session);
            }
        }
        
        return START_STICKY; // Restart service if killed
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        // Stop all timers
        for (SessionTimer timer : activeTimers.values()) {
            timer.stop();
        }
        activeTimers.clear();
    }
    
    // Static method to start tracking from activities
    public static void startTracking(Context context, ParkingSession session) {
        Intent intent = new Intent(context, SessionTrackingService.class);
        intent.putExtra("session_data", session);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }
    
    private void startTrackingSession(ParkingSession session) {
        String sessionId = session.getTicketId();
        
        // Don't start if already tracking
        if (activeTimers.containsKey(sessionId)) {
            return;
        }
        
        SessionTimer timer = new SessionTimer(session, new TimerCallback() {
            @Override
            public void onTimerUpdate(ParkingSession updatedSession) {
                if (updateListener != null) {
                    mainHandler.post(() -> updateListener.onSessionUpdated(updatedSession));
                }
                
                // Update notification
                updateNotification();
            }
        });
        
        activeTimers.put(sessionId, timer);
        timer.start();
        
        // Start foreground service with notification
        startForeground(NOTIFICATION_ID, createNotification());
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Session Tracking",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Tracks active parking sessions");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private Notification createNotification() {
        Intent intent = new Intent(this, MySessionsActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent, 
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE : 
                PendingIntent.FLAG_UPDATE_CURRENT
        );
        
        String contentText = activeTimers.size() == 1 ? 
            "1 active parking session" : 
            activeTimers.size() + " active parking sessions";
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vision Parking")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.ic_car)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }
    
    private void updateNotification() {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, createNotification());
        }
    }
    
    // Inner class for individual session timers
    private static class SessionTimer {
        private ParkingSession session;
        private TimerCallback callback;
        private Handler handler = new Handler(Looper.getMainLooper());
        private Runnable timerRunnable;
        private boolean isRunning = false;
        
        public SessionTimer(ParkingSession session, TimerCallback callback) {
            this.session = session;
            this.callback = callback;
            
            timerRunnable = new Runnable() {
                @Override
                public void run() {
                    if (isRunning) {
                        updateSession();
                        handler.postDelayed(this, 60000); // Update every minute
                    }
                }
            };
        }
        
        public void start() {
            isRunning = true;
            handler.post(timerRunnable);
        }
        
        public void stop() {
            isRunning = false;
            handler.removeCallbacks(timerRunnable);
        }
        
        private void updateSession() {
            // Create updated session with current duration and cost
            ParkingSession updatedSession = new ParkingSession();
            updatedSession.setTicketId(session.getTicketId());
            updatedSession.setUserId(session.getUserId());
            updatedSession.setVehicleId(session.getVehicleId());
            updatedSession.setParkinglotId(session.getParkinglotId());
            updatedSession.setParkingLotName(session.getParkingLotName());
            updatedSession.setParkingLotAddress(session.getParkingLotAddress());
            updatedSession.setVehicleRegNo(session.getVehicleRegNo());
            updatedSession.setVehicleType(session.getVehicleType());
            updatedSession.setStartTime(session.getStartTime());
            updatedSession.setSessionStatus("active");
            updatedSession.setSlotLocation(session.getSlotLocation());
            
            callback.onTimerUpdate(updatedSession);
        }
    }
}