-- =====================================================================
-- COMPLETE DATABASE SETUP - SMART PARKING SYSTEM
-- =====================================================================
-- This file contains EVERYTHING needed to set up the complete database:
-- 1. Database schema (all tables)
-- 2. 87 parking lots across New Delhi
-- 3. 21 users (1 super admin, 10 admins, 10 regular users)
-- 4. 22 user vehicles
-- 5. 10,440 parking slots (87 lots × 120 slots each)
-- 6. 100 sample parking sessions
-- 7. Admin assignments
-- 8. Payment ledger
--
-- USAGE:
-- docker cp COMPLETE_DATABASE_SETUP.sql backend-db-1:/setup.sql
-- docker exec -it backend-db-1 psql -U parking_user -d parking_db -f /setup.sql
--
-- Password for all users: 'password123'
-- =====================================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS admin_payment_ledger CASCADE;
DROP TABLE IF EXISTS parking_sessions CASCADE;
DROP TABLE IF EXISTS user_vehicles CASCADE;
DROP TABLE IF EXISTS admin_parking_lots CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP TABLE IF EXISTS rows CASCADE;
DROP TABLE IF EXISTS floors CASCADE;
DROP TABLE IF EXISTS parkinglots_details CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    user_name VARCHAR(100) UNIQUE NOT NULL,
    user_email VARCHAR(100) UNIQUE NOT NULL,
    user_password VARCHAR(255) NOT NULL,
    user_phone_no VARCHAR(15) UNIQUE NOT NULL,
    user_address TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'user', 'admin', 'super_admin'
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parking Lot Details
CREATE TABLE parkinglots_details (
    parkinglot_id SERIAL PRIMARY KEY,
    parking_name TEXT,
    city TEXT,
    landmark TEXT,
    address TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    physical_appearance TEXT,
    parking_ownership TEXT,
    parking_surface TEXT,
    has_cctv TEXT,
    has_boom_barrier TEXT,
    ticket_generated TEXT,
    entry_exit_gates TEXT,
    weekly_off TEXT,
    parking_timing TEXT,
    vehicle_types TEXT,
    car_capacity INTEGER,
    available_car_slots INTEGER,
    two_wheeler_capacity INTEGER,
    available_two_wheeler_slots INTEGER,
    parking_type TEXT,
    payment_modes TEXT,
    car_parking_charge TEXT,
    two_wheeler_parking_charge TEXT,
    allows_prepaid_passes TEXT,
    provides_valet_services TEXT,
    value_added_services TEXT
);

-- Floors
CREATE TABLE floors (
    floor_id SERIAL PRIMARY KEY,
    floor_name VARCHAR(50) NOT NULL,
    parkinglot_id INTEGER NOT NULL REFERENCES parkinglots_details(parkinglot_id) ON DELETE CASCADE
);

-- Rows
CREATE TABLE rows (
    row_id SERIAL PRIMARY KEY,
    row_name VARCHAR(50) NOT NULL,
    floor_id INTEGER NOT NULL REFERENCES floors(floor_id) ON DELETE CASCADE,
    parkinglot_id INTEGER NOT NULL -- denormalized field
);

-- Slots
CREATE TABLE slots (
    slot_id SERIAL PRIMARY KEY,
    slot_name VARCHAR(50) NOT NULL,
    status INTEGER DEFAULT 0,  -- 0 free, 1 occupied
    vehicle_reg_no VARCHAR(20),
    ticket_id VARCHAR(50),
    row_id INTEGER NOT NULL REFERENCES rows(row_id) ON DELETE CASCADE,
    floor_id INTEGER NOT NULL,
    parkinglot_id INTEGER NOT NULL
);

-- User Vehicles
CREATE TABLE user_vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    registration_number VARCHAR(20) NOT NULL,
    vehicle_name VARCHAR(100),
    make VARCHAR(50),
    model VARCHAR(50),
    year INTEGER,
    vehicle_type VARCHAR(20) DEFAULT 'car',
    color VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uix_user_registration UNIQUE (user_id, registration_number)
);

-- Parking Sessions
CREATE TABLE parking_sessions (
    ticket_id VARCHAR(50) PRIMARY KEY,
    parkinglot_id INTEGER,
    floor_id INTEGER,
    row_id INTEGER,
    slot_id INTEGER REFERENCES slots(slot_id) ON DELETE SET NULL,
    vehicle_reg_no VARCHAR(20) NOT NULL,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    vehicle_id INTEGER REFERENCES user_vehicles(vehicle_id) ON DELETE SET NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration_hrs NUMERIC,
    amount_paid NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    receipt_url VARCHAR(255),
    session_status VARCHAR(20) DEFAULT 'active',
    vehicle_type VARCHAR(20)
);

-- Admin Parking Lots
CREATE TABLE admin_parking_lots (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    parking_lot_id INTEGER NOT NULL REFERENCES parkinglots_details(parkinglot_id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Admin Payment Ledger
CREATE TABLE admin_payment_ledger (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    opening_balance FLOAT NOT NULL DEFAULT 0.0,
    today_collection FLOAT NOT NULL DEFAULT 0.0,
    payment_made FLOAT NOT NULL DEFAULT 0.0,
    closing_balance FLOAT NOT NULL DEFAULT 0.0,
    CONSTRAINT uix_admin_date UNIQUE (admin_id, date)
);

COPY parkinglots_details (
    parkinglot_id, parking_name, city, landmark, address, latitude, longitude,
    physical_appearance, parking_ownership, parking_surface, has_cctv,
    has_boom_barrier, ticket_generated, entry_exit_gates, weekly_off,
    parking_timing, vehicle_types, car_capacity, available_car_slots,
    two_wheeler_capacity, available_two_wheeler_slots, parking_type,
    payment_modes, car_parking_charge, two_wheeler_parking_charge,
    allows_prepaid_passes, provides_valet_services, value_added_services
) FROM stdin;
1	Jahangirpuri - Metro Authorised Parking	New Delhi	Jahangirpuri	Jahangir puri metro, Patking agency- m/s manoj computer	28.72542191	77.16333008	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	yes	Stand Alone printer	Multi gates for Entry as well as Exit	Open All Days	06:00:00 AM - 11:00:00 PM	Car, 2 Weelers	200	200	500	500	Paid	Cash	20 up to 6 hours, 30 for 12 hours	10 up to 6 hours, 15 up to 12	Monthly Pass	No	No
2	Azadpur - Commercial Complex	New Delhi	Akash Cinema	Azadpur bus depot, Akash cinema	28.70976257	77.17796326	Open - Covered bounderies	Govt - Open - Not Authorized to anyone	Mud	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 12:00:00 PM	Car, 2 Weelers	200	200	250	250	Free	Free Parking	Free parking	Free parking	No such option	No	No
3	ISBT Kashmere Gate -  Bus Stand	New Delhi	Inter State Bus Stand	Kashmere gate, nan	28.66860771	77.22953796	Open - Covered bounderies	Not known	Cemented	Yes	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	07:00:00 AM - 11:00:00 PM	Car, 2 Weelers	300	300	400	400	Free	Free Parking	Free	Free	No such option	No	Guards.
4	Madhuban Chowk - Bus Stand	New Delhi	Bus Stand	Madhuban chowk, Pitampura metro station	28.703096	77.129779	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 PM - 12:00:00 AM	Car, 2 Weelers	100	100	200	200	Free	Free Parking	Free	Free	No such option	No	No
5	Kohat Enclave - Metro Station	New Delhi	Kohat Enclave Bus Stand	Kohat Enclave Bus Stand & Metro Station, \\Metro Station	28.69658661	77.14331055	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 PM - 12:00:00 AM	Car, 2 Weelers	250	250	300	300	Free	Free Parking	Free	Free	No such option	No	No
6	Netaji Subhash Place -  Bus Stand	New Delhi	Subhash place Pitampura	Subhash Place, PP tower	28.6941169	77.1510655	Open - Road Side	Govt - Subcontracted	Cemented	Yes	No	Manually - Hand written	Multi gates for Entry as well as Exit	Open All Days	09:00:00 AM - 11:00:00 PM	Car, 2 Weelers	25	25	40	40	Paid	Cash	Rs 20 per hour	Rs 10 per hour	No such option	No	No
7	Netaji Subhash place -  Office Parking	New Delhi	Subhash place, pitampura	Subhash place Pitampura  Flow Tech Group of Industries, Flow tech group of idustries	28.692222	77.150673	Open - Covered bounderies	Not known	Pawment	Yes	No	No ticket	Single entry gate and Single exit gate	Open All Days	09:00:00 AM - 10:00:00 PM	Car, 2 Weelers	20	20	25	25	Free	Free Parking	Free	Free	No such option	No	No
8	Netaji Subhash Place	New Delhi	Nsp subhash place, pitampura	nan, Near by PIET institute	28.6961009	77.1527008	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Single entry gate and Single exit gate	Open All Days	09:00:00 AM - 11:00:00 PM	2 Weelers	0	0	40	40	Paid	Cash	Car parking not available	Rs 10 per hour	No such option	No	10 Rs for 1st hour, Rs5/per hour
9	Netaji Subhash Place - Foot Over Bridge	New Delhi	Nsp pitampura	Footover Bridge, Near Zever Jewellery Showroom	28.69384575	77.15020752	Open - Covered bounderies	Not known	Pawment	Yes	No	No ticket	Single entry gate and Single exit gate	Open All Days	12:00:00 PM - 12:00:00 AM	Car	40	40	0	0	Free	Free Parking	Free	Not allowed	No such option	No	No
10	Pitampura - Netaji Subhash Place	New Delhi	Nsp, near by pizza hut and stanmax	Pitampura, In front of pizza hut and stanmax	28.69402122	77.1495285	Open - Covered bounderies	Govt - Open - Not Authorized to anyone	Pawment	Yes	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 PM - 12:00:00 AM	Car, 2 Weelers	30	30	25	25	Free	Free Parking	No charges.	No charges.	No such option	No	No
11	Pitampura - Netaji Subhash Place	New Delhi	Nsp pitampura	Nsp pitampura, beside pizza hut, Road to asia pacific	\N	\N	Open - Road Side	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Multi gates for Entry as well as Exit	Open All Days	09:00:00 AM - 10:00:00 PM	Car	25	25	0	0	Paid	Cash	Rs 20 per hour	Not applicable.	No such option	No	No
12	Azadpur -  Gupta Tower	New Delhi	Azadpur	Near by Gupta Tower, On road leading to Mukundpur Village	28.71066093	77.17772675	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 PM - 12:00:00 AM	Car, 2 Weelers	30	30	50	50	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
13	Azadpur - Naniwala Bagh Complex	New Delhi	Azadpur	Naniwala Bagh Complex, Behind Aradhana Bhawan	28.71080589	77.17857361	Open - Covered bounderies	Govt - Subcontracted	Pawment	No	No	Manually - Hand written	Multi gates for Entry as well as Exit	Open All Days	09:00:00 AM - 09:00:00 PM	Car, 2 Weelers	50	50	60	60	Paid	Cash	Rs 20 per hour	Rs 10 per hour	No such option	No	No
14	Model town	New Delhi	Model town 2	Near Mcdonald, nan	28.7059	77.1902	Open - Road Side	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Multi gates for Entry as well as Exit	Open All Days	08:00:00 AM - 10:00:00 PM	Car	50	50	0	0	Paid	Cash	Rs 20 per hour	Not applicable.	No such option	Yes	20rs for first hour, beyond that 10rs hour
15	Connaught Place -  F Block	New Delhi	F-Block, inner circle, gate no. 5, rajiv chowk	F-block, inner circle, gate no.5, near union bank, rajiv chowk, F-block, inner circle,gate no.5, near union bank, opposite public toilet, rajiv chowk	28.63192177	77.22070313	Open - Covered bounderies	Govt - Subcontracted	Cemented	Yes	yes	Stand alone printer	Single entry gate and Single exit gate	Open All Days	09:00:00 AM - 11:00:00 PM	Car, 2 Weelers	200	200	150	150	Paid	Cash	Rs 20 per hour	Rs 10 per hour	Monthly Pass	No	Car wash on demand (extra charges for this service)
16	Connaught Place - B Block	New Delhi	Block-B, RR-3, Metro Station gate no. 1, rajiv chowk	Block-B, RR-3, Metro Station gate no. 1, near wildcraft showroom, rajiv chowk, Block-B, RR-3, Metro Station gate no. 1, near wildcraft and bata showroom, rajiv chowk	28.63390732	77.21897888	Open - Covered bounderies	Govt - Subcontracted	Cemented	Yes	yes	Stand alone printer	Single entry gate and Single exit gate	Open All Days	06:00:00 AM - 11:00:00 PM	Car, 2 Weelers	200	200	130	130	Paid	Cash	Rs 20 per hour	Rs 10 per hour	Monthly Pass	No	No
17	Banglasaheb Gurudwara	New Delhi	Rajiv Chowk	Rajiv Chowk, Banglasaheb gurudwara near YMCA organization	28.62636566	77.21054077	Indoor - Multi Level	Govt - Open - Not Authorized to anyone	Cemented	Yes	No	Manually - Hand written	Single entry gate and Single exit gate	Open All Days	12:00:00 PM - 12:00:00 AM	Car, 2 Weelers	2000	2000	50	50	Free	Free Parking	Free parking	Free parking	No such option	No	No
18	Pitampura - Saraswati vihar	New Delhi	Pitampura, Madhuban Chowk	Saraswati Vihar, Behind Bus Stand, Near Wills lifestyle Metro Station	\N	\N	Open - Road Side	Not known	Cemented	No	No	No ticket	Single entry gate and Single exit gate	Open All Days	12:00:00 PM - 12:00:00 AM	Car, 2 Weelers	60	60	20	20	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
19	Hazarat Nizamuddin Police Station	New Delhi	Nizamuddin	Lodhi Rd, Near Sabz Burj, Nizamuddin West, New Delhi, Delhi 110013, nan	28.59254265	77.24382019	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	40	40	30	30	Free	Free	Free	Free	No such option	No	No
20	Basti Nizamuddin West	New Delhi	Nizamuddin	Basti Hazrat Nizamuddin West 110013, nan	28.59151649	77.24404144	Open - Covered bounderies	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Single entry gate and Single exit gate	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	40	40	20	20	Free	Free Parking	Free	Free	No such option	No	No
21	Humayun Tomb Interpretation Center	New Delhi	Nizamuddin	Mathura Road, Opposite Dargah Nizamuddin, New Delhi, Delhi 110013, nan	28.59306717	77.24456787	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	06:30:00 AM - 06:30:00 PM	Car, 2 Weelers	80	80	25	25	Paid	Cash	Rs 10 per Parking	Rs 10 per parking	No such option	No	No
22	Humayun Tomb Bus/Travellers	New Delhi	Nizamuddin	Mathura Road, Opposite Dargah Nizamuddin, New Delhi, Delhi 110013, nan	28.59408188	77.24598694	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Single entry gate and Single exit gate	Open All Days	06:30:00 AM - 06:30:00 PM	Bus	0	0	0	0	Paid	Cash	No Cars	No 2 wheelers	No such option	No	No
23	Humayun Tomb	New Delhi	Nizamuddin	Mathura Road, Opposite Dargah Nizamuddin, New Delhi, Delhi 110013, nan	28.5942173	77.24705505	Open - Covered bounderies	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	50	50	25	25	Free	Free Parking	Free	Free	No such option	No	No
24	Gurudwara Damdama Sahib	New Delhi	Nizamuddin	Block A, Nizamuddin East, Nizamuddin, New Delhi, Delhi 110013, nan	28.59490204	77.25288391	Open - Covered bounderies	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers, Bus	150	150	40	40	Free	Free Parking	Free	Free	No such option	No	No
25	Nizamuddin East Market	New Delhi	Nizamuddin	8, Nizamuddin East Market, New Delhi, Delhi 110003, nan	28.5897007	77.25256348	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	45	45	20	20	Free	Free Parking	Free	Free	No such option	No	No
26	Hazrat Nizamuddin Railway Station	New Delhi	Nizamuddin	Hazrat Nizamuddin Railway Station, New Delhi 110013, nan	28.58990288	77.25291443	Open - Covered bounderies	Not known	Cemented	No	No	No ticket	Single entry gate and Single exit gate	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	125	125	100	100	Free	Free Parking	Free	Free	No such option	No	No
27	Nizamuddin West Market	New Delhi	Nizamuddin	11, Main Market, Nizamuddin West , Delhi - 110013, nan	28.58945847	77.24544525	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	Yes	No	No ticket	Single entry gate and Single exit gate	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	25	25	15	15	Free	Free Parking	Free	Free	No such option	No	No
28	Community Center Nizamuddin West	New Delhi	Nizamuddin	Community Center Nizamuddin West, New Delhi 110013, nan	28.58946228	77.24516296	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Single entry gate and Single exit gate	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	25	25	15	15	Free	Free Parking	Free	Free	No such option	No	No
29	Sai Baba Mandir	New Delhi	Lodhi Colony	3, Lodhi Rd, Gokalpuri, Institutional Area, Lodi Colony, New Delhi, Delhi 110003, nan	28.58948898	77.22911835	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Single entry gate and Single exit gate	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	20	20	10	10	Free	Free Parking	Free	Free	No such option	No	No
30	Sri Sathya Sai International Centre	New Delhi	Lodhi colony	Lodhi Road, Bhishm Pitamah Marg, New Delhi, Delhi 110003, nan	28.58748817	77.23059082	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Single entry gate and Single exit gate	Open All Days	12:00:00 AM - 11:59:00 PM	Car	40	40	20	20	Free	Free Parking	Free	Free	No such option	No	No
31	NBCC Place	New Delhi	Lodhi Colony	Bhisham Pitamah Marg Pragati Vihar, New Delhi 110003, nan	28.5861721	77.23025513	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Single entry gate and Single exit gate	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	40	40	15	15	Free	Free Parking	Free	Free	No such option	No	No
32	Meharchand Market	New Delhi	Lodhi Colony	Meharchand Market, Lodi Colony, New Delhi, Delhi 110003, nan	28.58507347	77.22645569	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	100	100	30	30	Free	Free Parking	Free	Free	No such option	No	No
33	Palika Maternity Hospital	New Delhi	Lodhi colony	Block 11, Lodhi Colony, Near Khanna Market, New Delhi, Delhi 110003, nan	28.58369255	77.22205353	Open - Road Side	Govt - Open - Not Authorized to anyone	Pawment	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	20	20	10	10	Free	Free Parking	Free	Free	No such option	No	No
34	Lodhi Colony Market	New Delhi	Lodhi Colony	Lodi Colony Market, New Delhi, Delhi 110003, nan	28.58461761	77.22367859	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	60	60	25	25	Free	Free Parking	Free	Free	No such option	No	No
35	CGHS Wellness Centre	New Delhi	Lodhi Colony	Block No. 4, Dispensary No. 10, Lodi Road, Lodi Colony, New Delhi, Delhi 110003, nan	28.5823288	77.22488403	Open - Covered bounderies	Not known	Cemented	No	No	No ticket	Shared Single gate for Entry as well as Exit	Sun	08:00:00 AM - 03:00:00 PM	Car	10	10	10	10	Free	Free Parking	Free	Free	No such option	No	No
36	New Khanna Market	New Delhi	Lodhi Colony	New Khanna Market, Lodhi Road, New Delhi 110003, nan	28.58011436	77.22212219	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	30	30	20	20	Free	Free Parking	Free	Free	No such option	No	No
37	Azadpur Metro Station	New Delhi	Azadpur	Azadpur, metro station, Azadpur metro station	28.70660591	77.1820755	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	12:00:00 PM - 12:00:00 AM	Car, 2 Weelers	120	120	200	200	Paid	Cash	20rs for first 6 hours, 30 rs beyond that.	10rs for first 6 hours, 15rs beyond that.	Monthly Pass	Yes	Monthly pass on the basis of day and night slots.
38	Rafi Marg - Behind Reserve Bank of India	New Delhi	Central secretariat	Central Secretariat, Rafi Marg, Indian Newspaper Society	28.62007713	77.21264648	Open - Road Side	Not known	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 12:00:00 PM	Car, 2 Weelers	250	250	50	50	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
39	Shastri Bhawan	New Delhi	Central secretariat	Central secretariat Shastri Bhawan, Near by Women and child welfare development.	28.61671638	77.21679688	Open - Road Side	Not known	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 12:00:00 PM	Car, 2 Weelers	100	100	30	30	Free	Free Parking	Free parking	Free parking	No such option	No	No
40	Rajiv Chowk- Metro Station Gate No. 4	New Delhi	Rajiv Chowk, CP	nan, Near Gate no 4, in front of Farzi cafe	28.63251114	77.22120667	Open - Covered bounderies	Govt - Subcontracted	Cemented	Yes	yes	Manually - Hand written	Multi gates for Entry as well as Exit	Open All Days	06:00:00 AM - 11:59:00 PM	Car, 2 Weelers	70	70	20	20	Paid	Cash	Rs 20 per hour	Rs 10 per hour	Monthly Pass	No	No
41	Connaught Place - C Block	New Delhi	Connaught place	Cannought place, C-block, Near by union bank ATM, and embassy restaurant & bar.	28.63354492	77.22120667	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	08:00:00 AM - 11:00:00 PM	2 Weelers	0	0	120	120	Paid	Cash	Not applicable.	10 rs per hour, 50 rs, one hour onwards for the entire day.	No such option	No	No
42	Connaught Place - E Block	New Delhi	Cannought place, E- block	Cannought place, E-block, In front of Equestrain inspired lifestyle  (jump)	28.63348579	77.22109222	Open - Road Side	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Single entry gate and Single exit gate	Open All Days	06:00:00 AM - 12:00:00 PM	Car	15	15	0	0	Paid	Cash	Rs 20 per hour	Not applicable.	Monthly Pass	No	No
43	Connaught Place - D Block	New Delhi	Cannought place	Cannought place D block, Near by, rajiv chowk metro station gate no 3 and warehouse cafe.	28.63378906	77.22068024	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	No	Mobile App having Blue Tooth Printer	Shared Single gate for Entry as well as Exit	Open All Days	08:00:00 AM - 11:59:00 PM	Car	40	40	0	0	Paid	Cash	Rs 20 per hour	Not applicable.	Monthly Pass	No	No
44	Kohat Enclave Metro Station	New Delhi	Pitampura, near by madhuban chowk	Kohat enclave metro station, Pitampura, near by madhuban chowk.	28.6977005	77.14160156	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	yes	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	05:00:00 AM - 11:59:00 PM	Car	250	250	200	200	Paid	Cash	Rs 20 per hour	Rs 10 per hour	Monthly Pass	Yes	A printed card to charge for parking
45	Subhash Place Metro Station	New Delhi	Pitampura, nsp	Netaji subhash place metro station, Pitampura near by wazirpur	28.69505692	77.15205383	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	yes	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	200	200	250	250	Paid	Cash	Rs 20 per hour	Rs 10 per hour	Monthly Pass	No	No
46	HP TWIN Tower Pitampura	New Delhi	Nsp, pitampura	HP twin power, near by Starbucks coffee, Nsp, pitampura	28.69312096	77.1528244	Open - Road Side	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Multi gates for Entry as well as Exit	Open All Days	09:00:00 AM - 11:00:00 PM	Car, 2 Weelers	10	10	40	40	Paid	Cash	Rs 20 per hour	Rs 10 per hour	No such option	No	No
47	D-Mall Parking	New Delhi	Nsp, pitampura	D-mall parking, beside yes bank ATM, NSP , pitampura	28.692876	77.152637	Indoor - Single Level	Private - self managed	Cemented	Yes	yes	No ticket	Shared Single gate for Entry as well as Exit	Open All Days	10:00:00 AM - 10:00:00 PM	Car, 2 Weelers	100	100	150	150	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
48	Haldiram Parking	New Delhi	Nsp, pitampura	Haldiram, beside D-mall parking, Nsp, pitampura	28.69312096	77.1528244	Open - Road Side	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Multi gates for Entry as well as Exit	Open All Days	09:00:00 AM - 10:00:00 PM	Car, 2 Weelers	10	10	40	40	Paid	Cash	Rs 20 per hour	Rs 10 per hour	Monthly Pass	No	No
49	Netaji Subhash Place - Agarwal Millenium Tower 2	New Delhi	Nsp pitampura	Agarwal millenium tower 2, Nsp pitampura	28.69314575	77.14974976	Open - Road Side	Private - subcontracted	Cemented	No	No	Manually - Hand written	Multi gates for Entry as well as Exit	Open All Days	09:00:00 AM - 11:00:00 PM	Car, 2 Weelers	10	10	25	25	Paid	Cash	Rs 20 per hour	Rs 10 per hour	No such option	No	No
50	Aggarwal Metro Heights - Mangalam Realtors	New Delhi	Nsp pitampura	Aggarwal metro heights, near by mangalam realtors, Nsp pitampura	28.69327927	77.14957428	Open - Road Side	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Multi gates for Entry as well as Exit	Open All Days	08:00:00 AM - 10:00:00 PM	2 Weelers	0	0	100	100	Paid	Cash	Not applicable.	10 rs per hours, 15 rs beyond that.	Monthly Pass	No	No
51	Aggarwal Millenium Tower-1	New Delhi	Nsp, pitampura	Aggarwal millenium tower-1, behind pizza hut, Nsp, pitampura	\N	\N	Open - Covered bounderies	Private - subcontracted	Cemented	No	No	Manually - Hand written	Single entry gate and Single exit gate	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	100	100	150	150	Paid	Cash	20 for first hour, 5rs reduces for next hour.	10 rs for first hour, 5 rs after that.	Monthly Pass	Yes	No
52	Kalyan Jewellers - PP Trade Centre	New Delhi	Nsp, pitampura	Kalyan jewellers, in front of PP trade centre, Nsp, pitampura	28.69447327	77.14904022	Open - Road Side	Not known	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car	80	80	0	0	Free	Cash	Free parking.	Free parking.	No such option	No	No
53	Shalimar Bagh - Bus Stand	New Delhi	Shalimar bagh	Shalimar bagh bus stand, Near by maruti suzuki showroom, NEXA	28.70342636	77.16918182	Open - Road Side	Not known	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	50	50	20	20	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
54	Shalimar Bagh - Indian Oil Fuel Pump	New Delhi	Shalimar bagh	Indian oil pump, shalimar bagh, Near Bhavishaya nidhi bhawan.	28.70170975	77.16686249	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	08:00:00 AM - 10:00:00 PM	Car, 2 Weelers	100	100	80	80	Paid	Cash	20 for first hour, 10 for next subsequent hours.	10 rs for first hour, 5 rs for next subsequent hours.	Monthly Pass	No	No
55	Shalimar bagh - Industrial Area	New Delhi	Shalimar bagh	Industrial area, v- block, Shalimar bagh	\N	\N	Open - Road Side	Not known	Cemented	No	No	No ticket	Shared Single gate for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	120	120	50	50	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
56	Malviya Nagar - Geeta Bhawan Mandir	New Delhi	Malviya nagar	Geeta bhawan mandir, Near by malviya nagar metro station	28.53332138	77.20692444	Open - Road Side	Not known	Mud	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car	40	40	0	0	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
57	Paharganj - RG, City Centre	New Delhi	Paharganj	RG city centre, paharganj, Near by police station	28.64648628	77.2080307	Open - Covered bounderies	Govt - Subcontracted	Mud	No	yes	No ticket	Shared Single gate for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers, Bus	100	100	50	50	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
58	Paharganj - RG, City Centre	New Delhi	Paharganj	RG, centre,  delhi knighter lounge bar, Paharganj bus stand	28.64636993	77.20761871	Indoor - Single Level	Private - subcontracted	Pawment	No	No	No ticket	Shared Single gate for Entry as well as Exit	Open All Days	09:00:00 AM - 07:00:00 PM	Car, 2 Weelers	30	30	15	15	Free	Free Parking	Free parking.	Free parking.	No such option	Yes	No
59	Jhandewalan - Flatted Factories Complex	New Delhi	Jhandewalan FF complex	Flatted factories complex, Rani jhansi road, Paharganj	28.64792442	77.20446777	Indoor - Single Level	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Shared Single gate for Entry as well as Exit	Open All Days	09:00:00 AM - 09:00:00 PM	Car, 2 Weelers	250	250	100	100	Free	Free Parking	Free parking.	Free parking.	No such option	No	Very much secured parking, car can be left overnight at parking.
60	Jhandewalan - E-block	New Delhi	Jhandewalan, ambedkar bhawan road	E-block jhandewalan, ambedkar bhawan road,  near by Axis bank	28.64511299	77.20410919	Open - Road Side	Govt - Subcontracted	Mud	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	200	200	150	150	Paid	Cash	Rs 20 per hour	Rs 10 per hour	No such option	No	No
61	Jhandewalan Extension - Cycle Market	New Delhi	Jhandewalan, karol bagh	Jhandewalan extension, cycle market, Near by videocon tower, karol bagh	28.64567757	77.20406342	Open - Road Side	Private - subcontracted	Cemented	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	09:00:00 AM - 10:00:00 PM	Car, 2 Weelers	100	100	20	20	Paid	Cash	Rs 20 per hour	Rs 10 per hour	No such option	No	No
62	Jhandewalan - DDA building Cycle Market	New Delhi	Jhandewalan, near by videocon tower	DDA building, cycle market, Near by videocon tower, jhandewalan	28.64603043	77.20279694	Open - Road Side	Private - subcontracted	Mud	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	09:00:00 AM - 07:00:00 PM	Car, 2 Weelers	20	20	60	60	Paid	Cash	Rs 20 per hour	Rs 10 per hour	No such option	Yes	No
63	Jhandewalan - Videocon Tower Parking	New Delhi	Jhandewalan extension	Videocon tower parking, Jhandewalan extension	28.64520454	77.20256042	Open - Road Side	Private - self managed	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	50	50	30	30	Paid	Cash	Rs 20 per hour	Rs 10 per hour	Monthly Pass	No	No
64	Jhandewalan Extension - Near Income Tax Office	New Delhi	Jhandewalan, karol bagh	Jhandewalan extension, Near income tax office	28.64582062	77.20172882	Open - Road Side	Private - self managed	Cemented	No	No	Manually - Hand written	Multi gates for Entry as well as Exit	Open All Days	10:00:00 AM - 07:00:00 PM	Car	20	20	0	0	Paid	Cash	20 rs for first hour, 10 for the next subsequent hours	Not applicable.	No such option	No	No
65	Jhandewalan Extension -  Alankit Assignment Limited	New Delhi	Jhandewalan extension	Jhandewalan extension, Near by alankit assignment limited	28.64493179	77.20224762	Open - Road Side	Not known	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	40	40	20	20	Free	Free Parking	Free parking	Free parking.	No such option	No	No
66	Jhandewalan - Anarkali Complex	New Delhi	Jhandewalan	Anarkali complex, jhandewalan, Behind videocon tower	28.64481163	77.20252228	Indoor - Single Level	Private - subcontracted	Cemented	No	No	Manually - Hand written	Single entry gate and Single exit gate	Open All Days	09:00:00 AM - 09:00:00 AM	Car, 2 Weelers	40	40	80	80	Paid	Cash	Rs 20 per hour	Rs 10 per hour	Monthly Pass	No	No
67	Madhuban Chowk	New Delhi	Madhuban chowk, pitampura	Madhuban chowk Red light, Near by govt school, pitampura	28.7034874	77.13260651	Open - Road Side	Not known	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	100	100	20	20	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
68	Rohini Court	New Delhi	Madhuban chowk, pitampura	Rohini court, madhuban chowk crossing, Pitampura	28.70665741	77.13260651	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	50	50	20	20	Free	Free Parking	Free.	Free.	No such option	No	No
69	Madhuban chowk, Shiva Hardware Market	New Delhi	Madhuban chowk, pitampura	Madhuban chowk, shiva harware market, After crossing madhuban chowk Red light	28.70144272	77.12887573	Open - Covered bounderies	Govt - Subcontracted	Mud	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	08:00:00 AM - 10:00:00 PM	Car, 2 Weelers	100	100	20	20	Paid	Cash	Rs 20 per hour	Rs 10 per hour	Monthly Pass	No	No
70	Rani Bagh - Sita Ram Mandir	New Delhi	Rani bagh	Rani bagh, near sita ram mandir, Pitampura	28.68327713	77.13652039	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car	50	50	0	0	Free	Free Parking	Free parking.	Not applicable.	No such option	No	No
71	Karol Bagh - Gupta Market	New Delhi	Karol bagh gupta market	Metro view hotel, gupta market, Karol bagh	\N	\N	Open - Road Side	Private - self managed	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	40	40	20	20	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
72	Karol Bagh - Baptist Church	New Delhi	Karol bagh	Baptist church, near by police station, Karol bagh	\N	\N	Open - Road Side	Not known	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car	30	30	0	0	Free	Free Parking	Free parking.	Not applicable.	No such option	No	No
73	Karol Bagh - PC jewellers	New Delhi	Karol bagh, gupta market	PC jewellers, gupta market, Karol bagh	\N	\N	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	50	50	20	20	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
74	Karol Bagh - Punjab National Bank	New Delhi	Karol bagh gupta market	Punjab national bank, beside jagirilaj, Gupta market,  karol bagh	\N	\N	Open - Road Side	Govt - Open - Not Authorized to anyone	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	40	40	15	15	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
75	Connaught Place - Super Bazar	New Delhi	Super bazar, cannought place	Near Hotel Alka Premier and pizza hut, Near by super market bus stand, CP	\N	\N	Open - Road Side	Private - subcontracted	Cemented	No	yes	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	08:00:00 AM - 09:00:00 PM	Car	30	30	0	0	Paid	Cash	Rs 20 per hour	Not applicable.	Monthly Pass	No	No
76	Connaught Place - Hdfc bank	New Delhi	Super bazar bus stand Cp	Hotel bright, hdfc bank, Near by super bazar, cannought place	\N	\N	Open - Road Side	Private - subcontracted	Cemented	No	yes	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	09:00:00 AM - 11:00:00 PM	Car	50	50	0	0	Paid	Cash	Rs 20 per hour	Not applicable.	Monthly Pass	No	No
77	Connaught Place - M - block	New Delhi	M block, outer circle, CP	M - block, near by indian grill company, M- block, outer circle, CP	\N	\N	Open - Covered bounderies	Private - subcontracted	Cemented	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	09:00:00 AM - 11:59:00 PM	Car	60	60	0	0	Paid	Cash	20 rs per hour, max 100	Not applicable.	Monthly Pass	No	No
78	Connaught Place M - block	New Delhi	M - block, near  chilis' bar CP	M- BLOCK, near by chilli's bar, Outer circle, CP	\N	\N	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	09:00:00 AM - 11:59:00 PM	Car	30	30	0	0	Paid	Cash	Rs 20 per hour	Not applicable.	No such option	No	No
79	Connaught Place M- block	New Delhi	M-block, HP petroleum, CP	M - block, HP Petroleum, Near Oriental Bank of Commerce, Near HP petroleum, CP	\N	\N	Open - Road Side	Private - subcontracted	Cemented	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car	50	50	0	0	Free	Free Parking	Free parking.	Not applicable.	No such option	Yes	No
80	Connaught Place N - block	New Delhi	N - block,  near adidas showroom on indira chowk	N - block,  near adidas showroom, On indira chowk, CP	\N	\N	Open - Covered bounderies	Private - subcontracted	Cemented	No	No	Manually - Hand written	Shared Single gate for Entry as well as Exit	Open All Days	11:00:00 AM - 11:59:00 PM	Car	20	20	0	0	Paid	Cash	20 for 1st hour, 100 max	Not applicable. 8	Monthly Pass	No	No
81	Connaught Place F-block	New Delhi	F-block, middle circle,  CP	F-block, middle circle Maruti suzuki showroom, Near by wine and beer shop, CP	\N	\N	Open - Road Side	Not known	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car	50	50	10	10	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
82	Connaught Place M - block Indira Chowk	New Delhi	M - Block, on indira chowk beside adidas	M - block,  on indira chowk, In front of statesman house,  CP	\N	\N	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	No	Mobile App having Blue Tooth Printer	Single entry gate and Single exit gate	Open All Days	09:00:00 AM - 09:00:00 PM	Car	40	40	0	0	Paid	Cash	Rs 20 per hour	Not applicable.	Monthly Pass	No	No
83	Connaught Place N-block, Punjab National Bank	New Delhi	Cannought Place, n - block	N - block, near punjab national bank,  on indira chowk,  CP	\N	\N	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	No	Mobile App having Blue Tooth Printer	Shared Single gate for Entry as well as Exit	Open All Days	09:00:00 AM - 11:59:00 PM	Car	50	50	0	0	Paid	Cash	Rs 20 per hour	Not applicable.	Monthly Pass	No	No
84	Barakhamba Road - New Delhi House Building	New Delhi	New Delhi House Building, Barakhamba	New delhi house building, behind the building, Barakhamba road, CP	\N	\N	Open - Road Side	Not known	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 PM	Car, 2 Weelers	50	50	20	20	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
85	Barakhamba Road - ECE House	New Delhi	Barakhamba Road, CP	ECE house, near by HDFC bank, Barakhamba road, CP	28.629724	77.225735	Open - Road Side	Not known	Cemented	No	No	No ticket	Multi gates for Entry as well as Exit	Open All Days	12:00:00 AM - 11:59:00 AM	Car	30	30	0	0	Free	Free Parking	Free parking.	Free parking.	No such option	No	No
86	Barakhamba Road - Statesmen House	New Delhi	Barakhamba Road	Statesmen house back, near by axis bank, Barakhamba road,  CP	28.6305245	77.2241101	Open - Covered bounderies	Govt - Subcontracted	Cemented	No	No	Mobile App having Blue Tooth Printer	Single entry gate and Single exit gate	Open All Days	08:00:00 AM - 11:00:00 PM	Car, 2 Weelers	80	80	150	150	Paid	Cash	20 per hour, max 100	Rs 10 per hour, max 100	Monthly Pass	No	Charges on monthly passes only for 22 days, not for the  entire month.
87	Gopaldas ARDEE -  Indira Red Light	New Delhi	Barakhamba Road, CP	Gopaldas ARDEE, on Indira red light, Barakhamba road, CP	28.631343	77.223397	Open - Road Side	Govt - Subcontracted	Cemented	No	No	Mobile App having Blue Tooth Printer	Multi gates for Entry as well as Exit	Open All Days	08:00:00 AM - 11:00:00 PM	Car, 2 Weelers	60	60	10	10	Paid	Cash	20 rs for 1st hour, max 100	10rs for 1st hour, 50 max	Monthly Pass	No	Charges on monthly passes only for 22 days, not for the entire month.
\.

INSERT INTO users (user_id, user_name, user_email, user_password, user_phone_no, user_address, role, created_on)
VALUES
-- Super Admin
(1, 'superadmin', 'superadmin@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '9009244409', 'Impressico Business Park', 'super_admin', now() - INTERVAL '90 days'),

-- Admins (10) - Will manage parking lots
(10, 'admin10', 'admin10@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91900000110', 'Admin Office Delhi 1', 'admin', now() - INTERVAL '90 days'),
(11, 'admin11', 'admin11@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91900000111', 'Admin Office Delhi 2', 'admin', now() - INTERVAL '89 days'),
(12, 'admin12', 'admin12@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91900000112', 'Admin Office Delhi 3', 'admin', now() - INTERVAL '88 days'),
(13, 'admin13', 'admin13@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91900000113', 'Admin Office Delhi 4', 'admin', now() - INTERVAL '87 days'),
(14, 'admin14', 'admin14@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91900000114', 'Admin Office Delhi 5', 'admin', now() - INTERVAL '86 days'),
(15, 'admin15', 'admin15@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91900000115', 'Admin Office Delhi 6', 'admin', now() - INTERVAL '85 days'),
(16, 'admin16', 'admin16@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91900000116', 'Admin Office Delhi 7', 'admin', now() - INTERVAL '84 days'),
(17, 'admin17', 'admin17@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91900000117', 'Admin Office Delhi 8', 'admin', now() - INTERVAL '83 days'),
(18, 'admin18', 'admin18@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91900000118', 'Admin Office Delhi 9', 'admin', now() - INTERVAL '82 days'),
(19, 'admin19', 'admin19@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91900000119', 'Admin Office Delhi 10', 'admin', now() - INTERVAL '81 days'),

-- Regular Users (10)
(20, 'user20', 'user20@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91910000220', 'Pitampura, Delhi', 'user', now() - INTERVAL '90 days'),
(21, 'user21', 'user21@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91910000221', 'Rohini, Delhi', 'user', now() - INTERVAL '89 days'),
(22, 'user22', 'user22@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91910000222', 'Karol Bagh, Delhi', 'user', now() - INTERVAL '88 days'),
(23, 'user23', 'user23@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91910000223', 'Connaught Place, Delhi', 'user', now() - INTERVAL '87 days'),
(24, 'user24', 'user24@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91910000224', 'Nizamuddin, Delhi', 'user', now() - INTERVAL '86 days'),
(25, 'user25', 'user25@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91910000225', 'Lodhi Colony, Delhi', 'user', now() - INTERVAL '85 days'),
(26, 'user26', 'user26@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91910000226', 'Azadpur, Delhi', 'user', now() - INTERVAL '84 days'),
(27, 'user27', 'user27@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91910000227', 'Shalimar Bagh, Delhi', 'user', now() - INTERVAL '83 days'),
(28, 'user28', 'user28@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91910000228', 'Paharganj, Delhi', 'user', now() - INTERVAL '82 days'),
(29, 'user29', 'user29@parking.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '+91910000229', 'Malviya Nagar, Delhi', 'user', now() - INTERVAL '81 days'),
(30, 'Arun Singh', 'arunsingh17683@gmail.com', 'scrypt:32768:8:1$GaMG6bFAxMO1ate5$e918a348b3fa96accf2954613b74692548218702a63dd24928e269407ce904bbd7d088643e45e261a95b52f58bc41c3609d9ef3de9bb9a7abe87ce9d6efcb463', '1234321123', '456Noida', 'user', now() - INTERVAL '80 days');


-- ===========================
-- 2) USER VEHICLES
-- ===========================


INSERT INTO user_vehicles (vehicle_id, user_id, registration_number, vehicle_name, make, model, year, vehicle_type, color, is_active, created_at)
VALUES
-- User 20 vehicles
(1, 20, 'DL02AB1234', 'My Honda City', 'Honda', 'City', 2020, 'car', 'Silver', true, now() - INTERVAL '85 days'),
(2, 20, 'DL02CD5678', 'My Activa', 'Honda', 'Activa', 2021, 'motorcycle', 'Red', true, now() - INTERVAL '80 days'),

-- User 21 vehicles
(3, 21, 'DL01EF9012', 'Swift Dzire', 'Maruti', 'Swift Dzire', 2019, 'car', 'White', true, now() - INTERVAL '85 days'),
(4, 21, 'DL01GH3456', 'Splendor', 'Hero', 'Splendor', 2022, 'motorcycle', 'Black', true, now() - INTERVAL '75 days'),

-- User 22 vehicles
(5, 22, 'DL03IJ7890', 'Hyundai i20', 'Hyundai', 'i20', 2021, 'car', 'Blue', true, now() - INTERVAL '80 days'),
(6, 22, 'DL03KL1234', 'Pulsar', 'Bajaj', 'Pulsar', 2020, 'motorcycle', 'Black', true, now() - INTERVAL '70 days'),
(7, 22, 'DL03MN5678', 'Old Wagon R', 'Maruti', 'Wagon R', 2015, 'car', 'Grey', false, now() - INTERVAL '60 days'),

-- User 23 vehicles
(8, 23, 'DL05OP9012', 'Creta', 'Hyundai', 'Creta', 2022, 'car', 'Red', true, now() - INTERVAL '75 days'),
(9, 23, 'DL05QR3456', 'Activa 6G', 'Honda', 'Activa 6G', 2023, 'motorcycle', 'White', true, now() - INTERVAL '65 days'),

-- User 24 vehicles
(10, 24, 'DL26ST7890', 'Fortuner', 'Toyota', 'Fortuner', 2021, 'car', 'Black', true, now() - INTERVAL '70 days'),
(11, 24, 'DL26UV1234', 'Royal Enfield', 'Royal Enfield', 'Classic 350', 2020, 'motorcycle', 'Black', true, now() - INTERVAL '60 days'),

-- User 25 vehicles
(12, 25, 'DL01WX5678', 'Verna', 'Hyundai', 'Verna', 2020, 'car', 'White', true, now() - INTERVAL '65 days'),
(13, 25, 'DL01YZ9012', 'Dio', 'Honda', 'Dio', 2021, 'motorcycle', 'Pink', true, now() - INTERVAL '55 days'),

-- User 26 vehicles
(14, 26, 'DL06AB3456', 'Baleno', 'Maruti', 'Baleno', 2019, 'car', 'Blue', true, now() - INTERVAL '60 days'),
(15, 26, 'DL06CD7890', 'Jupiter', 'TVS', 'Jupiter', 2022, 'motorcycle', 'Grey', true, now() - INTERVAL '50 days'),

-- User 27 vehicles
(16, 27, 'DL12EF1234', 'Seltos', 'Kia', 'Seltos', 2022, 'car', 'Red', true, now() - INTERVAL '55 days'),
(17, 27, 'DL12GH5678', 'Ntorq', 'TVS', 'Ntorq', 2021, 'motorcycle', 'Yellow', true, now() - INTERVAL '45 days'),
(18, 27, 'DL12IJ9012', 'Old Alto', 'Maruti', 'Alto', 2012, 'car', 'White', false, now() - INTERVAL '40 days'),

-- User 28 vehicles
(19, 28, 'DL09KL3456', 'Innova', 'Toyota', 'Innova Crysta', 2021, 'car', 'Silver', true, now() - INTERVAL '50 days'),
(20, 28, 'DL09MN7890', 'Fascino', 'Yamaha', 'Fascino', 2022, 'motorcycle', 'Blue', true, now() - INTERVAL '40 days'),

-- User 29 vehicles
(21, 29, 'DL07OP1234', 'XUV700', 'Mahindra', 'XUV700', 2023, 'car', 'Black', true, now() - INTERVAL '45 days'),
(22, 29, 'DL07QR5678', 'Avenger', 'Bajaj', 'Avenger', 2020, 'motorcycle', 'Black', true, now() - INTERVAL '35 days');



-- ===========================
-- 3) ADMIN PARKING LOT ASSIGNMENTS
-- Assign admins to parking lots (each admin manages ~9 lots)
-- ===========================
DO $$
DECLARE
    lot_id INTEGER;
    admin_id INTEGER;
BEGIN
    FOR lot_id IN 1..87 LOOP
        -- Assign admin based on lot_id (distribute evenly among 10 admins)
        admin_id := 10 + ((lot_id - 1) % 10);
        
        INSERT INTO admin_parking_lots (admin_id, parking_lot_id, assigned_date)
        VALUES (admin_id, lot_id, now() - INTERVAL '85 days');
    END LOOP;
END $$;

-- ===========================
-- 4) FLOORS, ROWS, AND SLOTS FOR ALL 87 PARKING LOTS
-- Each lot gets: 3 floors × 4 rows × 10 slots = 120 slots
-- Total: 87 × 120 = 10,440 slots
-- ===========================
DO $$
DECLARE
    lot_id INTEGER;
    floor_num INTEGER;
    row_num INTEGER;
    slot_num INTEGER;
    floor_name_var VARCHAR(50);
    row_name_var VARCHAR(50);
BEGIN
    RAISE NOTICE 'Starting infrastructure generation for 87 parking lots...';
    
    -- Generate infrastructure for all 87 parking lots
    FOR lot_id IN 1..87 LOOP
        -- Generate 3 floors per parking lot
        FOR floor_num IN 1..3 LOOP
            -- Determine floor name
            floor_name_var := CASE floor_num
                WHEN 1 THEN 'Ground Floor'
                WHEN 2 THEN 'First Floor'
                WHEN 3 THEN 'Second Floor'
            END;
            
            -- Insert floor
            INSERT INTO floors (floor_name, parkinglot_id)
            VALUES (floor_name_var, lot_id);
            
            -- Generate 4 rows per floor
            FOR row_num IN 1..4 LOOP
                -- Determine row name
                row_name_var := 'Row-' || chr(64 + row_num);  -- Row-A, Row-B, Row-C, Row-D
                
                -- Insert row
                INSERT INTO rows (row_name, floor_id, parkinglot_id)
                VALUES (row_name_var, currval('floors_floor_id_seq'), lot_id);
                
                -- Generate 10 slots per row
                FOR slot_num IN 1..10 LOOP
                    -- Insert slot
                    INSERT INTO slots (slot_name, status, row_id, floor_id, parkinglot_id)
                    VALUES (
                        'S' || slot_num,
                        0,  -- 0 = free
                        currval('rows_row_id_seq'),
                        currval('floors_floor_id_seq'),
                        lot_id
                    );
                END LOOP;
            END LOOP;
        END LOOP;
        
        -- Progress indicator every 10 lots
        IF lot_id % 10 = 0 THEN
            RAISE NOTICE 'Completed % parking lots...', lot_id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Infrastructure generation complete: 261 floors, 1044 rows, 10440 slots';
END $$;


-- ===========================
-- 5) PARKING SESSIONS (100 sample sessions)
-- Distributed across different parking lots using actual slot IDs
-- ===========================
INSERT INTO parking_sessions (
  ticket_id, parkinglot_id, floor_id, row_id, slot_id,
  vehicle_reg_no, user_id, vehicle_id, start_time, end_time, 
  duration_hrs, amount_paid, total_amount, payment_status, 
  payment_method, session_status, vehicle_type
)
SELECT
  'TICKET-' || LPAD(s::text, 4, '0'),
  slot.parkinglot_id,
  slot.floor_id,
  slot.row_id,
  slot.slot_id,
  CASE 
    WHEN s <= 22 THEN (SELECT registration_number FROM user_vehicles WHERE vehicle_id = s)
    ELSE 'TEMP' || LPAD(s::text, 4, '0')
  END AS vehicle_reg_no,
  20 + ((s-1) % 10) AS user_id,
  CASE WHEN s <= 22 THEN s ELSE NULL END AS vehicle_id,
  now() - (floor(random()*30) || ' days')::interval - (floor(random()*24) || ' hours')::interval AS start_time,
  CASE 
    WHEN random() < 0.85 THEN 
      now() - (floor(random()*29) || ' days')::interval + (30 + floor(random()*180)) * INTERVAL '1 minute'
    ELSE NULL
  END AS end_time,
  CASE 
    WHEN random() < 0.85 THEN GREATEST(1, CEIL((0.5 + random() * 7.5)::numeric))
    ELSE NULL
  END AS duration_hrs,
  CASE 
    WHEN random() < 0.85 THEN 
      GREATEST(1, CEIL((0.5 + random() * 7.5)::numeric)) * 
      CASE WHEN random() < 0.6 THEN 30 ELSE 20 END
    ELSE 0
  END AS amount_paid,
  CASE 
    WHEN random() < 0.85 THEN 
      GREATEST(1, CEIL((0.5 + random() * 7.5)::numeric)) * 
      CASE WHEN random() < 0.6 THEN 30 ELSE 20 END
    ELSE NULL
  END AS total_amount,
  CASE 
    WHEN random() < 0.85 THEN 'completed'
    ELSE 'pending'
  END AS payment_status,
  CASE 
    WHEN random() < 0.85 THEN 
      CASE 
        WHEN random() < 0.4 THEN 'card'
        WHEN random() < 0.7 THEN 'upi'
        ELSE 'cash'
      END
    ELSE NULL
  END AS payment_method,
  CASE 
    WHEN random() < 0.85 THEN 'completed'
    ELSE 'active'
  END AS session_status,
  CASE 
    WHEN random() < 0.6 THEN 'Car'
    WHEN random() < 0.9 THEN 'Two-Wheeler'
    ELSE 'Three-Wheeler'
  END AS vehicle_type
FROM generate_series(1, 100) AS s
CROSS JOIN LATERAL (
  SELECT slot_id, parkinglot_id, floor_id, row_id
  FROM slots
  WHERE parkinglot_id = ((s-1) % 87) + 1
  ORDER BY random()
  LIMIT 1
) AS slot;

-- ===========================
-- 6) ADMIN PAYMENT LEDGER
-- Current day ledger for each admin
-- ===========================
INSERT INTO admin_payment_ledger (admin_id, date, opening_balance, today_collection, payment_made, closing_balance)
VALUES
(10, current_date, 0, 450, 400, 50),
(11, current_date, 0, 380, 350, 30),
(12, current_date, 0, 520, 480, 40),
(13, current_date, 0, 340, 300, 40),
(14, current_date, 0, 480, 450, 30),
(15, current_date, 0, 290, 250, 40),
(16, current_date, 0, 410, 380, 30),
(17, current_date, 0, 360, 320, 40),
(18, current_date, 0, 390, 350, 40),
(19, current_date, 0, 420, 390, 30);

-- ===========================
-- 7) UPDATE SEQUENCES
-- ===========================
SELECT setval(pg_get_serial_sequence('users', 'user_id'), (SELECT MAX(user_id) FROM users));
SELECT setval(pg_get_serial_sequence('parkinglots_details', 'parkinglot_id'), (SELECT MAX(parkinglot_id) FROM parkinglots_details));
SELECT setval(pg_get_serial_sequence('floors', 'floor_id'), (SELECT MAX(floor_id) FROM floors));
SELECT setval(pg_get_serial_sequence('rows', 'row_id'), (SELECT MAX(row_id) FROM rows));
SELECT setval(pg_get_serial_sequence('slots', 'slot_id'), (SELECT MAX(slot_id) FROM slots));
SELECT setval(pg_get_serial_sequence('user_vehicles', 'vehicle_id'), (SELECT MAX(vehicle_id) FROM user_vehicles));
SELECT setval(pg_get_serial_sequence('admin_parking_lots','id'), (SELECT MAX(id) FROM admin_parking_lots));
SELECT setval(pg_get_serial_sequence('admin_payment_ledger','id'), (SELECT MAX(id) FROM admin_payment_ledger));

-- ===========================
-- SUMMARY
-- ===========================
SELECT 
    'Database seeding complete!' as status,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM parkinglots_details) as total_parking_lots,
    (SELECT COUNT(*) FROM floors) as total_floors,
    (SELECT COUNT(*) FROM rows) as total_rows,
    (SELECT COUNT(*) FROM slots) as total_slots,
    (SELECT COUNT(*) FROM user_vehicles) as total_vehicles,
    (SELECT COUNT(*) FROM parking_sessions) as total_sessions,
    (SELECT COUNT(*) FROM admin_parking_lots) as total_admin_assignments;
