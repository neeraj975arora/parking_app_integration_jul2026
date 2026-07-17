package com.example.visionpark.utils;

import android.content.Context;
import android.util.Log;
import com.example.visionpark.models.ParkingLot;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class ParkingDataLoader {
    private static final String TAG = "ParkingDataLoader";
    private static final String JSON_FILE = "parking_lots.json";
    
    public static List<ParkingLot> loadParkingLotsFromAssets(Context context) {
        List<ParkingLot> parkingLots = new ArrayList<>();
        
        try {
            // Read JSON file from assets
            String jsonString = loadJSONFromAsset(context, JSON_FILE);
            
            if (jsonString == null) {
                Log.e(TAG, "Failed to load JSON from assets");
                return parkingLots;
            }
            
            // Parse JSON
            JSONObject jsonObject = new JSONObject(jsonString);
            JSONArray parkingLotsArray = jsonObject.getJSONArray("parking_lots");
            
            // Convert JSON array to ParkingLot objects
            for (int i = 0; i < parkingLotsArray.length(); i++) {
                JSONObject lotJson = parkingLotsArray.getJSONObject(i);
                ParkingLot parkingLot = parseParkingLotFromJson(lotJson);
                
                if (parkingLot != null) {
                    parkingLots.add(parkingLot);
                }
            }
            
            Log.d(TAG, "Successfully loaded " + parkingLots.size() + " parking lots");
            
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing JSON: " + e.getMessage(), e);
        }
        
        return parkingLots;
    }
    
    private static String loadJSONFromAsset(Context context, String filename) {
        String json = null;
        try {
            InputStream is = context.getAssets().open(filename);
            int size = is.available();
            byte[] buffer = new byte[size];
            is.read(buffer);
            is.close();
            json = new String(buffer, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            Log.e(TAG, "Error reading JSON file: " + ex.getMessage(), ex);
            return null;
        }
        return json;
    }
    
    private static ParkingLot parseParkingLotFromJson(JSONObject jsonObject) {
        try {
            int id = jsonObject.getInt("id");
            String name = jsonObject.getString("name");
            
            // Handle null latitude/longitude
            Double latitude = null;
            Double longitude = null;
            
            if (!jsonObject.isNull("latitude")) {
                latitude = jsonObject.getDouble("latitude");
            }
            if (!jsonObject.isNull("longitude")) {
                longitude = jsonObject.getDouble("longitude");
            }
            
            // Skip parking lots without coordinates for map display
            if (latitude == null || longitude == null) {
                Log.w(TAG, "Skipping parking lot " + name + " due to missing coordinates");
                return null;
            }
            
            String carFee = jsonObject.optString("car_fee", "Free");
            String twoWheelerFee = jsonObject.optString("two_wheeler_fee", "Free");
            int availableCarSlots = jsonObject.optInt("available_car_slots", 0);
            int totalCarSlots = jsonObject.optInt("car_capacity", 0);
            int availableTwoWheelerSlots = jsonObject.optInt("available_two_wheeler_slots", 0);
            int totalTwoWheelerSlots = jsonObject.optInt("two_wheeler_capacity", 0);
            String paymentMode = jsonObject.optString("payment_mode", "Free Parking");
            
            // Create ParkingLot object
            ParkingLot parkingLot = new ParkingLot(
                id, name, latitude, longitude, carFee, twoWheelerFee,
                availableCarSlots, totalCarSlots, availableTwoWheelerSlots,
                totalTwoWheelerSlots, paymentMode
            );
            
            // Set additional fields
            parkingLot.setAddress(jsonObject.optString("address", ""));
            parkingLot.setLandmark(jsonObject.optString("landmark", ""));
            parkingLot.setCity(jsonObject.optString("city", "Unknown"));
            
            // Set hourly rate for filtering (parse from car_fee if possible)
            try {
                if (carFee != null && !carFee.equals("Free")) {
                    // Try to extract numeric value from fee string
                    String numericPart = carFee.replaceAll("[^0-9.]", "");
                    if (!numericPart.isEmpty()) {
                        parkingLot.setHourlyRate(Double.parseDouble(numericPart));
                    }
                }
            } catch (NumberFormatException e) {
                parkingLot.setHourlyRate(0.0);
            }
            
            // Add some variety to availability status for demonstration
            // This simulates different availability levels
            if (availableCarSlots == 0 && availableTwoWheelerSlots == 0) {
                // If no slots available, mark as RED
                parkingLot.setAvailabilityStatus("RED");
            } else if (totalCarSlots > 0 || totalTwoWheelerSlots > 0) {
                // If we have capacity data, let the model calculate the status
                // Add some randomness for demonstration when using local data
                int totalAvailable = availableCarSlots + availableTwoWheelerSlots;
                int totalCapacity = totalCarSlots + totalTwoWheelerSlots;
                
                if (totalCapacity == 0) {
                    // Generate some demo data
                    int demoCapacity = 20 + (id % 30); // 20-50 slots
                    int demoAvailable = (id % 3 == 0) ? 0 : // 33% RED
                                       (id % 3 == 1) ? demoCapacity / 4 : // 33% YELLOW  
                                       demoCapacity * 3 / 4; // 33% GREEN
                    
                    parkingLot.setTotalCarSlots(demoCapacity);
                    parkingLot.setAvailableCarSlots(demoAvailable);
                }
            }
            
            return parkingLot;
            
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing parking lot JSON: " + e.getMessage(), e);
            return null;
        }
    }
    
    // Helper method to get nearby parking lots within a radius
    public static List<ParkingLot> getNearbyParkingLots(Context context, List<ParkingLot> allLots, double lat, double lng, double radiusKm) {
        List<ParkingLot> allParkingLots = loadParkingLotsFromAssets(context);
        List<ParkingLot> nearbyLots = new ArrayList<>();
        
        for (ParkingLot lot : allParkingLots) {
            double distance = calculateDistance(lat, lng, lot.getLatitude(), lot.getLongitude());
            
            if (distance <= radiusKm) {
                lot.setDistance(distance);
                nearbyLots.add(lot);
            }
        }
        
        // Sort by distance
        nearbyLots.sort((a, b) -> Double.compare(a.getDistance(), b.getDistance()));
        
        Log.d(TAG, "Found " + nearbyLots.size() + " parking lots within " + radiusKm + "km");
        return nearbyLots;
    }
    
    // Calculate distance between two points using Haversine formula
    private static double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth in km
        
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c; // Distance in km
    }
}
