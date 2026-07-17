package com.example.visionpark.utils;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import com.example.visionpark.R;
import com.example.visionpark.models.ParkingLot;
import com.google.maps.android.ui.IconGenerator;

public class MarkerGenerator {
    private Context context;
    private IconGenerator iconGenerator;
    
    public MarkerGenerator(Context context) {
        this.context = context;
        iconGenerator = new IconGenerator(context);
    }
    
    public Bitmap createParkingMarker(ParkingLot parkingLot) {
        try {
            // Create custom layout for marker
            View markerView = LayoutInflater.from(context)
                .inflate(R.layout.custom_marker_layout, null);
            
            TextView priceText = markerView.findViewById(R.id.price_text);
            ImageView pinIcon = markerView.findViewById(R.id.pin_icon);
            
            // Set price text
            String displayFee = parkingLot.getDisplayFee();
            priceText.setText(displayFee);
            
            // Set pin color based on availability
            String status = parkingLot.getAvailabilityStatus();
            int pinColor = getPinColor(status);
            pinIcon.setColorFilter(pinColor);
            
            // Debug logging
            android.util.Log.d("MarkerGenerator", "Creating marker for " + parkingLot.getName() + 
                " - Status: " + status + ", Color: " + Integer.toHexString(pinColor) + 
                ", Fee: " + displayFee);
            
            // Configure icon generator
            iconGenerator.setContentView(markerView);
            iconGenerator.setBackground(null);
            
            return iconGenerator.makeIcon();
        } catch (Exception e) {
            android.util.Log.e("MarkerGenerator", "Error creating custom marker: " + e.getMessage(), e);
            throw e;
        }
    }
    
    private int getPinColor(String status) {
        switch (status) {
            case "GREEN": return Color.parseColor("#4CAF50"); // Material Green
            case "YELLOW": return Color.parseColor("#FFC107"); // Material Amber
            case "RED": return Color.parseColor("#F44336"); // Material Red
            case "GRAY": return Color.parseColor("#9E9E9E"); // Material Gray
            default: 
                android.util.Log.w("MarkerGenerator", "Unknown status: " + status + ", using gray");
                return Color.parseColor("#9E9E9E");
        }
    }
}
