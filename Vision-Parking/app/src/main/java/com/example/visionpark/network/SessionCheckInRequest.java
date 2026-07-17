package com.example.visionpark.network;

/**
 * Request model for starting a parking session (check-in)
 */
public class SessionCheckInRequest {
    private int vehicle_id;
    private String parkinglot_id;
    
    // Default constructor
    public SessionCheckInRequest() {}
    
    // Constructor
    public SessionCheckInRequest(int vehicleId, String parkinglotId) {
        this.vehicle_id = vehicleId;
        this.parkinglot_id = parkinglotId;
    }
    
    // Getters and setters
    public int getVehicle_id() { return vehicle_id; }
    public void setVehicle_id(int vehicle_id) { this.vehicle_id = vehicle_id; }
    
    public String getParkinglot_id() { return parkinglot_id; }
    public void setParkinglot_id(String parkinglot_id) { this.parkinglot_id = parkinglot_id; }
}