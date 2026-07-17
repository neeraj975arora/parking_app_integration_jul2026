#!/usr/bin/env node

const mockDataStore = require('../data/mockData');

async function showAdminData() {
  console.log('🔍 Loading Mock Data Store...\n');
  
  try {
    // Initialize the mock data store
    await mockDataStore.initialize();
    
    console.log('📊 GENERATED ADMIN DATA SUMMARY');
    console.log('=' .repeat(50));
    
    // Show Super Admins
    console.log('\n🔥 SUPER ADMINS (2 accounts):');
    console.log('-'.repeat(30));
    
    let superAdminCount = 0;
    for (const [userId, user] of mockDataStore.superAdmins.entries()) {
      superAdminCount++;
      console.log(`${superAdminCount}. ${user.user_name}`);
      console.log(`   📧 Email: ${user.user_email}`);
      console.log(`   🔑 Password: superadmin123`);
      console.log(`   👤 User ID: ${user.user_id}`);
      console.log(`   🏢 Designation: ${user.profile?.designation || 'N/A'}`);
      console.log(`   📱 Phone: ${user.user_phone}`);
      console.log(`   🏠 Address: ${user.user_address}`);
      console.log('');
    }
    
    // Show Regular Admins
    console.log('\n👥 REGULAR ADMINS (15 accounts):');
    console.log('-'.repeat(30));
    
    let adminCount = 0;
    for (const [userId, user] of mockDataStore.admins.entries()) {
      adminCount++;
      console.log(`${adminCount}. ${user.user_name}`);
      console.log(`   📧 Email: ${user.user_email}`);
      console.log(`   🔑 Password: admin123`);
      console.log(`   👤 User ID: ${user.user_id}`);
      console.log(`   🏢 Designation: ${user.profile?.designation || 'N/A'}`);
      console.log(`   🆔 Employee ID: ${user.profile?.employee_id || 'N/A'}`);
      console.log(`   📱 Phone: ${user.user_phone}`);
      console.log(`   🏠 Address: ${user.user_address}`);
      
      // Show assigned parking lots
      const assignment = mockDataStore.adminLotAssignments.get(userId);
      if (assignment && assignment.assigned_lots.length > 0) {
        console.log(`   🅿️  Assigned Lots: ${assignment.assigned_lots.map(lot => `${lot.parkinglot_id} (${lot.lot_name})`).join(', ')}`);
      }
      console.log('');
    }
    
    // Show Admin Lot Assignments Summary
    console.log('\n🅿️  ADMIN LOT ASSIGNMENTS:');
    console.log('-'.repeat(30));
    
    for (const [adminId, assignment] of mockDataStore.adminLotAssignments.entries()) {
      console.log(`Admin: ${assignment.admin_name} (ID: ${assignment.admin_id})`);
      console.log(`  📧 Email: ${assignment.admin_email || 'N/A'}`);
      console.log(`  🅿️  Lots: ${assignment.assigned_lots.map(lot => `${lot.parkinglot_id}`).join(', ')}`);
      console.log(`  📅 Assigned: ${assignment.assignment_date}`);
      console.log('');
    }
    
    // Show Statistics
    console.log('\n📈 DATA STATISTICS:');
    console.log('-'.repeat(30));
    console.log(`Super Admins: ${mockDataStore.superAdmins.size}`);
    console.log(`Regular Admins: ${mockDataStore.admins.size}`);
    console.log(`Regular Users: ${mockDataStore.users.size}`);
    console.log(`Parking Lots: ${mockDataStore.parkingLots.size}`);
    console.log(`Sessions: ${mockDataStore.sessions.size}`);
    console.log(`Payments: ${mockDataStore.payments.size}`);
    console.log(`Admin Assignments: ${mockDataStore.adminLotAssignments.size}`);
    
    console.log('\n✅ Admin data display completed!');
    
  } catch (error) {
    console.error('❌ Error loading admin data:', error.message);
  }
}

// Run the script
showAdminData().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});