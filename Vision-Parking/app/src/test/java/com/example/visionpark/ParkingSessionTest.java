package com.example.visionpark;

import com.example.visionpark.models.ParkingSession;
import com.example.visionpark.models.SlotLocation;

import org.junit.Before;
import org.junit.Test;

import java.util.Date;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

/**
 * Unit tests for ParkingSession model class
 * Tests session data handling, duration calculations, and status management
 */
public class ParkingSessionTest {
    
    private ParkingSession session;
    private Date testStartTime;
    
    @Before
    public void setUp() {
        session = new ParkingSession();
        testStartTime = new Date();
    }
    
    @Test
    public void testDefaultConstructor() {
        ParkingSession defaultSession = new ParkingSession();
        assertNotNull(defaultSession);
        assertEquals(0, defaultSession.getUserId());
        assertEquals(0, defaultSession.getVehicleId());
        assertEquals(0, defaultSession.getParkinglotId());
    }
    
    @Test
    public void testConstructorWithParameters() {
        Date startTime = new Date();
        ParkingSession testSession = new ParkingSession(
            "TICKET123", 1, 2, 3, "ABC-1234", "car", startTime
        );
        
        assertEquals("TICKET123", testSession.getTicketId());
        assertEquals(1, testSession.getUserId());
        assertEquals(2, testSession.getVehicleId());
        assertEquals(3, testSession.getParkinglotId());
        assertEquals("ABC-1234", testSession.getVehicleRegNo());
        assertEquals("car", testSession.getVehicleType());
        assertEquals(startTime, testSession.getStartTime());
        assertEquals("active", testSession.getSessionStatus());
        assertEquals("pending", testSession.getPaymentStatus());
    }
    
    @Test
    public void testIsActiveStatus() {
        session.setSessionStatus("active");
        assertTrue(session.isActive());
        
        session.setSessionStatus("completed");
        assertFalse(session.isActive());
        
        session.setSessionStatus("cancelled");
        assertFalse(session.isActive());
    }
    
    @Test
    public void testIsCompletedStatus() {
        session.setSessionStatus("completed");
        assertTrue(session.isCompleted());
        
        session.setSessionStatus("active");
        assertFalse(session.isCompleted());
        
        session.setSessionStatus("cancelled");
        assertFalse(session.isCompleted());
    }
    
    @Test
    public void testGetCurrentDurationWithNullStartTime() {
        session.setStartTime(null);
        String duration = session.getCurrentDuration();
        assertEquals("0 min", duration);
    }
    
    @Test
    public void testGetCurrentDurationLessThanOneMinute() {
        // Set start time to current time (less than 1 minute ago)
        session.setStartTime(new Date());
        
        String duration = session.getCurrentDuration();
        assertEquals("< 1 min", duration);
    }
    
    @Test
    public void testGetCurrentDurationMinutes() {
        // Set start time to 5 minutes ago
        long fiveMinutesAgo = System.currentTimeMillis() - (5 * 60 * 1000);
        session.setStartTime(new Date(fiveMinutesAgo));
        
        String duration = session.getCurrentDuration();
        assertTrue(duration.contains("min"));
        assertFalse(duration.contains("hr"));
    }
    
    @Test
    public void testGetCurrentDurationHours() {
        // Set start time to 2 hours and 30 minutes ago
        long twoHoursThirtyMinutesAgo = System.currentTimeMillis() - (2 * 60 * 60 * 1000 + 30 * 60 * 1000);
        session.setStartTime(new Date(twoHoursThirtyMinutesAgo));
        
        String duration = session.getCurrentDuration();
        assertTrue(duration.contains("hr"));
        assertTrue(duration.contains("min"));
    }
    
    @Test
    public void testGetCurrentCostWithNullStartTime() {
        session.setStartTime(null);
        double cost = session.getCurrentCost();
        assertEquals(0.0, cost, 0.01);
    }
    
    @Test
    public void testGetCurrentCostLessThanOneHour() {
        // Set start time to 30 minutes ago
        long thirtyMinutesAgo = System.currentTimeMillis() - (30 * 60 * 1000);
        session.setStartTime(new Date(thirtyMinutesAgo));
        
        double cost = session.getCurrentCost();
        assertEquals(50.0, cost, 0.01); // Should be charged for 1 hour (ceiling)
    }
    
    @Test
    public void testGetCurrentCostMultipleHours() {
        // Set start time to 2.5 hours ago
        long twoAndHalfHoursAgo = System.currentTimeMillis() - (2 * 60 * 60 * 1000 + 30 * 60 * 1000);
        session.setStartTime(new Date(twoAndHalfHoursAgo));
        
        double cost = session.getCurrentCost();
        assertEquals(150.0, cost, 0.01); // Should be charged for 3 hours (ceiling)
    }
    
    @Test
    public void testSettersAndGetters() {
        session.setTicketId("TICKET456");
        assertEquals("TICKET456", session.getTicketId());
        
        session.setUserId(100);
        assertEquals(100, session.getUserId());
        
        session.setVehicleId(200);
        assertEquals(200, session.getVehicleId());
        
        session.setParkinglotId(300);
        assertEquals(300, session.getParkinglotId());
        
        session.setParkingLotName("Test Parking Lot");
        assertEquals("Test Parking Lot", session.getParkingLotName());
        
        session.setParkingLotAddress("123 Test Street");
        assertEquals("123 Test Street", session.getParkingLotAddress());
        
        session.setVehicleRegNo("XYZ-5678");
        assertEquals("XYZ-5678", session.getVehicleRegNo());
        
        session.setVehicleType("motorcycle");
        assertEquals("motorcycle", session.getVehicleType());
        
        Date startTime = new Date();
        session.setStartTime(startTime);
        assertEquals(startTime, session.getStartTime());
        
        Date endTime = new Date();
        session.setEndTime(endTime);
        assertEquals(endTime, session.getEndTime());
        
        session.setDurationHrs(2.5);
        assertEquals(2.5, session.getDurationHrs(), 0.01);
        
        session.setTotalAmount(125.50);
        assertEquals(125.50, session.getTotalAmount(), 0.01);
        
        session.setPaymentStatus("completed");
        assertEquals("completed", session.getPaymentStatus());
        
        session.setPaymentMethod("card");
        assertEquals("card", session.getPaymentMethod());
        
        session.setReceiptUrl("https://example.com/receipt");
        assertEquals("https://example.com/receipt", session.getReceiptUrl());
        
        session.setSessionStatus("completed");
        assertEquals("completed", session.getSessionStatus());
    }
    
    @Test
    public void testSlotLocationIntegration() {
        SlotLocation slotLocation = new SlotLocation(1, 2, 3, "Ground Floor", "A", "A1");
        session.setSlotLocation(slotLocation);
        
        assertEquals(slotLocation, session.getSlotLocation());
        assertEquals("Ground Floor, Row A, Slot A1", session.getSlotLocation().getFormattedLocation());
    }
    
    @Test
    public void testToString() {
        session.setTicketId("TICKET789");
        session.setVehicleRegNo("DEF-9012");
        session.setParkingLotName("Downtown Parking");
        session.setSessionStatus("active");
        session.setStartTime(testStartTime);
        
        String toString = session.toString();
        
        assertTrue(toString.contains("ticketId='TICKET789'"));
        assertTrue(toString.contains("vehicleRegNo='DEF-9012'"));
        assertTrue(toString.contains("parkingLotName='Downtown Parking'"));
        assertTrue(toString.contains("sessionStatus='active'"));
        assertTrue(toString.contains("startTime="));
    }
    
    @Test
    public void testSessionLifecycle() {
        // Create new session
        Date startTime = new Date();
        ParkingSession newSession = new ParkingSession(
            "TICKET999", 1, 1, 1, "TEST-123", "car", startTime
        );
        
        // Verify initial state
        assertTrue(newSession.isActive());
        assertFalse(newSession.isCompleted());
        assertEquals("pending", newSession.getPaymentStatus());
        
        // Complete session
        newSession.setSessionStatus("completed");
        newSession.setPaymentStatus("completed");
        newSession.setEndTime(new Date());
        newSession.setTotalAmount(75.0);
        
        // Verify completed state
        assertFalse(newSession.isActive());
        assertTrue(newSession.isCompleted());
        assertEquals("completed", newSession.getPaymentStatus());
        assertEquals(75.0, newSession.getTotalAmount(), 0.01);
    }
    
    @Test
    public void testDurationFormatting() {
        // Test various duration scenarios
        
        // Less than 1 minute
        long now = System.currentTimeMillis();
        session.setStartTime(new Date(now - 30000)); // 30 seconds ago
        assertEquals("< 1 min", session.getCurrentDuration());
        
        // Exactly 1 minute
        session.setStartTime(new Date(now - 60000)); // 1 minute ago
        String oneMinuteDuration = session.getCurrentDuration();
        assertTrue(oneMinuteDuration.contains("1 min") || oneMinuteDuration.contains("< 1 min"));
        
        // Multiple minutes
        session.setStartTime(new Date(now - 300000)); // 5 minutes ago
        String fiveMinuteDuration = session.getCurrentDuration();
        assertTrue(fiveMinuteDuration.contains("min"));
        assertFalse(fiveMinuteDuration.contains("hr"));
        
        // Exactly 1 hour
        session.setStartTime(new Date(now - 3600000)); // 1 hour ago
        String oneHourDuration = session.getCurrentDuration();
        assertTrue(oneHourDuration.contains("1 hr"));
        
        // Multiple hours
        session.setStartTime(new Date(now - 7200000)); // 2 hours ago
        String twoHourDuration = session.getCurrentDuration();
        assertTrue(twoHourDuration.contains("hr"));
    }
}