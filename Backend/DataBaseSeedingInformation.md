# Database Setup Documentation

## Overview
This document describes the complete database schema and data population for the Smart Parking System.

**File**: `COMPLETE_DATABASE_SETUP_FIXED.sql`  
**Purpose**: Complete database initialization with schema, real parking data, and test data  
**Size**: 532 lines (optimized from 2,805 lines)

---

## 📊 Database Schema

### Tables Created

#### 1. **users**
Stores all system users (super admin, admins, and regular users)

| Column | Type | Description |
|--------|------|-------------|
| user_id | SERIAL PRIMARY KEY | Unique user identifier |
| user_name | VARCHAR(100) UNIQUE | Username |
| user_email | VARCHAR(100) UNIQUE | Email address |
| user_password | VARCHAR(255) | Hashed password (scrypt) |
| user_phone_no | VARCHAR(15) UNIQUE | Phone number |
| user_address | TEXT | User address |
| role | VARCHAR(20) | Role: 'user', 'admin', or 'super_admin' |
| created_on | TIMESTAMP | Account creation timestamp |

#### 2. **parkinglots_details**
Real parking lot data across New Delhi

| Column | Type | Description |
|--------|------|-------------|
| parkinglot_id | SERIAL PRIMARY KEY | Unique parking lot ID |
| parking_name | TEXT | Name of parking lot |
| city | TEXT | City (New Delhi) |
| landmark | TEXT | Nearby landmark |
| address | TEXT | Full address |
| latitude | NUMERIC | GPS latitude |
| longitude | NUMERIC | GPS longitude |
| physical_appearance | TEXT | Physical description |
| parking_ownership | TEXT | Ownership type |
| parking_surface | TEXT | Surface type (Cemented/Mud/Pawment) |
| has_cctv | TEXT | CCTV availability |
| has_boom_barrier | TEXT | Boom barrier availability |
| ticket_generated | TEXT | Ticket generation method |
| entry_exit_gates | TEXT | Gate configuration |
| weekly_off | TEXT | Weekly off days |
| parking_timing | TEXT | Operating hours |
| vehicle_types | TEXT | Allowed vehicle types |
| car_capacity | INTEGER | Car capacity |
| available_car_slots | INTEGER | Available car slots |
| two_wheeler_capacity | INTEGER | Two-wheeler capacity |
| available_two_wheeler_slots | INTEGER | Available two-wheeler slots |
| parking_type | TEXT | Paid/Free |
| payment_modes | TEXT | Accepted payment methods |
| car_parking_charge | TEXT | Car parking charges |
| two_wheeler_parking_charge | TEXT | Two-wheeler charges |
| allows_prepaid_passes | TEXT | Prepaid pass availability |
| provides_valet_services | TEXT | Valet service availability |
| value_added_services | TEXT | Additional services |

#### 3. **floors**
Parking lot floor information

| Column | Type | Description |
|--------|------|-------------|
| floor_id | SERIAL PRIMARY KEY | Unique floor ID |
| floor_name | VARCHAR(50) | Floor name (Ground/First/Second) |
| parkinglot_id | INTEGER FK | Reference to parking lot |

#### 4. **rows**
Parking rows within floors

| Column | Type | Description |
|--------|------|-------------|
| row_id | SERIAL PRIMARY KEY | Unique row ID |
| row_name | VARCHAR(50) | Row name (Row-A, Row-B, Row-C, Row-D) |
| floor_id | INTEGER FK | Reference to floor |
| parkinglot_id | INTEGER | Denormalized parking lot reference |

#### 5. **slots**
Individual parking slots

| Column | Type | Description |
|--------|------|-------------|
| slot_id | SERIAL PRIMARY KEY | Unique slot ID |
| slot_name | VARCHAR(50) | Slot name (S1-S10) |
| status | INTEGER | 0 = free, 1 = occupied |
| vehicle_reg_no | VARCHAR(20) | Vehicle registration (if occupied) |
| ticket_id | VARCHAR(50) | Associated ticket ID |
| row_id | INTEGER FK | Reference to row |
| floor_id | INTEGER | Floor reference |
| parkinglot_id | INTEGER | Parking lot reference |

#### 6. **user_vehicles**
User-registered vehicles

| Column | Type | Description |
|--------|------|-------------|
| vehicle_id | SERIAL PRIMARY KEY | Unique vehicle ID |
| user_id | INTEGER FK | Owner user ID |
| registration_number | VARCHAR(20) | Vehicle registration number |
| vehicle_name | VARCHAR(100) | User-given vehicle name |
| make | VARCHAR(50) | Vehicle manufacturer |
| model | VARCHAR(50) | Vehicle model |
| year | INTEGER | Manufacturing year |
| vehicle_type | VARCHAR(20) | Type (car/motorcycle) |
| color | VARCHAR(30) | Vehicle color |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Registration timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### 7. **parking_sessions**
Parking session records

| Column | Type | Description |
|--------|------|-------------|
| ticket_id | VARCHAR(50) PRIMARY KEY | Unique ticket ID |
| parkinglot_id | INTEGER | Parking lot ID |
| floor_id | INTEGER | Floor ID |
| row_id | INTEGER | Row ID |
| slot_id | INTEGER FK | Slot ID |
| vehicle_reg_no | VARCHAR(20) | Vehicle registration |
| user_id | INTEGER FK | User ID |
| vehicle_id | INTEGER FK | Vehicle ID |
| start_time | TIMESTAMP | Session start time |
| end_time | TIMESTAMP | Session end time |
| duration_hrs | NUMERIC | Duration in hours |
| amount_paid | NUMERIC(10,2) | Amount paid |
| total_amount | NUMERIC(10,2) | Total amount due |
| payment_status | VARCHAR(20) | pending/completed |
| payment_method | VARCHAR(50) | cash/card/upi |
| receipt_url | VARCHAR(255) | Receipt URL |
| session_status | VARCHAR(20) | active/completed |
| vehicle_type | VARCHAR(20) | Vehicle type |

#### 8. **admin_parking_lots**
Admin-to-parking-lot assignments

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique assignment ID |
| admin_id | INTEGER FK | Admin user ID |
| parking_lot_id | INTEGER FK | Parking lot ID |
| assigned_date | DATE | Assignment date |

#### 9. **admin_payment_ledger**
Daily payment ledger for admins

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique ledger entry ID |
| admin_id | INTEGER FK | Admin user ID |
| date | DATE | Ledger date |
| opening_balance | FLOAT | Opening balance |
| today_collection | FLOAT | Today's collection |
| payment_made | FLOAT | Payment made to system |
| closing_balance | FLOAT | Closing balance |

---

## 📦 Data Population

### 1. Parking Lots (87 Real Locations)

**Source**: Real parking locations across New Delhi  
**Count**: 87 parking lots  
**Data Type**: COPY command with tab-separated values

**Sample Locations**:
- Jahangirpuri Metro Authorised Parking
- Azadpur Commercial Complex
- ISBT Kashmere Gate Bus Stand
- Connaught Place (multiple locations)
- Nizamuddin area (multiple locations)
- Lodhi Colony area
- Pitampura area
- Karol Bagh area
- And 70+ more locations

**Key Features**:
- GPS coordinates (latitude/longitude)
- Operating hours
- Pricing information
- Capacity details
- Facility information (CCTV, boom barriers, etc.)

---

### 2. Users (21 Test Users)

#### Super Admin (1 user)
```
User ID: 1
Username: superadmin
Email: superadmin@parking.com
Password: password123 (hashed)
Phone: 9009244409
Role: super_admin
```

#### Admins (10 users)
```
User IDs: 10-19
Usernames: admin10 to admin19
Emails: admin10@parking.com to admin19@parking.com
Password: password123 (hashed)
Phones: +91900000110 to +91900000119
Role: admin
```

#### Regular Users (10 users)
```
User IDs: 20-29
Usernames: user20 to user29
Emails: user20@parking.com to user29@parking.com
Password: password123 (hashed)
Phones: +91910000220 to +91910000229
Role: user
Locations: Various Delhi neighborhoods
```

**Password Hash**: All users use the same hashed password for testing:
```
scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463
```
**Plain Password**: `password123`

---

### 3. User Vehicles (22 Vehicles)

**Distribution**:
- User 20: 2 vehicles (Honda City, Activa)
- User 21: 2 vehicles (Swift Dzire, Splendor)
- User 22: 3 vehicles (Hyundai i20, Pulsar, Wagon R)
- User 23: 2 vehicles (Creta, Activa 6G)
- User 24: 2 vehicles (Fortuner, Royal Enfield)
- User 25: 2 vehicles (Verna, Dio)
- User 26: 2 vehicles (Baleno, Jupiter)
- User 27: 3 vehicles (Seltos, Ntorq, Alto)
- User 28: 2 vehicles (Innova, Fascino)
- User 29: 2 vehicles (XUV700, Avenger)

**Sample Vehicle**:
```
Vehicle ID: 1
User: user20
Registration: DL02AB1234
Name: My Honda City
Make: Honda
Model: City
Year: 2020
Type: car
Color: Silver
```

---

### 4. Infrastructure (Procedurally Generated)

#### Floors (261 total)
**Generation Logic**:
- Each parking lot gets **3 floors**
- Floor names: Ground Floor, First Floor, Second Floor
- Total: 87 lots × 3 floors = **261 floors**

#### Rows (1,044 total)
**Generation Logic**:
- Each floor gets **4 rows**
- Row names: Row-A, Row-B, Row-C, Row-D
- Total: 261 floors × 4 rows = **1,044 rows**

#### Slots (10,440 total)
**Generation Logic**:
- Each row gets **10 slots**
- Slot names: S1, S2, S3, S4, S5, S6, S7, S8, S9, S10
- Initial status: 0 (free)
- Total: 1,044 rows × 10 slots = **10,440 slots**

**Per Parking Lot**:
- 3 floors × 4 rows × 10 slots = **120 slots per lot**

---

### 5. Admin Assignments (87 assignments)

**Distribution Logic**:
- 10 admins manage 87 parking lots
- Each admin manages approximately 9 parking lots
- Assignment algorithm: `admin_id = 10 + ((lot_id - 1) % 10)`

**Example Distribution**:
- Admin 10: Lots 1, 11, 21, 31, 41, 51, 61, 71, 81
- Admin 11: Lots 2, 12, 22, 32, 42, 52, 62, 72, 82
- Admin 12: Lots 3, 13, 23, 33, 43, 53, 63, 73, 83
- ... and so on

---

### 6. Parking Sessions (100 sample sessions)

**Generation Logic**:
- 100 sessions distributed across all parking lots
- Uses actual slot IDs from the database
- Random distribution across parking lots: `((s-1) % 87) + 1`

**Session Characteristics**:
- **Vehicle Registration**: 
  - First 22 sessions use real user vehicles
  - Remaining 78 use temporary registrations (TEMP0023-TEMP0100)
- **Users**: Distributed among user20-user29
- **Start Time**: Random within last 30 days
- **End Time**: 85% completed, 15% active
- **Duration**: 1-8 hours (random)
- **Amount**: Based on duration × rate (₹20-30 per hour)
- **Payment Status**: 85% completed, 15% pending
- **Payment Method**: 40% card, 30% UPI, 30% cash
- **Session Status**: 85% completed, 15% active
- **Vehicle Type**: 60% Car, 30% Two-Wheeler, 10% Three-Wheeler

**Sample Session**:
```
Ticket ID: TICKET-0001
Parking Lot: Random from 1-87
Slot: Random available slot
Vehicle: DL02AB1234 (or TEMP0023)
User: user20-user29
Start: Random time in last 30 days
Duration: 1-8 hours
Amount: ₹20-240
Status: completed/active
```

---

### 7. Admin Payment Ledger (10 entries)

**Current Day Ledger** for each admin:

| Admin ID | Opening Balance | Today's Collection | Payment Made | Closing Balance |
|----------|----------------|-------------------|--------------|-----------------|
| 10 | ₹0 | ₹450 | ₹400 | ₹50 |
| 11 | ₹0 | ₹380 | ₹350 | ₹30 |
| 12 | ₹0 | ₹520 | ₹480 | ₹40 |
| 13 | ₹0 | ₹340 | ₹300 | ₹40 |
| 14 | ₹0 | ₹480 | ₹450 | ₹30 |
| 15 | ₹0 | ₹290 | ₹250 | ₹40 |
| 16 | ₹0 | ₹410 | ₹380 | ₹30 |
| 17 | ₹0 | ₹360 | ₹320 | ₹40 |
| 18 | ₹0 | ₹390 | ₹350 | ₹40 |
| 19 | ₹0 | ₹420 | ₹390 | ₹30 |

---

## 🔧 Technical Implementation

### Procedural Generation (DO Blocks)

The SQL file uses PostgreSQL procedural code to efficiently generate large amounts of data:

```sql
DO $$
DECLARE
    lot_id INTEGER;
    floor_num INTEGER;
    row_num INTEGER;
    slot_num INTEGER;
BEGIN
    FOR lot_id IN 1..87 LOOP
        FOR floor_num IN 1..3 LOOP
            -- Insert floor
            FOR row_num IN 1..4 LOOP
                -- Insert row
                FOR slot_num IN 1..10 LOOP
                    -- Insert slot
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
```

**Benefits**:
- Reduces file size from 2,805 lines to 532 lines
- Ensures consistent data structure
- Easy to modify slot counts
- Faster execution

### Session Generation with LATERAL JOIN

Sessions use a smart query to select random actual slots:

```sql
FROM generate_series(1, 100) AS s
CROSS JOIN LATERAL (
  SELECT slot_id, parkinglot_id, floor_id, row_id
  FROM slots
  WHERE parkinglot_id = ((s-1) % 87) + 1
  ORDER BY random()
  LIMIT 1
) AS slot;
```

This ensures sessions reference valid, existing slots.

---

## 📈 Final Data Summary

| Entity | Count | Description |
|--------|-------|-------------|
| **Users** | 21 | 1 super admin + 10 admins + 10 users |
| **Parking Lots** | 87 | Real locations across New Delhi |
| **Floors** | 261 | 3 per parking lot |
| **Rows** | 1,044 | 4 per floor |
| **Slots** | 10,440 | 10 per row (120 per lot) |
| **Vehicles** | 22 | User-registered vehicles |
| **Sessions** | 100 | Sample parking sessions |
| **Admin Assignments** | 87 | Admin-to-lot mappings |
| **Payment Ledger** | 10 | Current day entries |

---

## 🚀 Usage

### Setup Command
```bash
# Copy SQL file to container
docker cp COMPLETE_DATABASE_SETUP_FIXED.sql postgres_db:/setup.sql

# Execute SQL file
docker exec -it postgres_db psql -U parking_user -d parking_db -f /setup.sql
```

### Verification
```sql
-- Check all counts
SELECT 
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM parkinglots_details) as parking_lots,
    (SELECT COUNT(*) FROM floors) as floors,
    (SELECT COUNT(*) FROM rows) as rows,
    (SELECT COUNT(*) FROM slots) as slots,
    (SELECT COUNT(*) FROM user_vehicles) as vehicles,
    (SELECT COUNT(*) FROM parking_sessions) as sessions,
    (SELECT COUNT(*) FROM admin_parking_lots) as admin_assignments;
```

**Expected Output**:
```
users: 21
parking_lots: 87
floors: 261
rows: 1044
slots: 10440
vehicles: 22
sessions: 100
admin_assignments: 87
```

---

## 🔐 Test Credentials

### Login Format
All login requests require:
```json
{
  "user_email": "email@parking.com",
  "user_password": "password123",
  "role": "user|admin|super_admin"
}
```

### Available Test Accounts

**Super Admin**:
- Email: `superadmin@parking.com`
- Password: `password123`
- Role: `super_admin`

**Admins** (10 accounts):
- Emails: `admin10@parking.com` through `admin19@parking.com`
- Password: `password123`
- Role: `admin`

**Users** (10 accounts):
- Emails: `user20@parking.com` through `user29@parking.com`
- Password: `password123`
- Role: `user`

---

## 📝 Notes

1. **Real Data**: Parking lot information is based on actual locations in New Delhi
2. **Test Data**: Users, vehicles, and sessions are synthetic test data
3. **Scalability**: The procedural generation approach can easily scale to more parking lots
4. **Optimization**: File size reduced by 81% (2,805 → 532 lines) while maintaining all data
5. **Consistency**: All infrastructure follows a consistent 3×4×10 pattern (floors×rows×slots)

---

## 🔄 Maintenance

### To Reset Database
```bash
# Stop containers and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Wait for database to be ready
sleep 10

# Repopulate
docker cp COMPLETE_DATABASE_SETUP_FIXED.sql postgres_db:/setup.sql
docker exec -it postgres_db psql -U parking_user -d parking_db -f /setup.sql
```

### To Modify Slot Count
Edit the DO block in the SQL file:
```sql
FOR slot_num IN 1..10 LOOP  -- Change 10 to desired number
```

### To Add More Parking Lots
1. Add parking lot data to the COPY section
2. Update the loop: `FOR lot_id IN 1..87 LOOP` → `FOR lot_id IN 1..100 LOOP`

---

**Last Updated**: November 10, 2024  
**Version**: 2.0 (Fixed & Optimized)  
**File**: `COMPLETE_DATABASE_SETUP_FIXED.sql`
