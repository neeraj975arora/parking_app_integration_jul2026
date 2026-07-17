package com.example.visionpark.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.visionpark.R;
import com.example.visionpark.models.ParkingLot;

import java.util.List;
import java.util.Locale;

public class ParkingLotListAdapter extends RecyclerView.Adapter<ParkingLotListAdapter.ParkingLotViewHolder> {
    
    public interface OnParkingLotClickListener {
        void onParkingLotClick(ParkingLot parkingLot);
    }
    
    private List<ParkingLot> parkingLots;
    private Context context;
    private OnParkingLotClickListener clickListener;
    
    public ParkingLotListAdapter(Context context, List<ParkingLot> parkingLots) {
        this.context = context;
        this.parkingLots = parkingLots;
    }
    
    public void setOnParkingLotClickListener(OnParkingLotClickListener listener) {
        this.clickListener = listener;
    }
    
    public void updateParkingLots(List<ParkingLot> newParkingLots) {
        this.parkingLots = newParkingLots;
        notifyDataSetChanged();
    }
    
    @NonNull
    @Override
    public ParkingLotViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_parking_lot, parent, false);
        return new ParkingLotViewHolder(view);
    }
    
    @Override
    public void onBindViewHolder(@NonNull ParkingLotViewHolder holder, int position) {
        ParkingLot parkingLot = parkingLots.get(position);
        holder.bind(parkingLot);
    }
    
    @Override
    public int getItemCount() {
        return parkingLots != null ? parkingLots.size() : 0;
    }
    
    class ParkingLotViewHolder extends RecyclerView.ViewHolder {
        private TextView tvName;
        private TextView tvAddress;
        private TextView tvDistance;
        private TextView tvPrice;
        private TextView tvAvailability;
        private TextView tvCarSlots;
        private TextView tvTwoWheelerSlots;
        private View availabilityIndicator;
        
        public ParkingLotViewHolder(@NonNull View itemView) {
            super(itemView);
            tvName = itemView.findViewById(R.id.tvParkingLotName);
            tvAddress = itemView.findViewById(R.id.tvParkingLotAddress);
            tvDistance = itemView.findViewById(R.id.tvDistance);
            tvPrice = itemView.findViewById(R.id.tvPrice);
            tvAvailability = itemView.findViewById(R.id.tvAvailability);
            tvCarSlots = itemView.findViewById(R.id.tvCarSlots);
            tvTwoWheelerSlots = itemView.findViewById(R.id.tvTwoWheelerSlots);
            availabilityIndicator = itemView.findViewById(R.id.availabilityIndicator);
            
            itemView.setOnClickListener(v -> {
                if (clickListener != null && getAdapterPosition() != RecyclerView.NO_POSITION) {
                    clickListener.onParkingLotClick(parkingLots.get(getAdapterPosition()));
                }
            });
        }
        
        public void bind(ParkingLot parkingLot) {
            tvName.setText(parkingLot.getName());
            
            // Set address or landmark
            String address = parkingLot.getAddress();
            if (address == null || address.isEmpty()) {
                address = parkingLot.getLandmark();
            }
            if (address == null || address.isEmpty()) {
                address = "Location not specified";
            }
            tvAddress.setText(address);
            
            // Set distance
            if (parkingLot.getDistance() > 0) {
                tvDistance.setText(String.format(Locale.getDefault(), "%.1f km", parkingLot.getDistance()));
            } else {
                tvDistance.setText("Distance N/A");
            }
            
            // Set price
            tvPrice.setText(parkingLot.getDisplayFee());
            
            // Set availability status
            int totalAvailable = parkingLot.getAvailableCarSlots() + parkingLot.getAvailableTwoWheelerSlots();
            int totalSlots = parkingLot.getTotalCarSlots() + parkingLot.getTotalTwoWheelerSlots();
            
            if (totalAvailable == 0) {
                tvAvailability.setText("Full");
                tvAvailability.setTextColor(context.getResources().getColor(android.R.color.holo_red_dark));
                availabilityIndicator.setBackgroundColor(context.getResources().getColor(android.R.color.holo_red_dark));
            } else if (totalAvailable < totalSlots * 0.3) {
                tvAvailability.setText("Limited");
                tvAvailability.setTextColor(context.getResources().getColor(android.R.color.holo_orange_dark));
                availabilityIndicator.setBackgroundColor(context.getResources().getColor(android.R.color.holo_orange_dark));
            } else {
                tvAvailability.setText("Available");
                tvAvailability.setTextColor(context.getResources().getColor(android.R.color.holo_green_dark));
                availabilityIndicator.setBackgroundColor(context.getResources().getColor(android.R.color.holo_green_dark));
            }
            
            // Set slot information
            tvCarSlots.setText(String.format(Locale.getDefault(), "Cars: %d/%d", 
                parkingLot.getAvailableCarSlots(), parkingLot.getTotalCarSlots()));
            tvTwoWheelerSlots.setText(String.format(Locale.getDefault(), "2W: %d/%d", 
                parkingLot.getAvailableTwoWheelerSlots(), parkingLot.getTotalTwoWheelerSlots()));
        }
    }
}