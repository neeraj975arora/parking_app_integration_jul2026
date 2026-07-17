package com.example.visionpark.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;
import java.util.Date;

/**
 * Model class representing payment information for a parking session
 * Contains details about payment processing and receipt
 */
public class PaymentInfo implements Serializable {
    @SerializedName("ticket_id")
    private String ticketId;
    
    @SerializedName("start_time")
    private Date startTime;
    
    @SerializedName("end_time")
    private Date endTime;
    
    @SerializedName("duration")
    private String duration;
    
    @SerializedName("total_amount")
    private double totalAmount;
    
    @SerializedName("payment_status")
    private String paymentStatus;
    
    @SerializedName("payment_method")
    private String paymentMethod;
    
    @SerializedName("receipt_url")
    private String receiptUrl;
    
    @SerializedName("transaction_id")
    private String transactionId;
    
    @SerializedName("slot_location")
    private SlotLocation slotLocation;
    
    // Default constructor
    public PaymentInfo() {}
    
    // Constructor
    public PaymentInfo(String ticketId, Date startTime, Date endTime, String duration, 
                      double totalAmount, String paymentStatus, String paymentMethod) {
        this.ticketId = ticketId;
        this.startTime = startTime;
        this.endTime = endTime;
        this.duration = duration;
        this.totalAmount = totalAmount;
        this.paymentStatus = paymentStatus;
        this.paymentMethod = paymentMethod;
    }
    
    // Getters and Setters
    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }
    
    public Date getStartTime() { return startTime; }
    public void setStartTime(Date startTime) { this.startTime = startTime; }
    
    public Date getEndTime() { return endTime; }
    public void setEndTime(Date endTime) { this.endTime = endTime; }
    
    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }
    
    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
    
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    
    public String getReceiptUrl() { return receiptUrl; }
    public void setReceiptUrl(String receiptUrl) { this.receiptUrl = receiptUrl; }
    
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    
    public SlotLocation getSlotLocation() { return slotLocation; }
    public void setSlotLocation(SlotLocation slotLocation) { this.slotLocation = slotLocation; }
    
    // Helper methods
    public boolean isPaymentSuccessful() {
        return "completed".equals(paymentStatus) || "success".equals(paymentStatus);
    }
    
    public String getFormattedAmount() {
        return String.format("₹%.2f", totalAmount);
    }
    
    @Override
    public String toString() {
        return "PaymentInfo{" +
                "ticketId='" + ticketId + '\'' +
                ", totalAmount=" + totalAmount +
                ", paymentStatus='" + paymentStatus + '\'' +
                ", paymentMethod='" + paymentMethod + '\'' +
                '}';
    }
}