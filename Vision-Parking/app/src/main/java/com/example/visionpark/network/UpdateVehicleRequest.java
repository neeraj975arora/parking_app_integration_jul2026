package com.example.visionpark.network;

/**
 * Request model for updating an existing vehicle
 */
public class UpdateVehicleRequest {
    private String registration_number;
    private String vehicle_name;
    private String make;
    private String model;
    private int year;
    private String vehicle_type;
    private String color;
    
    // Default constructor
    public UpdateVehicleRequest() {}
    
    // Constructor with required fields
    public UpdateVehicleRequest(String registrationNumber, String vehicleName, String vehicleType) {
        this.registration_number = registrationNumber;
        this.vehicle_name = vehicleName;
        this.vehicle_type = vehicleType;
    }
    
    // Full constructor
    public UpdateVehicleRequest(String registrationNumber, String vehicleName, String make, 
                               String model, int year, String vehicleType, String color) {
        this.registration_number = registrationNumber;
        this.vehicle_name = vehicleName;
        this.make = make;
        this.model = model;
        this.year = year;
        this.vehicle_type = vehicleType;
        this.color = color;
    }
    
    // Getters and setters
    public String getRegistration_number() { return registration_number; }
    public void setRegistration_number(String registration_number) { this.registration_number = registration_number; }
    
    public String getVehicle_name() { return vehicle_name; }
    public void setVehicle_name(String vehicle_name) { this.vehicle_name = vehicle_name; }
    
    public String getMake() { return make; }
    public void setMake(String make) { this.make = make; }
    
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    
    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }
    
    public String getVehicle_type() { return vehicle_type; }
    public void setVehicle_type(String vehicle_type) { this.vehicle_type = vehicle_type; }
    
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}