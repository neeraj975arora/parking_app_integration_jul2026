package com.example.visionpark;

import com.example.visionpark.models.ParkingSession;
import com.example.visionpark.models.SlotLocation;
import org.junit.Before;
import org.junit.Test;
import java.util.Date;
import static org.junit.Assert.*;

/**
 * Unit tests for session management functionality
 * Tests session duration calculation, cost calculation, and status management
 */
public class SessionManagementTest {
    
    private ParkingSession activeSession;
    private ParkingSession completedSession;
    private SlotLocation slotLocation;
    
    @Before
    public void setUp() {
        // Create slot location
        slotLocation = new SlotLocation();
        slotLocation.setSlotId(1);
        slotLocation.setFloorId(2);
        slotLocation.setRowId(1);
        slotLocation.setFloorName("2");
        slotLocation.setRowName("A");
        slotLocation.setSlotName("15");
        
        // Create active session
        activeSession = new ParkingSession();
        activeSession.setTicketId("TKT123456");
        activeSession.setUserId(1);
        activeSession.setVehicleId(1);
        activeSession.setParkinglotId(1);
        activeSession.setParkingLotName("Central Plaza Parking");
        activeSession.setParkingLotAddress("123 Main Street, Downtown");
        activeSession.setVehicleRegNo("ABC-123");
        activeSession.setVehicleType("car");
        activeSession.setStartTime(new Date(System.currentTimeMillis() - 2 * 60 * 60 * 1000)); // 2 hours ago
        activeSession.setSessionStatus("active");
        activeSession.setPaymentStatus("pending");
        activeSession.setSlotLocation(slotLocation);
        
        // Create completed session
        completedSession = new ParkingSession();
        completedSession.setTicketId("TKT123455");
        completedSession.setUserId(1);
        completedSession.setVehicleId(1);
        completedSession.setParkinglotId(2);
        completedSession.setParkingLotName("Mall Parking");
        completedSession.setParkingLotAddress("456 Shopping Ave, City Center");
        completedSession.setVehicleRegNo("ABC-123");
        completedSession.setVehicleType("car");
        completedSession.setStartTime(new Date(System.currentTimeMillis() - 24 * 60 * 60 * 1000)); // Yesterday
        completedSession.setEndTime(new Date(System.currentTimeMillis() - 22 * 60 * 60 * 1000)); // 22 hours ago
        completedSession.setDurationHrs(2.0);
        completedSession.setTotalAmount(100.0);
        completedSession.setSessionStatus("completed");
        completedSession.setPaymentStatus("completed");
        completedSession.setPaymentMethod("card");
        completedSession.setSlotLocation(slotLocation);
    }
    
    @Test
    public void testActiveSessionStatus() {
        assertTrue("Active session should return true for isActive()", activeSession.isActive());
        assertFalse("Active session should return false for isCompleted()", activeSession.isCompleted());
    }
    
    @Test
    public void testCompletedSessionStatus() {
        assertFalse("Completed session should return false for isActive()", completedSession.isActive());
        assertTrue("Completed session should return true for isCompleted()", completedSession.isCompleted());
    }
    
    @Test
    public void testCurrentDurationCalculation() {
        String duration = activeSession.getCurrentDuration();
        assertNotNull("Duration should not be null", duration);
        assertTrue("Duration should contain 'hr' for sessions longer than 1 hour", duration.contains("hr"));
    }
    
    @Test
    public void testCurrentCostCalculation() {
        double cost = activeSession.getCurrentCost();
        assertTrue("Cost should be positive for active sessions", cost > 0);
        
        // For a 2-hour session at ₹50/hour, cost should be at least ₹100
        assertTrue("Cost should be at least ₹100 for 2-hour session", cost >= 100.0);
    }
    
    @Test
    public void testSlotLocationFormatting() {
        String formattedLocation = slotLocation.getFormattedLocation();
        assertEquals("Formatted location should match expected format", 
                    "Floor 2, Row A, Slot 15", formattedLocation);
    }
    
    @Test
    public void testSessionDataIntegrity() {
        // Test that all essential session data is preserved
        assertEquals("Ticket ID should match", "TKT123456", activeSession.getTicketId());
        assertEquals("Parking lot name should match", "Central Plaza Parking", activeSession.getParkingLotName());
        assertEquals("Vehicle registration should match", "ABC-123", activeSession.getVehicleRegNo());
        assertEquals("Session status should match", "active", activeSession.getSessionStatus());
        assertEquals("Payment status should match", "pending", activeSession.getPaymentStatus());
    }
    
    @Test
    public void testCompletedSessionData() {
        // Test completed session data
        assertEquals("Completed session status should be 'completed'", "completed", completedSession.getSessionStatus());
        assertEquals("Payment status should be 'completed'", "completed", completedSession.getPaymentStatus());
        assertEquals("Duration should be 2.0 hours", 2.0, completedSession.getDurationHrs(), 0.01);
        assertEquals("Total amount should be 100.0", 100.0, completedSession.getTotalAmount(), 0.01);
        assertEquals("Payment method should be 'card'", "card", completedSession.getPaymentMethod());
    }
    
    @Test
    public void testSessionWithNullStartTime() {
        ParkingSession sessionWithNullStart = new ParkingSession();
        sessionWithNullStart.setStartTime(null);
        
        String duration = sessionWithNullStart.getCurrentDuration();
        assertEquals("Duration should be '0 min' for null start time", "0 min", duration);
        
        double cost = sessionWithNullStart.getCurrentCost();
        assertEquals("Cost should be 0.0 for null start time", 0.0, cost, 0.01);
    }
    
    @Test
    public void testShortDurationFormatting() {
        // Create session that started 30 seconds ago
        ParkingSession shortSession = new ParkingSession();
        shortSession.setStartTime(new Date(System.currentTimeMillis() - 30 * 1000));
        
        String duration = shortSession.getCurrentDuration();
        assertEquals("Short duration should be '< 1 min'", "< 1 min", duration);
    }
    
    @Test
    public void testMinuteDurationFormatting() {
        // Create session that started 5 minutes ago
        ParkingSession minuteSession = new ParkingSession();
        minuteSession.setStartTime(new Date(System.currentTimeMillis() - 5 * 60 * 1000));
        
        String duration = minuteSession.getCurrentDuration();
        assertEquals("5-minute duration should be '5 min'", "5 min", duration);
    }
    
    @Test
    public void testHourAndMinuteDurationFormatting() {
        // Create session that started 1 hour and 30 minutes ago
        ParkingSession hourMinuteSession = new ParkingSession();
        hourMinuteSession.setStartTime(new Date(System.currentTimeMillis() - (90 * 60 * 1000)));
        
        String duration = hourMinuteSession.getCurrentDuration();
        assertTrue("Duration should contain both hours and minutes", 
                  duration.contains("hr") && duration.contains("min"));
    }
    
    @Test
    public void testSessionToString() {
        String sessionString = activeSession.toString();
        assertNotNull("toString should not return null", sessionString);
        assertTrue("toString should contain ticket ID", sessionString.contains("TKT123456"));
        assertTrue("toString should contain vehicle reg no", sessionString.contains("ABC-123"));
        assertTrue("toString should contain parking lot name", sessionString.contains("Central Plaza Parking"));
    }
    
    @Test
    public void testSlotLocationToString() {
        String slotString = slotLocation.toString();
        assertNotNull("toString should not return null", slotString);
        assertTrue("toString should contain slot ID", slotString.contains("slotId=1"));
        assertTrue("toString should contain floor name", slotString.contains("floorName='2'"));
        assertTrue("toString should contain row name", slotString.contains("rowName='A'"));
        assertTrue("toString should contain slot name", slotString.contains("slotName='15'"));
    }
    
    @Test
    public void testEmptySlotLocationFormatting() {
        SlotLocation emptySlot = new SlotLocation();
        String formattedLocation = emptySlot.getFormattedLocation();
        assertEquals("Empty slot location should return default message", 
                    "Location not available", formattedLocation);
    }
    
    @Test
    public void testPartialSlotLocationFormatting() {
        SlotLocation partialSlot = new SlotLocation();
        partialSlot.setFloorName("1");
        partialSlot.setSlotName("A5");
        // Row name is null
        
        String formattedLocation = partialSlot.getFormattedLocation();
        assertEquals("Partial slot location should format correctly", 
                    "Floor 1, Slot A5", formattedLocation);
    }
}