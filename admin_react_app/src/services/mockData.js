// In-memory data store for mock data
const mockDataStore = {
  superAdmins: new Map(),
  admins: new Map(),
  users: new Map(),
  parkingLots: new Map(),
  sessions: new Map(),
  payments: new Map(),
  adminLotAssignments: new Map()
};

// Sample data population function (you can call this during app initialization)
export const initializeMockData = async () => {
  try {
    // This would be populated by your data orchestrator
    // For now, we'll add some sample data
    mockDataStore.sessions.set(1, {
      session_id: 1,
      ticket_id: "TKT-000001",
      parkinglot_id: 1,
      parkinglot_name: "Main Parking Lot",
      user_id: 1,
      user_name: "John Doe",
      user_email: "john@example.com",
      vehicle_reg_no: "KA01AB1234",
      vehicle_type: "car",
      start_time: "2024-01-15T10:00:00Z",
      end_time: "2024-01-15T12:00:00Z",
      duration_hrs: 2,
      total_amount: 100,
      payment_status: "success",
      session_status: "completed"
    });

    mockDataStore.sessions.set(2, {
      session_id: 2,
      ticket_id: "TKT-000002",
      parkinglot_id: 1,
      parkinglot_name: "Main Parking Lot",
      user_id: 2,
      user_name: "Jane Smith",
      user_email: "jane@example.com",
      vehicle_reg_no: "KA01CD5678",
      vehicle_type: "motorcycle",
      start_time: "2024-01-15T11:00:00Z",
      end_time: null,
      duration_hrs: null,
      total_amount: 0,
      payment_status: "pending",
      session_status: "active"
    });

    mockDataStore.parkingLots.set(1, {
      parkinglot_id: 1,
      parkinglot_name: "Main Parking Lot",
      total_slots: 50,
      location: {
        city: "Bangalore",
        address: "MG Road",
        coordinates: { lat: 12.9716, lng: 77.5946 }
      }
    });

    mockDataStore.parkingLots.set(2, {
      parkinglot_id: 2,
      parkinglot_name: "Secondary Parking",
      total_slots: 30,
      location: {
        city: "Bangalore",
        address: "Brigade Road",
        coordinates: { lat: 12.9675, lng: 77.6073 }
      }
    });

    mockDataStore.admins.set(1, {
      user_id: 1,
      user_name: "Admin User",
      user_email: "admin@parking.com",
      admin_details: {
        assigned_lots: [
          {
            parkinglot_id: 1,
            parkinglot_name: "Main Parking Lot",
            assignment_type: "primary"
          }
        ]
      }
    });

    console.log('Mock data initialized successfully');
  } catch (error) {
    console.error('Error initializing mock data:', error);
  }
};

export { mockDataStore };