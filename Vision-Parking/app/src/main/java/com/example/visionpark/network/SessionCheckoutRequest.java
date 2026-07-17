package com.example.visionpark.network;

/**
 * Request model for ending a parking session (checkout)
 */
public class SessionCheckoutRequest {
    private String ticket_id;
    private String payment_method;
    
    // Default constructor
    public SessionCheckoutRequest() {}
    
    // Constructor with ticket ID only
    public SessionCheckoutRequest(String ticketId) {
        this.ticket_id = ticketId;
        this.payment_method = "card"; // Default payment method
    }
    
    // Constructor with payment method
    public SessionCheckoutRequest(String ticketId, String paymentMethod) {
        this.ticket_id = ticketId;
        this.payment_method = paymentMethod;
    }
    
    // Getters and setters
    public String getTicket_id() { return ticket_id; }
    public void setTicket_id(String ticket_id) { this.ticket_id = ticket_id; }
    
    public String getPayment_method() { return payment_method; }
    public void setPayment_method(String payment_method) { this.payment_method = payment_method; }
}