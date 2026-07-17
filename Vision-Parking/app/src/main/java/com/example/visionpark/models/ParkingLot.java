package com.example.visionpark.models;

import java.io.Serializable;

public class ParkingLot implements Serializable {
    private int id;
    private String name;
    private double latitude;
    private double longitude;
    private String carFee;
    private String twoWheelerFee;
    private int availableCarSlots;
    private int totalCarSlots;
    private int availableTwoWheelerSlots;
    private int totalTwoWheelerSlots;
    private String paymentMode;
    private String address;
    private String landmark;
    private double distance; // For sorting by distance
    private double hourlyRate; // Hourly rate for filtering
    
    // Additional fields from backend API
    private String city;
    private String parkingType;
    private boolean hasCctv;
    private boolean hasBoomBarrier;
    private String ticketGenerated;
    private String entryExitGates;
    private String weeklyOff;
    private String parkingTiming;
    private String vehicleTypes;
    private String allowsPrepaidPasses;
    private String providesValetServices;
    private String valueAddedServices;
    private String availabilityStatus;
    private boolean isOpen;

    // Constructor
    public ParkingLot(int id, String name, double latitude, double longitude, 
                     String carFee, String twoWheelerFee, int availableCarSlots, 
                     int totalCarSlots, int availableTwoWheelerSlots, 
                     int totalTwoWheelerSlots, String paymentMode) {
        this.id = id;
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.carFee = carFee;
        this.twoWheelerFee = twoWheelerFee;
        this.availableCarSlots = availableCarSlots;
        this.totalCarSlots = totalCarSlots;
        this.availableTwoWheelerSlots = availableTwoWheelerSlots;
        this.totalTwoWheelerSlots = totalTwoWheelerSlots;
        this.paymentMode = paymentMode;
    }

    // Getters and Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }

    public String getCarFee() { return carFee; }
    public void setCarFee(String carFee) { this.carFee = carFee; }

    public String getTwoWheelerFee() { return twoWheelerFee; }
    public void setTwoWheelerFee(String twoWheelerFee) { this.twoWheelerFee = twoWheelerFee; }

    public int getAvailableCarSlots() { return availableCarSlots; }
    public void setAvailableCarSlots(int availableCarSlots) { this.availableCarSlots = availableCarSlots; }

    public int getTotalCarSlots() { return totalCarSlots; }
    public void setTotalCarSlots(int totalCarSlots) { this.totalCarSlots = totalCarSlots; }

    public int getAvailableTwoWheelerSlots() { return availableTwoWheelerSlots; }
    public void setAvailableTwoWheelerSlots(int availableTwoWheelerSlots) { this.availableTwoWheelerSlots = availableTwoWheelerSlots; }

    public int getTotalTwoWheelerSlots() { return totalTwoWheelerSlots; }
    public void setTotalTwoWheelerSlots(int totalTwoWheelerSlots) { this.totalTwoWheelerSlots = totalTwoWheelerSlots; }

    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getLandmark() { return landmark; }
    public void setLandmark(String landmark) { this.landmark = landmark; }

    public double getDistance() { return distance; }
    public void setDistance(double distance) { this.distance = distance; }

    public double getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(double hourlyRate) { this.hourlyRate = hourlyRate; }

    // Helper methods
    public String getDisplayFee() {
        if (carFee != null && !carFee.isEmpty() && !carFee.equals("Free")) {
            return carFee;
        }
        return "Free";
    }

    public String getAvailabilityStatus() {
        // If availability status is explicitly set from backend, convert it to color code
        if (availabilityStatus != null && !availabilityStatus.isEmpty()) {
            String status = availabilityStatus.toLowerCase();
            switch (status) {
                case "available":
                    return "GREEN";
                case "limited":
                    return "YELLOW";
                case "full":
                    return "RED";
                default:
                    return "GRAY";
            }
        }
        
        // Otherwise calculate based on available slots
        int totalSlots = totalCarSlots + totalTwoWheelerSlots;
        int availableSlots = availableCarSlots + availableTwoWheelerSlots;
        
        if (totalSlots == 0) return "GRAY"; // No data available
        if (availableSlots == 0) return "RED";
        if (availableSlots < totalSlots * 0.3) return "YELLOW";
        return "GREEN";
    }

    // Additional getters and setters for new fields
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    
    public String getParkingType() { return parkingType; }
    public void setParkingType(String parkingType) { this.parkingType = parkingType; }
    
    public boolean isHasCctv() { return hasCctv; }
    public void setHasCctv(boolean hasCctv) { this.hasCctv = hasCctv; }
    
    public boolean isHasBoomBarrier() { return hasBoomBarrier; }
    public void setHasBoomBarrier(boolean hasBoomBarrier) { this.hasBoomBarrier = hasBoomBarrier; }
    
    public String getTicketGenerated() { return ticketGenerated; }
    public void setTicketGenerated(String ticketGenerated) { this.ticketGenerated = ticketGenerated; }
    
    public String getEntryExitGates() { return entryExitGates; }
    public void setEntryExitGates(String entryExitGates) { this.entryExitGates = entryExitGates; }
    
    public String getWeeklyOff() { return weeklyOff; }
    public void setWeeklyOff(String weeklyOff) { this.weeklyOff = weeklyOff; }
    
    public String getParkingTiming() { return parkingTiming; }
    public void setParkingTiming(String parkingTiming) { this.parkingTiming = parkingTiming; }
    
    public String getVehicleTypes() { return vehicleTypes; }
    public void setVehicleTypes(String vehicleTypes) { this.vehicleTypes = vehicleTypes; }
    
    public String getAllowsPrepaidPasses() { return allowsPrepaidPasses; }
    public void setAllowsPrepaidPasses(String allowsPrepaidPasses) { this.allowsPrepaidPasses = allowsPrepaidPasses; }
    
    public String getProvidesValetServices() { return providesValetServices; }
    public void setProvidesValetServices(String providesValetServices) { this.providesValetServices = providesValetServices; }
    
    public String getValueAddedServices() { return valueAddedServices; }
    public void setValueAddedServices(String valueAddedServices) { this.valueAddedServices = valueAddedServices; }
    
    public String getAvailabilityStatusText() { return availabilityStatus; }
    public void setAvailabilityStatus(String availabilityStatus) { this.availabilityStatus = availabilityStatus; }
    
    public boolean isOpen() { return isOpen; }
    public void setOpen(boolean open) { isOpen = open; }
}