# Electronic Payment System — Feature Documentation

## Overview

BookMyShow-style payment system integrated into the VisionPark Android app. Supports UPI, Debit/Credit Card, Net Banking, and Wallet payments. Currently runs in **simulated mode** — real Razorpay integration can be enabled with 5 minutes of configuration.

---

## Architecture

```
Android PaymentActivity
    │
    ├── Step 1: Initiate  ──►  POST /api/v1/payments/initiate
    │           (creates order, returns order_id + amount)
    │
    ├── Step 2: User pays (UPI / Card / NetBanking / Wallet)
    │           [Simulated: 1.5s delay]
    │           [Razorpay: opens SDK checkout sheet]
    │
    ├── Step 3: Verify    ──►  POST /api/v1/payments/verify
    │           (confirms payment, marks session/booking as paid)
    │
    └── Step 4: Success Screen (receipt with TXN ID)
```

---

## Database Table

**Table:** `payment_transactions`

| Column | Type | Description |
|--------|------|-------------|
| `txn_id` | VARCHAR(30) PK | e.g. `TXN-A1B2C3D4E5` |
| `order_id` | VARCHAR(50) | e.g. `ORD-A1B2C3D4` |
| `payment_id` | VARCHAR(100) | Razorpay payment ID (nullable in sim mode) |
| `user_id` | INTEGER FK | References `users.user_id` |
| `payment_for` | VARCHAR(20) | `session` or `booking` |
| `reference_id` | VARCHAR(50) | `ticket_id` or `booking_id` |
| `amount` | NUMERIC(10,2) | Amount in Rs. |
| `currency` | VARCHAR(5) | `INR` |
| `payment_method` | VARCHAR(20) | `upi` / `card` / `netbanking` / `wallet` |
| `upi_id` | VARCHAR(100) | UPI ID (nullable) |
| `card_last4` | VARCHAR(4) | Last 4 digits of card (nullable) |
| `wallet_name` | VARCHAR(50) | Wallet name (nullable) |
| `status` | VARCHAR(20) | `pending` / `paid` / `failed` / `refunded` |
| `description` | TEXT | Human-readable description |
| `parking_lot_name` | VARCHAR(200) | Parking lot name for receipt |
| `created_at` | TIMESTAMP | When payment was initiated |
| `paid_at` | TIMESTAMP | When payment was confirmed (nullable) |

**Indexes:**
- `idx_payments_user` on `user_id`
- `idx_payments_order` on `order_id`

---

## Payment Flow

### Simulated Mode (Current — Default)

```
1. User taps "Exit Vehicle" or "Pay Now"
2. PaymentActivity opens with amount pre-filled
3. User selects method (UPI/Card/NetBanking/Wallet)
4. User enters details (UPI ID or card number)
5. Taps "Pay Rs. X"
6. App calls POST /api/v1/payments/initiate  →  gets order_id
7. App waits 1.5 seconds (simulates processing)
8. App calls POST /api/v1/payments/verify    →  payment confirmed
9. PaymentSuccessActivity shows receipt
```

### Razorpay Mode (Production — 5 min setup)

```
1-5. Same as above
6. App calls POST /api/v1/payments/initiate  →  gets Razorpay order_id
7. App opens Razorpay SDK checkout sheet
8. User completes payment on Razorpay UI
9. Razorpay returns payment_id + signature to app
10. App calls POST /api/v1/payments/verify with signature
11. Backend verifies HMAC signature with Razorpay secret
12. PaymentSuccessActivity shows receipt
```

---

## API Endpoints

### 1. Initiate Payment
```
POST /api/v1/payments/initiate
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "payment_for": "session",
  "reference_id": "TICKET-0011",
  "payment_method": "upi",
  "upi_id": "user@paytm"
}
```

**For card payment:**
```json
{
  "payment_for": "booking",
  "reference_id": "BK-A1B2C3",
  "payment_method": "card",
  "card_last4": "4242"
}
```

**Supported `payment_for` values:** `session`, `booking`

**Supported `payment_method` values:** `upi`, `card`, `netbanking`, `wallet`, `cash`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order_id": "ORD-BC39D3E0",
    "txn_id": "TXN-352CF5DE-5",
    "amount": 60.0,
    "amount_paise": 6000,
    "currency": "INR",
    "description": "Parking at Jahangirpuri | Ticket: TICKET-0011",
    "parking_lot_name": "Jahangirpuri Metro Parking",
    "payment_method": "upi",
    "razorpay_key_id": "rzp_test_DEMO_KEY",
    "mode": "simulated"
  }
}
```

---

### 2. Verify Payment
```
POST /api/v1/payments/verify
Authorization: Bearer <token>
```

**Request Body (simulated):**
```json
{
  "order_id": "ORD-BC39D3E0",
  "payment_id": "pay_SIM_BC39D3E0"
}
```

**Request Body (Razorpay):**
```json
{
  "order_id": "order_ABC123",
  "payment_id": "pay_XYZ789",
  "signature": "hmac_sha256_signature"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment successful",
  "data": {
    "txn_id": "TXN-352CF5DE-5",
    "order_id": "ORD-BC39D3E0",
    "payment_id": "pay_SIM_BC39D3E0",
    "amount": 60.0,
    "currency": "INR",
    "status": "paid",
    "payment_method": "upi",
    "paid_at": "2026-05-13T10:30:00",
    "parking_lot_name": "Jahangirpuri Metro Parking"
  }
}
```

**Side effects on verify:**
- If `payment_for = session`: sets `payment_status = completed` on `parking_sessions`
- If `payment_for = booking`: sets `payment_status = paid` on `parking_bookings`

---

### 3. Payment History
```
GET /api/v1/payments/history
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "txn_id": "TXN-4A32281E-1",
      "payment_for": "booking",
      "reference_id": "BK-B90HJ0",
      "amount": 60.0,
      "payment_method": "card",
      "status": "paid",
      "parking_lot_name": "Jahangirpuri Metro Parking",
      "created_at": "2026-05-13T10:00:00",
      "paid_at": "2026-05-13T10:00:05"
    }
  ]
}
```

---

### 4. Get Single Transaction
```
GET /api/v1/payments/{txn_id}
Authorization: Bearer <token>
```

---

## Amount Calculation

### For Sessions
- If `total_amount` is already set on the session → use that
- If session is completed (has `end_time`) → `(end_time - start_time) × rate`
- If session is still active → `(now - start_time) × rate`
- Default rate: **Rs. 20/hr** (falls back if lot rate not parseable)

### For Bookings
- Uses `estimated_amount` from the booking record
- Calculated at booking creation time: `duration_hours × hourly_rate`

---

## Android UI Files

| File | Purpose |
|------|---------|
| `activities/PaymentActivity.java` | Main payment screen |
| `activities/PaymentSuccessActivity.java` | Receipt/success screen |
| `res/layout/activity_payment.xml` | Payment screen layout |
| `res/layout/activity_payment_success.xml` | Success screen layout |

### PaymentActivity Intent Extras

```java
Intent intent = new Intent(this, PaymentActivity.class);
intent.putExtra(PaymentActivity.EXTRA_PAYMENT_FOR,  "session");   // or "booking"
intent.putExtra(PaymentActivity.EXTRA_REFERENCE_ID, "TICKET-001");
intent.putExtra(PaymentActivity.EXTRA_AMOUNT,       60.0);
intent.putExtra(PaymentActivity.EXTRA_DESCRIPTION,  "Parking at Jahangirpuri");
startActivityForResult(intent, 1001);
```

---

## Backend Files

| File | Purpose |
|------|---------|
| `fastapi_app/routers/payments.py` | All payment API endpoints |
| `fastapi_app/models.py` | `PaymentTransaction` SQLAlchemy model |
| `fastapi_app/tests/test_payments.py` | Pytest test suite |

---

## Switching to Real Razorpay

### Step 1 — Create Razorpay Account
1. Go to [razorpay.com](https://razorpay.com) → Sign Up (free)
2. Go to Settings → API Keys → Generate Test Key
3. Copy `Key ID` and `Key Secret`

### Step 2 — Add Keys to Environment
```bash
# In parking_app_integration/Backend/.env
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
PAYMENT_MODE=razorpay
```

### Step 3 — Install Razorpay SDK (Backend)
```bash
pip install razorpay
```
Then uncomment the 3 Razorpay blocks in `fastapi_app/routers/payments.py`.

### Step 4 — Add Razorpay SDK (Android)
```kotlin
// In app/build.gradle.kts
implementation("com.razorpay:checkout:1.6.33")
```

### Step 5 — Replace Simulation in PaymentActivity
Replace `Thread.sleep(1500)` with:
```java
Checkout checkout = new Checkout();
checkout.setKeyID(BuildConfig.RAZORPAY_KEY_ID);
JSONObject options = new JSONObject();
options.put("order_id", orderId);
options.put("amount", amountPaise);
options.put("currency", "INR");
checkout.open(this, options);
```

---

## Test Credentials (Razorpay Test Mode)

| Method | Details |
|--------|---------|
| UPI | `success@razorpay` |
| Card | `4111 1111 1111 1111` / Expiry: any future / CVV: any 3 digits |
| NetBanking | Select any bank → use test credentials |

---

## Error Codes

| HTTP | Scenario |
|------|----------|
| 400 | Invalid `payment_for`, invalid `payment_method`, missing fields |
| 401 | Missing or invalid JWT token |
| 404 | Session, booking, or transaction not found |
| 409 | Session/booking already paid, transaction already verified |
