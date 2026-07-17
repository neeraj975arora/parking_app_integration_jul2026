## Admin Endpoints (`/admin`)

### Admin-to-Lot Assignment (Super Admin Only)

| Method                                     | Path                                  | Description                                               | Protected (Role)  | usage                                                                                   |
| ------------------------------------------ | ------------------------------------- | --------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| POST                                       | /admin/assign_lot                     | Assign a parking lot to an admin                          | Yes (super_admin) | when "create admin" button on "admin management screen" is pressed                               |
| DELETE                                     | /admin/remove_assignment              | Remove admin-lot assignment                               | Yes (super_admin) | when "delete" button on "admin management screen" is pressed                                     |
| GET                                        | /all_admin/admin_lots/                | super admin to retrieve a list of all parking lot details to populate "existing Admin section" of "admin management screen" when it is initially loaded|
| that are assigned to each individual admin | to populate "admin management screen" |
| GET                                        | /admin/all_session/details/           | Get all parking session details for all last 3 months     | Yes (super admin) | to populate "live sessions screen" for super admin" or to populate "payment collections screen" or to populate "dashboard screen" after successful login as superadmin.



" |

### Example Request Body for /admin/assign_lot

```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "password": "securePassword123",
  "assigned_lots": [1, 3],
  "role": "admin"  // Role input will not be taken from UI but it'll be hardcoded in request from frontend as API requires this field 
}
```

### example response Status: 201 Created

```json
{
  "message": "Admin created successfully",
  "user_id": 42,
  "role": "admin"
  "assigned_lots": [1, 3]
}
```

### Failure Cases - 1. Missing Fields Status: 400 Bad Request

```json
{
  "error": "Name, email, password, and assigned_lots are required."
}
```

### 2. Invalid Assigned Lots Format Status: 400 Bad Request

```json
{
  "error": "assigned_lots must be a non-empty array of parking lot IDs."
}
```

### 3. Duplicate Email Status: 409 Conflict

```json
{
  "error": "An admin with this email already exists."
}
```

#### 4. Assigned Lot Does Not Exist Status: 400 Bad Request

```json
{
  "error": "One or more assigned parking lot IDs do not exist."
}
```

#### 5. Unauthorized (non-super-admin) Status: 403 Forbidden

```json
{
  "error": "You are not authorized to create admin accounts."
}
```

### sample reply for GET /all_admin/admin_lots/ JSON object containing a list of objects. Each object represents an admin and the parking lot IDs assigned to them.

```json
{
  "status": "success",
  "message": "Successfully retrieved all admin lot assignments.",
  "data": [
    {
      "user_id": 123,
      "admin_name": "John Doe",
      "assigned_lots": [
        456,
        457,
        458
      ]
    },
    {
      "user_id": 789,
      "admin_name": "Jane Smith",
      "assigned_lots": [
        459,
        460
      ]
    },
    {
      "user_id": 101,
      "admin_name": "Peter Jones",
      "assigned_lots": [
        461
      ]
    }
  ]
}

```

### GET /admin/all_session/details/ - fetch complete session table - covering parking_lots of all admin (see per parking_lot api

### in admin section)

```json
 [
  {
    "ticket_id": "TKT-987654",
    "parkinglot_id": 123,
    "vehicle_reg_no": "DL2S 223",
    "user_id": 123,
    "start_time": "2025-07-31T18:30:00Z",
    "end_time": "2025-07-31T20:30:00Z",
    "duration_hrs": 2.0,
    "vehicle_type": "car"
  },
  {
    "ticket_id": "TKT-543210",
    "parkinglot_id": 456,
    "vehicle_reg_no": "KA01 AB 1234",
    "user_id": 456,
    "start_time": "2025-07-31T17:00:00Z",
    "end_time": "2025-07-31T18:00:00Z",
    "duration_hrs": 1.0,
    "vehicle_type": "motorcycle"
  },
  {
    "ticket_id": "TKT-112233",
    "parkinglot_id": 123,
    "vehicle_reg_no": "MH12 CD 5678",
    "user_id": 789,
    "start_time": "2025-07-31T19:00:00Z",
    "end_time": null,
    "duration_hrs": null,
    "vehicle_type": "car"
  },
  {
    "ticket_id": "TKT-654321",
    "parkinglot_id": 789,
    "vehicle_reg_no": "DL5S 7788",
    "user_id": 123,
    "start_time": "2025-07-30T10:00:00Z",
    "end_time": "2025-07-30T11:00:00Z",
    "duration_hrs": 1.0,
    "vehicle_type": "car"
  },
  {
    "ticket_id": "TKT-009988",
    "parkinglot_id": 456,
    "vehicle_reg_no": "HR26 XX 9090",
    "user_id": 101,
    "start_time": "2025-07-30T14:15:00Z",
    "end_time": "2025-07-30T15:30:00Z",
    "duration_hrs": 1.25,
    "vehicle_type": "motorcycle"
  }
]
```

### APIs admin role Admin Lot & Session Management

| Method | Path                             | Description                                    | Protected (Role) | usage                                                                                           |
| ------ | -------------------------------- | ---------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| GET    | /admin_lots/<user_id>            | Get all lot IDs assigned to an admin           | Yes (admin)      |
| POST   | /admin/session/checkin           | Admin check-in for a vehicle                   | Yes (admin)      |
| POST   | /admin/session/checkout          | Admin check-out for a vehicle                  | Yes (admin)      | live "session screen","x" button to checkout                                                      |
| POST   | /admin/closure                   | Submit daily closure/payment                   | Yes (admin)      | on "daily closure screen" when "finalize closure" button is pressed                                      |
| GET    | /admin/closure                   | Get closure ledger entries                     | Yes (admin)      | to populate "daily closure screen"                                                                 |
| GET    | /admin/session/details/<user_id> | Get all parking session details for this admin | Yes (admin)      | to populate "dashboard screen" after successful login as admin with user as <userid> or to populate "live sessions screen" or "payment collection" for given admin with id as <user_id>. |

#### example GET /admin/dessions/all_session_details/<user_id>

````json
{
    "user_id":123,   //user_id 123 is of user with role "admin"
    "time in months":3
}
### Response
```json
[
  {
    "ticket_id": "TKT-987654",
    "parkinglot_id": 123,
    "vehicle_reg_no": "DL2S 223",
    "user_id": 133,
    "start_time": "2025-07-31T18:30:00Z",
    "end_time": "2025-07-31T20:30:00Z",
    "duration_hrs": 2.0,
    "vehicle_type": "car"
  },
  {
    "ticket_id": "TKT-543210",
    "parkinglot_id": 456,
    "vehicle_reg_no": "KA01 AB 1234",
    "user_id": 456,
    "start_time": "2025-07-31T17:00:00Z",
    "end_time": "2025-07-31T18:00:00Z",
    "duration_hrs": 1.0,
    "vehicle_type": "motorcycle"
  },
  {
    "ticket_id": "TKT-112233",
    "parkinglot_id": 123,
    "vehicle_reg_no": "MH12 CD 5678",
    "user_id": 789,
    "start_time": "2025-07-31T19:00:00Z",
    "end_time": null,
    "duration_hrs": null,
    "vehicle_type": "car"
  }
]
Reply should include all fields from sessions table
#### Example JSON for /admin/session/checkin
```json
{
  "vehicle_reg_no": "DL01AB1234",
  "slot_id": 12,
  "lot_id": 3,
  "vehicle_type": "Car"
}
````

#### Example JSON for /admin/session/checkout

```json
{
  "vehicle_reg_no": "DL01AB1234"
}
```

#### RESTful flow suggestion for your admin daily closure operation

1. GET /admin/total_due
   Purpose: To retrieve outstanding and today's collection at the start of the closure process.

Response Format:

````json
{
  "date": "2025-07-04",
  "outstanding_amount": 5450.75,
  "today_collection": 3210.50
}
Usage: Populates the UI like your screenshot shows.

2. POST /admin/finalize_closure
Purpose: Admin submits the amount he/she is settling with.
```json
{
  "payment_made": 7980
}
Response:
```json
{
  "new_outstanding": 681.25
}

#### Example JSON for /admin/closure (POST)
```json
{
  "date": "2025-07-04",
  "payment_made": 500.0
}
````

#### Example JSON for /admin/closure (Response)

```json
{
  "opening_balance": 1000.0,
  "today_collection": 800.0,
  "payment_made": 500.0,
  "closing_balance": 1300.0
}
```

---

**Note:**

- `Protected: Yes (user/admin)` means the endpoint requires a valid JWT access token for a user with role `user` or `admin`.
- `Protected: Yes (admin)` means the endpoint requires a valid JWT access token for a user with role `admin`.
- `Protected: Yes (super_admin)` means the endpoint requires a valid JWT access token for a user with role `super_admin`.
- `Protected: API Key` means the endpoint requires a valid API key in the `X-API-KEY` header.
- `Protected: No` means the endpoint is public and does not require authentication.
- Most endpoints (except `/auth` and `/api/v1/slots/update_status`) require JWT authentication in the `Authorization` header.
- Admin endpoints enforce strict role-based access control (RBAC) as per the backend implementation.
