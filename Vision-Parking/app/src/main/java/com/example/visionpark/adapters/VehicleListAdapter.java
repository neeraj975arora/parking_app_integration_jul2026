package com.example.visionpark.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.example.visionpark.R;
import com.example.visionpark.models.UserVehicle;
import java.util.List;

/**
 * Adapter for displaying user vehicles in a RecyclerView
 */
public class VehicleListAdapter extends RecyclerView.Adapter<VehicleListAdapter.VehicleViewHolder> {
    
    private List<UserVehicle> vehicles;
    private OnVehicleClickListener listener;
    
    public interface OnVehicleClickListener {
        void onVehicleClick(UserVehicle vehicle);
    }
    
    public VehicleListAdapter(List<UserVehicle> vehicles, OnVehicleClickListener listener) {
        this.vehicles = vehicles;
        this.listener = listener;
    }
    
    @NonNull
    @Override
    public VehicleViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_vehicle, parent, false);
        return new VehicleViewHolder(view);
    }
    
    @Override
    public void onBindViewHolder(@NonNull VehicleViewHolder holder, int position) {
        UserVehicle vehicle = vehicles.get(position);
        holder.bind(vehicle, listener);
    }
    
    @Override
    public int getItemCount() {
        return vehicles.size();
    }
    
    static class VehicleViewHolder extends RecyclerView.ViewHolder {
        private TextView tvVehicleName;
        private TextView tvRegistrationNumber;
        private TextView tvVehicleDetails;
        private ImageView ivVehicleIcon;
        
        public VehicleViewHolder(@NonNull View itemView) {
            super(itemView);
            tvVehicleName = itemView.findViewById(R.id.tvVehicleName);
            tvRegistrationNumber = itemView.findViewById(R.id.tvRegistrationNumber);
            tvVehicleDetails = itemView.findViewById(R.id.tvVehicleDetails);
            ivVehicleIcon = itemView.findViewById(R.id.ivVehicleIcon);
        }
        
        public void bind(UserVehicle vehicle, OnVehicleClickListener listener) {
            // Vehicle name
            if (vehicle.getVehicleName() != null && !vehicle.getVehicleName().isEmpty()) {
                tvVehicleName.setText(vehicle.getVehicleName());
            } else {
                tvVehicleName.setText("My Vehicle");
            }
            
            // Registration number
            tvRegistrationNumber.setText(vehicle.getRegistrationNumber());
            
            // Vehicle details (make, model, year)
            StringBuilder details = new StringBuilder();
            if (vehicle.getMake() != null && !vehicle.getMake().isEmpty()) {
                details.append(vehicle.getMake());
            }
            if (vehicle.getModel() != null && !vehicle.getModel().isEmpty()) {
                if (details.length() > 0) details.append(" ");
                details.append(vehicle.getModel());
            }
            if (vehicle.getYear() != null && vehicle.getYear() > 0) {
                if (details.length() > 0) details.append(" ");
                details.append("(").append(vehicle.getYear()).append(")");
            }
            
            if (details.length() > 0) {
                tvVehicleDetails.setText(details.toString());
                tvVehicleDetails.setVisibility(View.VISIBLE);
            } else {
                tvVehicleDetails.setVisibility(View.GONE);
            }
            
            // Vehicle icon based on type
            String vehicleType = vehicle.getVehicleType();
            if (vehicleType != null) {
                switch (vehicleType.toLowerCase()) {
                    case "car":
                        ivVehicleIcon.setImageResource(R.drawable.ic_directions_car);
                        break;
                    case "motorcycle":
                    case "bike":
                    case "two-wheeler":
                    case "scooter":
                        ivVehicleIcon.setImageResource(R.drawable.ic_motorcycle);
                        break;
                    default:
                        ivVehicleIcon.setImageResource(R.drawable.ic_directions_car);
                        break;
                }
            } else {
                ivVehicleIcon.setImageResource(R.drawable.ic_directions_car);
            }
            
            // Click listener
            itemView.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onVehicleClick(vehicle);
                }
            });
        }
    }
}