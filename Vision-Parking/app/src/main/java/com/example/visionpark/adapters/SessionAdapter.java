package com.example.visionpark.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.example.visionpark.R;
import com.example.visionpark.models.ParkingSession;
import com.example.visionpark.models.UserVehicle;
import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Locale;

/**
 * Adapter for displaying parking sessions in RecyclerView
 * Handles both active and past sessions with different UI states
 */
public class SessionAdapter extends RecyclerView.Adapter<SessionAdapter.SessionViewHolder> {
    
    private Context context;
    private List<ParkingSession> sessions;
    private OnSessionActionListener actionListener;
    
    // Interface for handling session actions
    public interface OnSessionActionListener {
        void onExitVehicle(String sessionId);
        void onSessionDetails(ParkingSession session);
    }
    
    public SessionAdapter(Context context, List<ParkingSession> sessions) {
        this.context = context;
        this.sessions = sessions;
    }
    
    public void setOnSessionActionListener(OnSessionActionListener listener) {
        this.actionListener = listener;
    }
    
    @NonNull
    @Override
    public SessionViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_session_card, parent, false);
        return new SessionViewHolder(view);
    }
    
    @Override
    public void onBindViewHolder(@NonNull SessionViewHolder holder, int position) {
        ParkingSession session = sessions.get(position);
        holder.bind(session);
    }
    
    @Override
    public int getItemCount() {
        return sessions != null ? sessions.size() : 0;
    }
    
    public void updateSessions(List<ParkingSession> newSessions) {
        this.sessions = newSessions;
        notifyDataSetChanged();
    }
    
    public void updateSession(ParkingSession updatedSession) {
        if (updatedSession == null || updatedSession.getTicketId() == null) {
            return;
        }
        
        for (int i = 0; i < sessions.size(); i++) {
            ParkingSession session = sessions.get(i);
            if (session != null && session.getTicketId() != null && 
                session.getTicketId().equals(updatedSession.getTicketId())) {
                sessions.set(i, updatedSession);
                notifyItemChanged(i);
                break;
            }
        }
    }
    
    public void removeSession(String sessionId) {
        if (sessionId == null) {
            return;
        }
        
        for (int i = 0; i < sessions.size(); i++) {
            ParkingSession session = sessions.get(i);
            if (session != null && session.getTicketId() != null && 
                session.getTicketId().equals(sessionId)) {
                sessions.remove(i);
                notifyItemRemoved(i);
                break;
            }
        }
    }
    
    class SessionViewHolder extends RecyclerView.ViewHolder {
        
        private TextView tvSessionStatus;
        private TextView tvSessionId;
        private TextView tvParkingLotName;
        private TextView tvParkingLotAddress;
        private TextView tvVehicleInfo;
        private TextView tvSlotLocation;
        private TextView tvStartTime;
        private TextView tvDuration;
        private TextView tvCostLabel;
        private TextView tvCost;
        private Button btnExitVehicle;
        private LinearLayout layoutPastSessionDetails;
        private TextView tvPaymentStatus;
        
        private SimpleDateFormat timeFormat = new SimpleDateFormat("hh:mm a", Locale.getDefault());
        private SimpleDateFormat dateFormat = new SimpleDateFormat("MMM dd, yyyy", Locale.getDefault());
        
        public SessionViewHolder(@NonNull View itemView) {
            super(itemView);
            
            tvSessionStatus = itemView.findViewById(R.id.tvSessionStatus);
            tvSessionId = itemView.findViewById(R.id.tvSessionId);
            tvParkingLotName = itemView.findViewById(R.id.tvParkingLotName);
            tvParkingLotAddress = itemView.findViewById(R.id.tvParkingLotAddress);
            tvVehicleInfo = itemView.findViewById(R.id.tvVehicleInfo);
            tvSlotLocation = itemView.findViewById(R.id.tvSlotLocation);
            tvStartTime = itemView.findViewById(R.id.tvStartTime);
            tvDuration = itemView.findViewById(R.id.tvDuration);
            tvCostLabel = itemView.findViewById(R.id.tvCostLabel);
            tvCost = itemView.findViewById(R.id.tvCost);
            btnExitVehicle = itemView.findViewById(R.id.btnExitVehicle);
            layoutPastSessionDetails = itemView.findViewById(R.id.layoutPastSessionDetails);
            tvPaymentStatus = itemView.findViewById(R.id.tvPaymentStatus);
        }
        
        public void bind(ParkingSession session) {
            // Session ID
            tvSessionId.setText("#" + session.getTicketId());
            
            // Parking lot information
            tvParkingLotName.setText(session.getParkingLotName() != null ? 
                session.getParkingLotName() : "Unknown Location");
            tvParkingLotAddress.setText(session.getParkingLotAddress() != null ? 
                session.getParkingLotAddress() : "Address not available");
            
            // Vehicle information
            String vehicleInfo = session.getVehicleRegNo();
            if (vehicleInfo != null && !vehicleInfo.isEmpty()) {
                tvVehicleInfo.setText("Vehicle (" + vehicleInfo + ")");
            } else {
                tvVehicleInfo.setText("Vehicle information not available");
            }
            
            // Slot location
            if (session.getSlotLocation() != null) {
                tvSlotLocation.setText(session.getSlotLocation().getFormattedLocation());
            } else {
                tvSlotLocation.setText("Slot location not available");
            }
            
            // Start time
            if (session.getStartTime() != null) {
                tvStartTime.setText(timeFormat.format(session.getStartTime()));
            } else {
                tvStartTime.setText("--:--");
            }
            
            // Configure UI based on session status
            if (session.isActive()) {
                configureActiveSession(session);
            } else {
                configureCompletedSession(session);
            }
            
            // Set click listener for the entire card
            itemView.setOnClickListener(v -> {
                if (actionListener != null) {
                    actionListener.onSessionDetails(session);
                }
            });
        }
        
        private void configureActiveSession(ParkingSession session) {
            // Status badge
            tvSessionStatus.setText("ACTIVE");
            tvSessionStatus.setBackgroundResource(R.drawable.bg_status_active);
            
            // Duration (real-time)
            tvDuration.setText(session.getCurrentDuration());
            
            // Cost label and value
            tvCostLabel.setText("Current Cost");
            tvCost.setText("€" + String.format(Locale.getDefault(), "%.2f", session.getCurrentCost()));
            
            // Show exit button
            btnExitVehicle.setVisibility(View.VISIBLE);
            btnExitVehicle.setOnClickListener(v -> {
                if (actionListener != null) {
                    actionListener.onExitVehicle(session.getTicketId());
                }
            });
            
            // Hide past session details
            layoutPastSessionDetails.setVisibility(View.GONE);
        }
        
        private void configureCompletedSession(ParkingSession session) {
            // Status badge
            tvSessionStatus.setText("COMPLETED");
            tvSessionStatus.setBackgroundResource(R.drawable.bg_status_completed);
            
            // Duration (final)
            if (session.getDurationHrs() > 0) {
                tvDuration.setText(formatDurationFromHours(session.getDurationHrs()));
            } else {
                tvDuration.setText("Duration not available");
            }
            
            // Cost label and value
            tvCostLabel.setText("Total Cost");
            tvCost.setText("€" + String.format(Locale.getDefault(), "%.2f", session.getTotalAmount()));
            
            // Hide exit button
            btnExitVehicle.setVisibility(View.GONE);
            
            // Show past session details
            layoutPastSessionDetails.setVisibility(View.VISIBLE);
            
            // Payment status
            String paymentStatus = session.getPaymentStatus();
            android.util.Log.d("SessionAdapter", "Displaying completed session " + 
                session.getTicketId() + " with payment_status: " + paymentStatus);
            
            if ("completed".equals(paymentStatus)) {
                tvPaymentStatus.setText("Completed");
                tvPaymentStatus.setTextColor(context.getResources().getColor(R.color.green));
            } else if ("pending".equals(paymentStatus)) {
                tvPaymentStatus.setText("Pending");
                tvPaymentStatus.setTextColor(context.getResources().getColor(R.color.gray));
            } else {
                // Log unexpected payment status
                android.util.Log.w("SessionAdapter", "Unexpected payment status: '" + 
                    paymentStatus + "' for session " + session.getTicketId());
                tvPaymentStatus.setText("Failed");
                tvPaymentStatus.setTextColor(context.getResources().getColor(R.color.red));
            }
        }
        
        private String formatDurationFromHours(double hours) {
            int totalMinutes = (int) (hours * 60);
            int hrs = totalMinutes / 60;
            int mins = totalMinutes % 60;
            
            if (hrs > 0) {
                return hrs + "h " + mins + "m";
            } else {
                return mins + "m";
            }
        }
    }
}