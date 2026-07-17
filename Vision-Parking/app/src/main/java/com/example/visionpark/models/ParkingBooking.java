package com.example.visionpark.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class ParkingBooking implements Serializable {

    @SerializedName("booking_id")
    private String bookingId;

    @SerializedName("user_id")
    private int userId;

    @SerializedName("vehicle_id")
    private int vehicleId;

    @SerializedName("parkinglot_id")
    private int parkinglotId;

    @SerializedName("parking_lot_name")
    private String parkingLotName;

    @SerializedName("parking_lot_address")
    private String parkingLotAddress;

    @SerializedName("slot_id")
    private Integer slotId;

    @SerializedName("scheduled_start")
    private String scheduledStart;

    @SerializedName("scheduled_end")
    private String scheduledEnd;

    @SerializedName("duration_hours")
    private double durationHours;

    @SerializedName("vehicle_type")
    private String vehicleType;

    @SerializedName("vehicle_reg_no")
    private String vehicleRegNo;

    @SerializedName("booking_status")
    private String bookingStatus;

    @SerializedName("estimated_amount")
    private double estimatedAmount;

    @SerializedName("payment_status")
    private String paymentStatus;

    @SerializedName("payment_method")
    private String paymentMethod;

    @SerializedName("created_at")
    private String createdAt;

    // Getters
    public String getBookingId()        { return bookingId; }
    public int getUserId()              { return userId; }
    public int getVehicleId()           { return vehicleId; }
    public int getParkinglotId()        { return parkinglotId; }
    public String getParkingLotName()   { return parkingLotName; }
    public String getParkingLotAddress(){ return parkingLotAddress; }
    public Integer getSlotId()          { return slotId; }
    public String getScheduledStart()   { return scheduledStart; }
    public String getScheduledEnd()     { return scheduledEnd; }
    public double getDurationHours()    { return durationHours; }
    public String getVehicleType()      { return vehicleType; }
    public String getVehicleRegNo()     { return vehicleRegNo; }
    public String getBookingStatus()    { return bookingStatus; }
    public double getEstimatedAmount()  { return estimatedAmount; }
    public String getPaymentStatus()    { return paymentStatus; }
    public String getPaymentMethod()    { return paymentMethod; }
    public String getCreatedAt()        { return createdAt; }

    public boolean isConfirmed()  { return "confirmed".equals(bookingStatus); }
    public boolean isCheckedIn()  { return "checked_in".equals(bookingStatus); }
    public boolean isCompleted()  { return "completed".equals(bookingStatus); }
    public boolean isCancelled()  { return "cancelled".equals(bookingStatus); }

    /** Format duration like "3h 0m" */
    public String getFormattedDuration() {
        int totalMins = (int)(durationHours * 60);
        int hrs  = totalMins / 60;
        int mins = totalMins % 60;
        return hrs > 0 ? hrs + "h " + mins + "m" : mins + "m";
    }
}
