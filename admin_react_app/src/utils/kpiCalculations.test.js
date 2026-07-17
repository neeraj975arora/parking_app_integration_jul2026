// Manual test file for KPI calculations
import {
  calculateTotalIncome,
  calculateTotalSessions,
  calculateRevenuePerSlot,
  calculateActiveParticipants,
  calculateAverageSessionTime,
  calculateOccupancyRate,
  calculateTrend,
  calculateTimeTrend,
  calculateDashboardKPIs
} from './kpiCalculations.js';

// Sample session data for testing
const sampleSessions = [
  {
    ticket_id: "T001",
    parkinglot_id: 1,
    vehicle_reg_no: "KA01AB1234",
    user_id: 1,
    start_time: "2024-01-01T10:00:00Z",
    end_time: "2024-01-01T12:00:00Z",
    duration_hrs: 2,
    vehicle_type: "car"
  },
  {
    ticket_id: "T002",
    parkinglot_id: 1,
    vehicle_reg_no: "KA01CD5678",
    user_id: 2,
    start_time: "2024-01-01T11:00:00Z",
    end_time: null, // Active session
    duration_hrs: null,
    vehicle_type: "motorcycle"
  },
  {
    ticket_id: "T003",
    parkinglot_id: 2,
    vehicle_reg_no: "KA01EF9012",
    user_id: 3,
    start_time: "2024-01-01T09:00:00Z",
    end_time: "2024-01-01T11:30:00Z",
    duration_hrs: 2.5,
    vehicle_type: "car"
  }
];

// Test functions
console.log('=== KPI Calculations Test ===');

console.log('\n1. Total Income Test:');
const totalIncome = calculateTotalIncome(sampleSessions);
console.log(`Expected: ${2 * 50 + 2.5 * 50} (₹225), Got: ${totalIncome}`);

console.log('\n2. Total Sessions Test:');
const totalSessions = calculateTotalSessions(sampleSessions);
console.log(`Expected: 3, Got: ${totalSessions}`);

console.log('\n3. Revenue per Slot Test:');
const revenuePerSlot = calculateRevenuePerSlot(totalIncome, 10);
console.log(`Expected: ${225 / 10} (22.5), Got: ${revenuePerSlot}`);

console.log('\n4. Active Participants Test:');
const activeParticipants = calculateActiveParticipants(sampleSessions);
console.log(`Expected: 1, Got: ${activeParticipants}`);

console.log('\n5. Average Session Time Test:');
const avgSessionTime = calculateAverageSessionTime(sampleSessions);
console.log(`Expected: ${(2 + 2.5) / 2} (2.25), Got: ${avgSessionTime}`);

console.log('\n6. Occupancy Rate Test:');
const occupancyRate = calculateOccupancyRate(activeParticipants, 10);
console.log(`Expected: ${Math.round((1 / 10) * 100)} (10), Got: ${occupancyRate}`);

console.log('\n7. Trend Calculation Test:');
const trend = calculateTrend(100, 80);
console.log(`Expected: ${Math.round(((100 - 80) / 80) * 100)} (25), Got: ${trend}`);

console.log('\n8. Time Trend Test:');
const timeTrend = calculateTimeTrend(2.5, 2.0);
console.log(`Expected: +25%, Got: ${timeTrend}`);

console.log('\n9. Dashboard KPIs Test:');
const dashboardKPIs = calculateDashboardKPIs(sampleSessions, [], 10);
console.log('Dashboard KPIs:', JSON.stringify(dashboardKPIs, null, 2));

console.log('\n=== All Tests Completed ===');