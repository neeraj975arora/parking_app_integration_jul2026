# Entity-Relationship Diagram (ERD)

> **Tip:** To view the ERD diagram below, use a Markdown preview extension that supports Mermaid diagrams (such as "Markdown Preview Mermaid Support" for VS Code, or enable Mermaid in your preferred Markdown viewer).

This diagram represents the relationships between tables in the Smart Parking backend database.

## Database Overview

**Total Tables**: 9

### Core Tables
1. **users** - User accounts (super_admin, admin, user)
2. **user_vehicles** - User-registered vehicles
3. **parkinglots_details** - 87 parking lots across New Delhi
4. **floors** - 3 floors per parking lot (Ground, First, Second)
5. **rows** - 4 rows per floor (Row-A, Row-B, Row-C, Row-D)
6. **slots** - 10 slots per row (S1-S10) = 10,440 total slots

### Transaction Tables
7. **parking_sessions** - Vehicle check-in/check-out records
8. **admin_parking_lots** - Admin-to-parking-lot assignments
9. **admin_payment_ledger** - Daily payment tracking for admins

## Entity Relationship Diagram

```mermaid
erDiagram
    User {
        serial user_id PK
        varchar user_name
        varchar user_email
        varchar user_password
        varchar user_phone_no
        text user_address
        varchar role
        timestamp created_on
    }
    ParkingLotDetails {
        serial parkinglot_id PK
        text parking_name
        text city
        text landmark
        text address
        numeric latitude
        numeric longitude
        text physical_appearance
        text parking_ownership
        text parking_surface
        text has_cctv
        text has_boom_barrier
        text ticket_generated
        text entry_exit_gates
        text weekly_off
        text parking_timing
        text vehicle_types
        integer car_capacity
        integer available_car_slots
        integer two_wheeler_capacity
        integer available_two_wheeler_slots
        text parking_type
        text payment_modes
        text car_parking_charge
        text two_wheeler_parking_charge
        text allows_prepaid_passes
        text provides_valet_services
        text value_added_services
    }
    Floor {
        serial floor_id PK
        varchar floor_name
        int parkinglot_id FK
    }
    Row {
        serial row_id PK
        varchar row_name
        int floor_id FK
        int parkinglot_id
    }
    Slot {
        serial slot_id PK
        varchar slot_name
        int status
        varchar vehicle_reg_no
        varchar ticket_id
        int row_id FK
        int floor_id
        int parkinglot_id
    }
    UserVehicle {
        serial vehicle_id PK
        integer user_id FK
        varchar registration_number
        varchar vehicle_name
        varchar make
        varchar model
        integer year
        varchar vehicle_type
        varchar color
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    ParkingSession {
        varchar ticket_id PK
        integer parkinglot_id
        integer floor_id
        integer row_id
        integer slot_id FK
        varchar vehicle_reg_no
        integer user_id FK
        integer vehicle_id FK
        timestamp start_time
        timestamp end_time
        numeric duration_hrs
        numeric amount_paid
        numeric total_amount
        varchar payment_status
        varchar payment_method
        varchar receipt_url
        varchar session_status
        varchar vehicle_type
    }
    AdminParkingLot {
        serial id PK
        integer admin_id FK
        integer parking_lot_id FK
        date assigned_date
    }
    AdminPaymentLedger {
        serial id PK
        integer admin_id FK
        date date
        float opening_balance
        float today_collection
        float payment_made
        float closing_balance
    }

    User ||--o{ UserVehicle : "owns"
    User ||--o{ ParkingSession : "has"
    User ||--o{ AdminPaymentLedger : "has"
    UserVehicle ||--o{ ParkingSession : "used in"
    ParkingLotDetails ||--o{ Floor : "has"
    Floor ||--o{ Row : "has"
    Row ||--o{ Slot : "has"
    Slot ||--o{ ParkingSession : "used in"
    User ||--o{ AdminParkingLot : "admin of"
    ParkingLotDetails ||--o{ AdminParkingLot : "assigned to"
    User ||--o{ AdminPaymentLedger : "ledger for"
    ParkingLotDetails ||--o{ AdminParkingLot : "lot for admin"
``` 
