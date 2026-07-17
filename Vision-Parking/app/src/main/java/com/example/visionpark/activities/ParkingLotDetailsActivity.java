package com.example.visionpark.activities;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;
import com.example.visionpark.R;
import com.example.visionpark.models.ParkingLot;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.chip.Chip;

/**
 * Activity to display detailed information about a specific parking lot
 * Implements PRD section 4.5 - Parking Lot Details Screen
 */
public class ParkingLotDetailsActivity extends AppCompatActivity {
    private static final String TAG = "ParkingLotDetails";
    public static final String EXTRA_PARKING_LOT = "parking_lot";
    
    // UI Components
    private TextView tvParkingLotName;
    private TextView tvAddress;
    private TextView tvDistance;
    private TextView tvOperatingHours;
    private TextView tvCarCapacity;
    private TextView tvTwoWheelerCapacity;
    private TextView tvCarFee;
    private TextView tvTwoWheelerFee;
    private TextView tvPaymentModes;
    private TextView tvFacilities;
    private Chip chipAvailabilityStatus;
    private MaterialButton btnParkVehicle;
    private ImageView ivBack;
    private CardView cardOperatingInfo;
    private CardView cardPricingInfo;
    private CardView cardCapacityInfo;
    private CardView cardFacilities;
    
    private ParkingLot parkingLot;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_parking_lot_details);
        
        // Get parking lot data from intent
        parkingLot = (ParkingLot) getIntent().getSerializableExtra(EXTRA_PARKING_LOT);
        if (parkingLot == null) {
            Log.e(TAG, "No parking lot data provided");
            Toast.makeText(this, "Error: No parking lot data", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }
        
        initializeViews();
        setupClickListeners();
        displayParkingLotDetails();
    }
    
    private void initializeViews() {
        // Header views
        tvParkingLotName = findViewById(R.id.tvParkingLotName);
        tvAddress = findViewById(R.id.tvAddress);
        tvDistance = findViewById(R.id.tvDistance);
        chipAvailabilityStatus = findViewById(R.id.chipAvailabilityStatus);
        ivBack = findViewById(R.id.ivBack);
        
        // Operating information card
        cardOperatingInfo = findViewById(R.id.cardOperatingInfo);
        tvOperatingHours = findViewById(R.id.tvOperatingHours);
        
        // Pricing information card
        cardPricingInfo = findViewById(R.id.cardPricingInfo);
        tvCarFee = findViewById(R.id.tvCarFee);
        tvTwoWheelerFee = findViewById(R.id.tvTwoWheelerFee);
        tvPaymentModes = findViewById(R.id.tvPaymentModes);
        
        // Capacity information card
        cardCapacityInfo = findViewById(R.id.cardCapacityInfo);
        tvCarCapacity = findViewById(R.id.tvCarCapacity);
        tvTwoWheelerCapacity = findViewById(R.id.tvTwoWheelerCapacity);
        
        // Facilities card
        cardFacilities = findViewById(R.id.cardFacilities);
        tvFacilities = findViewById(R.id.tvFacilities);
        
        // Action button
        btnParkVehicle = findViewById(R.id.btnParkVehicle);
    }
    
    private void setupClickListeners() {
        ivBack.setOnClickListener(v -> finish());
        
        btnParkVehicle.setOnClickListener(v -> {
            Log.d(TAG, "Park Vehicle button clicked for lot: " + parkingLot.getName());
            
            // Navigate to VehicleListActivity
            Intent intent = new Intent(this, VehicleListActivity.class);
            intent.putExtra(VehicleListActivity.EXTRA_PARKING_LOT, parkingLot);
            startActivity(intent);
        });
    }
    
    private void displayParkingLotDetails() {
        try {
            // Basic information
            tvParkingLotName.setText(parkingLot.getName());
            tvAddress.setText(parkingLot.getAddress());
            
            // Distance (if available)
            if (parkingLot.getDistance() > 0) {
                tvDistance.setText(String.format("%.1f km away", parkingLot.getDistance()));
                tvDistance.setVisibility(View.VISIBLE);
            } else {
                tvDistance.setVisibility(View.GONE);
            }
            
            // Availability status
            setupAvailabilityChip();
            
            // Operating hours
            String operatingHours = parkingLot.getParkingTiming();
            if (operatingHours != null && !operatingHours.isEmpty()) {
                tvOperatingHours.setText(operatingHours);
            } else {
                tvOperatingHours.setText("Operating hours not specified");
            }
            
            // Pricing information
            setupPricingInfo();
            
            // Capacity information
            setupCapacityInfo();
            
            // Facilities
            setupFacilitiesInfo();
            
        } catch (Exception e) {
            Log.e(TAG, "Error displaying parking lot details", e);
            Toast.makeText(this, "Error displaying parking lot information", Toast.LENGTH_SHORT).show();
        }
    }
    
    private void setupAvailabilityChip() {
        int availableSlots = parkingLot.getAvailableCarSlots() + parkingLot.getAvailableTwoWheelerSlots();
        
        if (availableSlots == 0) {
            chipAvailabilityStatus.setText("Full");
            chipAvailabilityStatus.setChipBackgroundColorResource(R.color.status_full);
            btnParkVehicle.setEnabled(false);
            btnParkVehicle.setText("No Slots Available");
        } else if (availableSlots <= 5) {
            chipAvailabilityStatus.setText("Limited");
            chipAvailabilityStatus.setChipBackgroundColorResource(R.color.status_limited);
            btnParkVehicle.setEnabled(true);
            btnParkVehicle.setText("Park Vehicle");
        } else {
            chipAvailabilityStatus.setText("Available");
            chipAvailabilityStatus.setChipBackgroundColorResource(R.color.status_available);
            btnParkVehicle.setEnabled(true);
            btnParkVehicle.setText("Park Vehicle");
        }
    }
    
    private void setupPricingInfo() {
        // Car parking fee
        String carFee = parkingLot.getCarFee();
        if (carFee != null && !carFee.isEmpty() && !carFee.equalsIgnoreCase("free")) {
            tvCarFee.setText("Car: " + carFee);
        } else {
            tvCarFee.setText("Car: Free");
        }
        
        // Two wheeler parking fee
        String twoWheelerFee = parkingLot.getTwoWheelerFee();
        if (twoWheelerFee != null && !twoWheelerFee.isEmpty() && !twoWheelerFee.equalsIgnoreCase("free")) {
            tvTwoWheelerFee.setText("Two Wheeler: " + twoWheelerFee);
        } else {
            tvTwoWheelerFee.setText("Two Wheeler: Free");
        }
        
        // Payment modes
        String paymentModes = parkingLot.getPaymentMode();
        if (paymentModes != null && !paymentModes.isEmpty()) {
            tvPaymentModes.setText("Payment: " + paymentModes);
        } else {
            tvPaymentModes.setText("Payment: Cash");
        }
    }
    
    private void setupCapacityInfo() {
        // Car capacity
        int totalCarSlots = parkingLot.getTotalCarSlots();
        int availableCarSlots = parkingLot.getAvailableCarSlots();
        tvCarCapacity.setText(String.format("Cars: %d/%d available", availableCarSlots, totalCarSlots));
        
        // Two wheeler capacity
        int totalTwoWheelerSlots = parkingLot.getTotalTwoWheelerSlots();
        int availableTwoWheelerSlots = parkingLot.getAvailableTwoWheelerSlots();
        tvTwoWheelerCapacity.setText(String.format("Two Wheelers: %d/%d available", 
            availableTwoWheelerSlots, totalTwoWheelerSlots));
    }
    
    private void setupFacilitiesInfo() {
        StringBuilder facilities = new StringBuilder();
        
        // CCTV
        if (parkingLot.isHasCctv()) {
            facilities.append("• CCTV Surveillance\n");
        }
        
        // Boom Barrier
        if (parkingLot.isHasBoomBarrier()) {
            facilities.append("• Boom Barrier\n");
        }
        
        // Valet Services
        String valetServices = parkingLot.getProvidesValetServices();
        if (valetServices != null && valetServices.equalsIgnoreCase("yes")) {
            facilities.append("• Valet Services\n");
        }
        
        // Value Added Services
        String valueAddedServices = parkingLot.getValueAddedServices();
        if (valueAddedServices != null && !valueAddedServices.isEmpty() && 
            !valueAddedServices.equalsIgnoreCase("no")) {
            facilities.append("• ").append(valueAddedServices).append("\n");
        }
        
        // Ticket Generation
        String ticketGenerated = parkingLot.getTicketGenerated();
        if (ticketGenerated != null && !ticketGenerated.isEmpty()) {
            facilities.append("• Ticket: ").append(ticketGenerated).append("\n");
        }
        
        // Entry/Exit Gates
        String entryExitGates = parkingLot.getEntryExitGates();
        if (entryExitGates != null && !entryExitGates.isEmpty()) {
            facilities.append("• Gates: ").append(entryExitGates).append("\n");
        }
        
        if (facilities.length() > 0) {
            // Remove last newline
            facilities.setLength(facilities.length() - 1);
            tvFacilities.setText(facilities.toString());
        } else {
            tvFacilities.setText("No additional facilities information available");
        }
    }
}