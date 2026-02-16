## Business Rules Summary (Important)
- Revenue = freightAmount of COMPLETED trips only
- Cash received = sum of settlement.receivedAmount
- Outstanding = revenue - cash received
- Billing status per trip:
  - UNPAID: paidAmount = 0
  - PARTIALLY_PAID: 0 < paidAmount < freightAmount
  - PAID: paidAmount >= freightAmount
- Trips cannot be created without a truck
- Completed trips are immutable except notes


# TruckBook API Reference

Base URL: `http://localhost:8080`

Auth:
- JWT required for all `/api/**` routes **except** `/api/auth/**` and `/api/dev/**` (dev profile only).
- JWT is issued by OTP verify (`/api/auth/otp/verify`).
- Send JWT as: `Authorization: Bearer <token>`

Date format:
- All request/response dates are **`dd-MM-yyyy`** unless otherwise noted.

## Common Headers
- `Content-Type: application/json`
- `Accept: application/json`
- `Authorization: Bearer <token>` (required for protected endpoints)
- `X-Admin-Key: <secret>` (required for `/api/admin/**`)

## Common Error Format
All errors are returned as JSON (no `status` field in body):
```json
{
  "error": "Validation failed",
  "fields": {
    "field": "message"
  },
  "path": "/api/...",
  "timestamp": "2026-02-01T12:34:56+05:30"
}
```
- `fields` is only present for validation errors.

Common error examples:
- 400 (Bad Request):
```json
{
  "error": "Invalid request body",
  "fields": null,
  "path": "/api/settlements",
  "timestamp": "2026-02-01T12:34:56+05:30"
}
```
- 401 (Unauthorized):
```json
{
  "error": "Unauthorized",
  "fields": null,
  "path": "/api/trucks",
  "timestamp": "2026-02-01T12:34:56+05:30"
}
```
- 404 (Not Found):
```json
{
  "error": "Truck not found",
  "fields": null,
  "path": "/api/trucks/00000000-0000-0000-0000-000000000000",
  "timestamp": "2026-02-01T12:34:56+05:30"
}
```
- 409 (Conflict):
```json
{
  "error": "Party already exists",
  "fields": null,
  "path": "/api/parties",
  "timestamp": "2026-02-01T12:34:56+05:30"
}
```
- 429 (Too Many Requests):
```json
{
  "error": "OTP recently sent. Please wait 30 seconds",
  "fields": null,
  "path": "/api/auth/otp/request",
  "timestamp": "2026-02-01T12:34:56+05:30"
}
```
- 429 (OTP throttled):
```json
{
  "error": "OTP_RATE_LIMIT",
  "fields": null,
  "path": "/api/auth/otp/request",
  "timestamp": "2026-02-01T12:34:56+05:30"
}
```
- 429 (OTP hourly limit):
```json
{
  "error": "OTP_HOURLY_LIMIT",
  "fields": null,
  "path": "/api/auth/otp/request",
  "timestamp": "2026-02-01T12:34:56+05:30"
}
```
- 403 (Subscription Expired):
```json
{
  "error": "SUBSCRIPTION_EXPIRED",
  "message": "Your subscription has expired. Please upgrade to continue."
}
```

---

# 1) Auth (OTP)

## POST /api/auth/otp/request
- Auth: Public
- Query params: none
- Path params: none
- Request body (JSON):
  - `phoneE164` (string, required, E.164 format)
- Sample request:
```json
{
  "phoneE164": "+919999999999"
}
```
- Success response (200):
```json
{
  "status": "sent"
}
```
- Notes:
  - OTP is 6 digits, expires in 5 minutes.
  - Static OTP (temporary): **`123456`** for all environments.
  - Cooldown: 30 seconds between requests per phone.
  - Hourly limit: max 5 OTP requests per phone in the last 1 hour.
- Errors:
  - 400 validation (invalid phone)
  - 429 too many requests (cooldown)

Curl:
```bash
curl -X POST http://localhost:8080/api/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phoneE164":"+919999999999"}'
```

## POST /api/auth/otp/verify
- Auth: Public
- Query params: none
- Path params: none
- Request body (JSON):
  - `phoneE164` (string, required)
  - `otp` (string, required, 6 digits)
- Sample request:
```json
{
  "phoneE164": "+919999999999",
  "otp": "123456"
}
```
- Success response (200):
```json
{
  "token": "<JWT>",
  "userId": "ce783583-207b-4163-8caa-40e3e250ba4a",
  "orgId": "c865036a-f8c8-4296-99fd-8cc9984c4a45",
  "phoneE164": "+919999999999"
}
```
- Notes:
  - If phone is new, org + user are created automatically.
  - On first org creation, a TRIAL subscription is auto-created (plan: GROWTH, trial 14 days).
- Errors:
  - 400: OTP not requested / OTP expired / Invalid OTP / OTP already used
  - 400: `OTP_EXPIRED` / `OTP_ALREADY_USED` / `OTP_INVALID`
  - 429: `OTP_TOO_MANY_ATTEMPTS` (>=5 wrong attempts until expiry)

Curl:
```bash
curl -X POST http://localhost:8080/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneE164":"+919999999999","otp":"123456"}'
```

---

# 2) Organizations / Me
All endpoints require JWT.

## GET /api/me
- Auth: JWT required
- Query params: none
- Path params: none
- Response: `MeResponse`

Sample response:
```json
{
  "userId": "ce783583-207b-4163-8caa-40e3e250ba4a",
  "orgId": "c865036a-f8c8-4296-99fd-8cc9984c4a45",
  "phoneE164": "+919999999999",
  "displayName": null,
  "onboardingCompleted": false,
  "orgName": null
}
```

Curl:
```bash
curl -X GET http://localhost:8080/api/me \
  -H "Authorization: Bearer <JWT>"
```

## POST /api/onboarding/complete
- Auth: JWT required
- Query params: none
- Path params: none
- Request body:
  - `businessName` (string, required, 2..120)
  - `ownerDisplayName` (string, optional, 0..120)
  - `city` (string, optional, 0..100)
- Idempotent:
  - If onboarding is already completed, the org fields are still updated and current org is returned.

Sample request:
```json
{
  "businessName": "Aman Roadlines",
  "ownerDisplayName": "Aman",
  "city": "Pune"
}
```

Sample response:
```json
{
  "orgId": "c865036a-f8c8-4296-99fd-8cc9984c4a45",
  "orgName": "Aman Roadlines",
  "onboardingCompleted": true,
  "ownerDisplayName": "Aman",
  "city": "Pune"
}
```

Curl:
```bash
curl -X POST http://localhost:8080/api/onboarding/complete \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Aman Roadlines","ownerDisplayName":"Aman","city":"Pune"}'
```

---

# 3) Trucks
All endpoints require JWT.

## POST /api/trucks
- Auth: JWT required
- Request body:
  - `truckNumber` (string, required)
  - `status` (string, required, allowed: `ACTIVE`, `INACTIVE`)
  - `notes` (string, optional)
  - `truckType` (string, optional, allowed: `OPEN`, `CONTAINER`, `TRAILER`, `TIPPER`, `TANKER`, `OTHER`)
  - `compliance` (object, optional)
    - `insurance.status` (string, optional, allowed: `VALID`, `EXPIRED`, `MISSING`)
    - `insurance.expiryDate` (date, optional, `dd-MM-yyyy`)
    - `permit.status` (string, optional, allowed: `VALID`, `EXPIRED`, `MISSING`)
    - `permit.expiryDate` (date, optional, `dd-MM-yyyy`)
    - `fitness.status` (string, optional, allowed: `VALID`, `EXPIRED`, `MISSING`)
    - `fitness.expiryDate` (date, optional, `dd-MM-yyyy`)
- Sample request:
```json
{
  "truckNumber": "MH 01 AB 1880",
  "status": "ACTIVE",
  "notes": "Primary fleet",
  "truckType": "CONTAINER",
  "compliance": {
    "insurance": { "status": "VALID", "expiryDate": "31-12-2026" },
    "permit": { "status": "MISSING" },
    "fitness": { "status": "VALID", "expiryDate": "30-11-2026" }
  }
}
```
- Success response (200):
```json
{
  "id": "f9726dea-e0bc-4298-b2a8-d6f0f7aa7dfe",
  "orgId": "c865036a-f8c8-4296-99fd-8cc9984c4a45",
  "truckNumber": "MH 01 AB 1880",
  "truckType": "CONTAINER",
  "status": "ACTIVE",
  "notes": "Primary fleet",
  "compliance": {
    "insurance": { "status": "VALID", "expiryDate": "31-12-2026" },
    "permit": { "status": "MISSING", "expiryDate": null },
    "fitness": { "status": "VALID", "expiryDate": "30-11-2026" }
  },
  "createdAt": "2026-01-31T09:27:28.026566Z",
  "updatedAt": "2026-01-31T09:27:28.026566Z"
}
```
- Notes:
  - Truck number must be unique per org.
  - Enum values are normalized to uppercase.
- Errors:
  - 400 status not in ACTIVE/INACTIVE
  - 400 truckType invalid
  - 400 compliance status invalid
  - 409 duplicate truck number

Curl:
```bash
curl -X POST http://localhost:8080/api/trucks \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"truckNumber":"MH 01 AB 1880","status":"ACTIVE","truckType":"CONTAINER"}'
```

## GET /api/trucks
- Auth: JWT required
- Response (200): array of `TruckResponse`
- Sample response:
```json
[
  {
    "id": "f9726dea-e0bc-4298-b2a8-d6f0f7aa7dfe",
    "orgId": "c865036a-f8c8-4296-99fd-8cc9984c4a45",
    "truckNumber": "MH 01 AB 1880",
    "truckType": "CONTAINER",
    "status": "ACTIVE",
    "notes": null,
    "compliance": {
      "insurance": { "status": "VALID", "expiryDate": "31-12-2026" },
      "permit": { "status": "MISSING", "expiryDate": null },
      "fitness": { "status": "VALID", "expiryDate": "30-11-2026" }
    },
    "createdAt": "2026-01-31T09:27:28.026566Z",
    "updatedAt": "2026-01-31T09:27:28.026566Z"
  }
]
```

## GET /api/trucks/{id}
- Auth: JWT required
- Path params:
  - `id` (UUID)
- Success: `TruckResponse`

## PUT /api/trucks/{id}
- Auth: JWT required
- Path params: `id` (UUID)
- Request body (all optional):
  - `truckNumber`
  - `status` (ACTIVE/INACTIVE)
  - `notes`
  - `truckType` (OPEN|CONTAINER|TRAILER|TIPPER|TANKER|OTHER)
  - `compliance` (object, optional)
- Sample request:
```json
{
  "status": "INACTIVE",
  "notes": "Temporarily off-road",
  "compliance": {
    "insurance": { "status": "EXPIRED", "expiryDate": "31-12-2025" }
  }
}
```
- Success: `TruckResponse`

## DELETE /api/trucks/{id}
- Auth: JWT required
- Path params: `id` (UUID)
- Success response:
```json
{ "message": "Truck deleted successfully" }
```
- Errors:
  - 409 if any trips exist for the truck: `"Cannot delete truck with active trips"`

Curl:
```bash
curl -X DELETE http://localhost:8080/api/trucks/<TRUCK_ID> \
  -H "Authorization: Bearer <JWT>"
```

---

# 4) Trips
All endpoints require JWT.

## POST /api/trips
- Auth: JWT required
- Request body:
  - `truckId` (UUID, required)
  - `partyId` (UUID, optional)
  - `tripCode` (string, required)
  - `driverName` (string, optional)
  - `fromLocation` (string, required)
  - `toLocation` (string, required)
  - `startDate` (date, required, `dd-MM-yyyy`)
  - `freightAmount` (number, required, >= 0)
  - `notes` (string, optional)
- Sample request:
```json
{
  "truckId": "c9e1c29b-a44f-4fe3-a956-cf0eaf465a42",
  "partyId": "df674b58-5c10-4c80-995f-a699220527c6",
  "tripCode": "TRP-001",
  "driverName": "Rakesh",
  "fromLocation": "Mumbai",
  "toLocation": "Gujrat",
  "startDate": "31-01-2026",
  "freightAmount": 30000,
  "notes": "test"
}
```
- Success response: `TripResponse` (see below)
- Notes:
  - `truckId` required. If missing: `"Truck is required to create a trip"`.
  - Truck must exist in org and be ACTIVE.
  - `partyId` must belong to org if provided.
  - `tripCode` must be unique per org.

## GET /api/trips
- Auth: JWT required
- Query params (all optional):
  - `status` (ACTIVE/COMPLETED)
  - `truckId` (UUID)
  - `partyId` (UUID)
  - `dateFrom` (dd-MM-yyyy)
  - `dateTo` (dd-MM-yyyy)
- Success response: array of `TripResponse`

## GET /api/trips/{id}
- Auth: JWT required
- Path params: `id` (UUID)
- Success response: `TripResponse`

## PUT /api/trips/{id}
- Auth: JWT required
- Path params: `id` (UUID)
- Request body (optional fields):
  - `partyId`
  - `driverName`
  - `fromLocation`
  - `toLocation`
  - `startDate`
  - `freightAmount`
  - `notes`
- Notes:
  - Completed trips can **only** update `notes`.
  - `truckId` is not editable here.

## PATCH /api/trips/{id}/complete
- Auth: JWT required
- Path params: `id` (UUID)
- Marks trip as COMPLETED (idempotent).

## DELETE /api/trips/{id}
- Auth: JWT required
- Path params: `id` (UUID)
- Success response:
```json
{ "message": "Trip deleted successfully" }
```
- Notes:
  - Allowed only if trip is NOT completed.
  - Allowed only if trip has NO settlements.
- Errors:
  - 409 if completed: `"Completed trips cannot be deleted"`
  - 409 if settlements exist: `"Trip has settlements and cannot be deleted"`

### TripResponse schema
```json
{
  "id": "b3f2a12f-0ef4-4c1b-8c7c-74b4d3d2b7e3",
  "orgId": "c865036a-f8c8-4296-99fd-8cc9984c4a45",
  "truckId": "c9e1c29b-a44f-4fe3-a956-cf0eaf465a42",
  "partyId": "df674b58-5c10-4c80-995f-a699220527c6",
  "tripCode": "TRP-001",
  "status": "ACTIVE",
  "driverName": "Rakesh",
  "fromLocation": "Mumbai",
  "toLocation": "Gujrat",
  "startDate": "31-01-2026",
  "freightAmount": 30000,
  "paidAmount": 0,
  "outstandingAmount": 30000,
  "billingStatus": "UNPAID",
  "fuelTotal": 0,
  "tollTotal": 0,
  "driverExpenseTotal": 0,
  "totalExpense": 0,
  "notes": "test",
  "createdAt": "2026-01-31T09:27:28.026566Z",
  "updatedAt": "2026-01-31T09:27:28.026566Z"
}
```

Curl (create):
```bash
curl -X POST http://localhost:8080/api/trips \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"truckId":"c9e1c29b-a44f-4fe3-a956-cf0eaf465a42","tripCode":"TRP-001","fromLocation":"Mumbai","toLocation":"Gujrat","startDate":"31-01-2026","freightAmount":30000}'
```

---

# 5) Trip Logs (Fuel / Toll / Driver Expenses)
All endpoints require JWT. All are scoped to a trip.

## Fuel Logs
### POST /api/trips/{tripId}/fuel
- Request body:
  - `filledOn` (dd-MM-yyyy, required)
  - `liters` (number, required, > 0)
  - `ratePerLiter` (number, required, >= 0)
  - `fuelStation` (string, optional)
  - `odometerKm` (integer, optional)
  - `notes` (string, optional)
- Success response: `FuelLogResponse`
- Notes:
  - Amount = liters * ratePerLiter (rounded to 2 decimals).

Sample request:
```json
{
  "filledOn": "31-01-2026",
  "liters": 120.5,
  "ratePerLiter": 95.25,
  "fuelStation": "HP Petrol Pump",
  "odometerKm": 45210,
  "notes": "Full tank"
}
```

### GET /api/trips/{tripId}/fuel
- Response: array of `FuelLogResponse`

### PUT /api/trips/{tripId}/fuel/{fuelId}
- Request body: optional fields from create
- Notes:
  - If updating `liters`, you must also provide `ratePerLiter`.
  - If updating `ratePerLiter`, `liters` must already exist.

### DELETE /api/trips/{tripId}/fuel/{fuelId}
- Success:
```json
{ "message": "Fuel log deleted successfully" }
```

FuelLogResponse sample:
```json
{
  "id": "f0d41d74-6c9e-4d5e-9d61-9e2b6c4a3b1c",
  "tripId": "b3f2a12f-0ef4-4c1b-8c7c-74b4d3d2b7e3",
  "filledOn": "31-01-2026",
  "liters": 120.5,
  "ratePerLiter": 95.25,
  "amount": 11485.13,
  "fuelStation": "HP Petrol Pump",
  "odometerKm": 45210,
  "notes": "Full tank",
  "createdAt": "2026-02-01T10:00:00.000Z"
}
```

## Toll Logs
### POST /api/trips/{tripId}/tolls
- Request body:
  - `paidOn` (dd-MM-yyyy, required)
  - `amount` (number, required, > 0)
  - `plazaName` (string, optional)
  - `notes` (string, optional)

### GET /api/trips/{tripId}/tolls
- Response: array of `TollResponse`

### PUT /api/trips/{tripId}/tolls/{tollId}
- Request body: optional fields from create

### DELETE /api/trips/{tripId}/tolls/{tollId}
- Success:
```json
{ "message": "Toll log deleted successfully" }
```

TollResponse sample:
```json
{
  "id": "ae8b9f51-8c5f-4a58-9e9a-72f49a3b5d9f",
  "tripId": "b3f2a12f-0ef4-4c1b-8c7c-74b4d3d2b7e3",
  "paidOn": "31-01-2026",
  "amount": 450,
  "plazaName": "Mumbai Toll Plaza",
  "notes": "FASTag",
  "createdAt": "2026-02-01T10:00:00.000Z"
}
```

## Driver Expenses
### POST /api/trips/{tripId}/driver-expenses
- Request body:
  - `spentOn` (dd-MM-yyyy, required)
  - `category` (required, enum: FOOD, STAY, REPAIR_HELP, PHONE, OTHER)
  - `amount` (number, required, > 0)
  - `notes` (string, optional)

### GET /api/trips/{tripId}/driver-expenses
- Response: array of `DriverExpenseResponse`

### PUT /api/trips/{tripId}/driver-expenses/{expenseId}
- Request body: optional fields from create

### DELETE /api/trips/{tripId}/driver-expenses/{expenseId}
- Success:
```json
{ "message": "Driver expense deleted successfully" }
```

DriverExpenseResponse sample:
```json
{
  "id": "b22d82b0-6a0f-45f8-9b63-4a8a7615e5f1",
  "tripId": "b3f2a12f-0ef4-4c1b-8c7c-74b4d3d2b7e3",
  "spentOn": "31-01-2026",
  "category": "FOOD",
  "amount": 250,
  "notes": "Lunch",
  "createdAt": "2026-02-01T10:00:00.000Z"
}
```

---

# 6) Parties
All endpoints require JWT.

## POST /api/parties
- Request body:
  - `name` (string, required, 2..80)
  - `phone` (string, optional)
- Sample request:
```json
{
  "name": "Ultratech",
  "phone": "+919876543210"
}
```
- Success: `PartyResponse`
- Notes:
  - Name is trimmed.
  - Name must be unique per org (case-insensitive).

## GET /api/parties
- Query params:
  - `q` (optional, case-insensitive contains search)
- Success: array of `PartyResponse`

## GET /api/parties/{id}
- Path params: `id` (UUID)

## GET /api/parties/{id}/credit
- Auth: JWT required
- Path params: `id` (UUID)
- Response:
```json
{
  "partyId": "df674b58-5c10-4c80-995f-a699220527c6",
  "creditAmount": 12000
}
```
Notes:
- Credit is stored at party level, increases when settlements are created, and is reduced when allocations consume credit.

## PUT /api/parties/{id}
- Request body:
  - `name` (required, 2..80)
  - `phone` (optional)

## DELETE /api/parties/{id}
- Success:
```json
{ "message": "Party deleted successfully" }
```
- Errors:
  - 409 if party is used in trips: `"Party is used in trips and cannot be deleted"`

PartyResponse sample:
```json
{
  "id": "df674b58-5c10-4c80-995f-a699220527c6",
  "orgId": "c865036a-f8c8-4296-99fd-8cc9984c4a45",
  "name": "Ultratech",
  "phone": "+919876543210",
  "createdAt": "2026-01-31T09:00:00.000Z",
  "updatedAt": "2026-01-31T09:00:00.000Z"
}
```

---

# 7) Settlements + Allocations + Outstanding
All endpoints require JWT.

## POST /api/settlements
- Request body:
  - `partyId` (UUID, required)
  - `truckId` (UUID, optional)
  - `settlementDate` (dd-MM-yyyy, required)
  - `receivedAmount` (number, required, > 0)
  - `paymentMode` (string, required: CASH | UPI | BANK | OTHER)
  - `reference` (string, optional)
  - `notes` (string, optional)

Sample request:
```json
{
  "partyId": "8699b355-4d6d-49f3-a08e-9099ae0d90e0",
  "settlementDate": "31-01-2026",
  "receivedAmount": 50000,
  "paymentMode": "CASH",
  "reference": "REF-123",
  "notes": "Initial settlement"
}
```

Success response (SettlementResponse):
```json
{
  "id": "8f8f6c36-3c4b-4c4c-9c30-0d4372cb74f0",
  "orgId": "c865036a-f8c8-4296-99fd-8cc9984c4a45",
  "settlementCode": "SET-1706760000000",
  "partyId": "8699b355-4d6d-49f3-a08e-9099ae0d90e0",
  "truckId": null,
  "settlementDate": "31-01-2026",
  "receivedAmount": 50000,
  "paymentMode": "CASH",
  "reference": "REF-123",
  "notes": "Initial settlement",
  "allocatedAmount": 0,
  "unallocatedAmount": 50000,
  "partyCreditAfter": 50000,
  "createdAt": "2026-02-01T10:00:00.000Z"
}
```

## GET /api/settlements
- Response: array of `SettlementResponse`

## GET /api/settlements/{id}
- Response (SettlementDetailResponse):
```json
{
  "settlement": { /* SettlementResponse */ },
  "allocations": [
    {
      "id": "4c2c2f0b-5b88-4aa9-9e01-38a5d4d2db0a",
      "settlementId": "8f8f6c36-3c4b-4c4c-9c30-0d4372cb74f0",
      "tripId": "b3f2a12f-0ef4-4c1b-8c7c-74b4d3d2b7e3",
      "amountApplied": 15000,
      "pendingAmount": 15000,
      "createdAt": "2026-02-01T10:10:00.000Z"
    }
  ]
}
```

## POST /api/settlements/{id}/allocations
- Request body:
  - `allocations` (array, required, min 1)
    - `tripId` (UUID)
    - `amountApplied` (number, > 0)

Sample request:
```json
{
  "allocations": [
    { "tripId": "b3f2a12f-0ef4-4c1b-8c7c-74b4d3d2b7e3", "amountApplied": 15000 }
  ]
}
```

Notes / rules:
- Trip must belong to org, and have a party.
- Trip party must match settlement party.
- If settlement has truckId, trip truck must match.
- Cannot allocate more than trip remaining amount.
- Cannot allocate more than party credit + current settlement unallocated.
- Allocations consume party credit first, then the current settlement’s unallocated amount.
- Only the current settlement’s `unallocatedAmount` is reduced; older settlements are not modified.
- Same trip cannot be allocated twice in the same settlement.
- Each allocation item includes `pendingAmount` (trip remaining after this allocation, based on total paid across all settlements).

## Outstanding Summary
### GET /api/settlements/outstanding?mode=party
- Response: `OutstandingPartyRow[]`

### GET /api/settlements/outstanding?mode=truck
- Response: `OutstandingTruckRow[]`

## Outstanding Drilldown
### GET /api/settlements/outstanding/party/{partyId}
- Response: `OutstandingTripRow[]` (trips for party)

### GET /api/settlements/outstanding/party/{partyId}/trucks
- Response: `OutstandingPartyTruckRow[]` (trucks under party)

### GET /api/settlements/outstanding/truck/{truckId}
- Response: `OutstandingTripRow[]` (trips for truck)

OutstandingTripRow sample:
```json
{
  "tripId": "b3f2a12f-0ef4-4c1b-8c7c-74b4d3d2b7e3",
  "tripCode": "TRP-001",
  "fromLocation": "Mumbai",
  "toLocation": "Gujrat",
  "startDate": "31-01-2026",
  "freightAmount": 30000,
  "paidAmount": 15000,
  "outstandingAmount": 15000,
  "billingStatus": "PARTIALLY_PAID"
}
```

---

# 8) Truck Costs (Repairs / Tyres)
All endpoints require JWT.

## Repairs
### POST /api/trucks/{truckId}/repairs
- Request body:
  - `repairedOn` (dd-MM-yyyy, required)
  - `amount` (number, required, > 0)
  - `vendorName` (string, optional)
  - `description` (string, optional)
  - `odometerKm` (integer, optional, >= 0)
  - `notes` (string, optional)

### GET /api/trucks/{truckId}/repairs
- Query params: `from`, `to` (dd-MM-yyyy, optional)

### PUT /api/trucks/{truckId}/repairs/{repairId}
- Request body: optional fields from create

### DELETE /api/trucks/{truckId}/repairs/{repairId}
- Success:
```json
{ "message": "Repair deleted successfully" }
```

RepairResponse sample:
```json
{
  "id": "7e5bb8f0-6aa8-48e5-b1a4-0c6d45e55c0c",
  "truckId": "c9e1c29b-a44f-4fe3-a956-cf0eaf465a42",
  "repairedOn": "31-01-2026",
  "amount": 2500,
  "vendorName": "RK Motors",
  "description": "Brake pad change",
  "odometerKm": 45210,
  "notes": "Replaced front pads",
  "createdAt": "2026-02-01T10:00:00.000Z"
}
```

## Tyres
### POST /api/trucks/{truckId}/tyres
- Request body:
  - `purchasedOn` (dd-MM-yyyy, required)
  - `amount` (number, required, > 0)
  - `brand` (string, optional)
  - `tyreCount` (integer, optional, >= 1)
  - `notes` (string, optional)

### GET /api/trucks/{truckId}/tyres
- Query params: `from`, `to` (dd-MM-yyyy, optional)

### PUT /api/trucks/{truckId}/tyres/{tyreId}
- Request body: optional fields from create

### DELETE /api/trucks/{truckId}/tyres/{tyreId}
- Success:
```json
{ "message": "Tyre expense deleted successfully" }
```

TyreResponse sample:
```json
{
  "id": "b58a9fb0-6a3c-4ef2-8f65-7ef4ad2b9c5f",
  "truckId": "c9e1c29b-a44f-4fe3-a956-cf0eaf465a42",
  "purchasedOn": "31-01-2026",
  "amount": 18000,
  "brand": "MRF",
  "tyreCount": 2,
  "notes": "Rear tyres",
  "createdAt": "2026-02-01T10:00:00.000Z"
}
```

## Summary
### GET /api/trucks/{truckId}/costs/summary?from=dd-MM-yyyy&to=dd-MM-yyyy
- Response:
```json
{
  "truckId": "c9e1c29b-a44f-4fe3-a956-cf0eaf465a42",
  "from": "01-01-2026",
  "to": "31-01-2026",
  "repairsTotal": 2500,
  "tyresTotal": 18000,
  "total": 20500
}
```
- Notes: `from` and `to` are required; `from` must be <= `to`.

---

# 9) Reports
All endpoints require JWT.

Query params (common):
- `from` (dd-MM-yyyy, required)
- `to` (dd-MM-yyyy, required)
- `groupBy` (optional: day | week | month; default: month)
- `truckId` (optional UUID)
- `partyId` (optional UUID)

## GET /api/reports/overview
- Response: `OverviewReportResponse`
  - `topTrucks[]` includes `tripCount` (number of trips in range for that truck).

Sample response (shape):
```json
{
  "range": { "from": "01-01-2026", "to": "31-01-2026", "groupBy": "month" },
  "summary": {
    "revenueEarned": 0.00,
    "expensesTotal": 16457.75,
    "profit": -16457.75,
    "cashReceived": 61000.00,
    "outstanding": -61000.00,
    "tripCount": 9
  },
  "series": [
    {
      "label": "Jan 2026",
      "dateFrom": "01-01-2026",
      "dateTo": "31-01-2026",
      "revenueEarned": 0.00,
      "expensesTotal": 16457.75,
      "profit": -16457.75,
      "cashReceived": 61000.00,
      "outstanding": -61000.00
    }
  ],
  "topParties": [],
  "topTrucks": [
    {
      "truckId": "8de043ac-5817-4b2b-92ff-0effab89862b",
      "truckNumber": "MH 01 AB 1922",
      "revenueEarned": 40000.00,
      "profit": 40000.00,
      "tripCount": 2
    }
  ]
}
```

## GET /api/reports/profit
- Response: `ProfitReportResponse`
- Includes `expenseBreakdown` with `fuel`, `tolls`, `driver`, `repairs`, `tyres`.
- Includes `tripBreakdown[]` (per-trip profit breakdown) and `truckSummary[]` (per-truck profit summary).
- `summary.tripCount` is the count of completed trips in the range (used for avg cost/trip).

## GET /api/reports/operating-vs-revenue
- Response: `OperatingVsRevenueReportResponse`
- Includes `highestCostTrips[]` (top 5 by trip cost) and `highestOverheadTrucks[]` (top 5 by repairs+tyres).
- `summary.tripCount` is the count of completed trips in the range.

Notes:
- Profit = revenueEarned - expensesTotal
- Outstanding = revenueEarned - cashReceived
- If revenue is 0, margin/ratio percent is 0.

---

# 10) Subscription + Admin
All endpoints require JWT unless stated otherwise.

## GET /api/subscription/current
- Auth: JWT required
- Response: `SubscriptionResponse`

Sample response:
```json
{
  "orgId": "c865036a-f8c8-4296-99fd-8cc9984c4a45",
  "planCode": "GROWTH",
  "status": "TRIAL",
  "trialEndsAt": "2026-02-15T10:00:00.000Z",
  "currentPeriodStart": null,
  "currentPeriodEnd": null
}
```

Notes:
- This endpoint is allowed even if the subscription is expired (so the UI can show the status).

## POST /api/admin/subscription/activate
- Auth: Admin key required (`X-Admin-Key`)
- Body:
  - `orgId` (UUID, required)
  - `planCode` (required: STARTER | GROWTH | PRO)
  - `months` (required: 1..24)
- Response: `SubscriptionResponse`

Sample request:
```json
{
  "orgId": "c865036a-f8c8-4296-99fd-8cc9984c4a45",
  "planCode": "GROWTH",
  "months": 1
}
```

Sample response:
```json
{
  "orgId": "c865036a-f8c8-4296-99fd-8cc9984c4a45",
  "planCode": "GROWTH",
  "status": "ACTIVE",
  "trialEndsAt": null,
  "currentPeriodStart": "2026-02-15T10:00:00.000Z",
  "currentPeriodEnd": "2026-03-15T10:00:00.000Z"
}
```

Errors:
- 401 if admin key is missing/invalid:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid admin key"
}
```

---

# 11) Dashboard
All endpoints require JWT.

## GET /api/dashboard
- Auth: JWT required
- Query params: none
- Path params: none
- Response: `DashboardResponse`

Sample response:
```json
{
  "counts": {
    "trucks": 4,
    "trips": 18
  },
  "pendingSettlement": {
    "amount": 45250.00
  },
  "recentTrips": [
    {
      "id": "f0d41d74-6c9e-4d5e-9d61-9e2b6c4a3b1c",
      "fromLocation": "Mumbai",
      "toLocation": "Gujrat",
      "status": "ACTIVE",
      "freightAmount": 30000.00,
      "startDate": "2026-02-01",
      "truck": {
        "id": "c9e1c29b-a44f-4fe3-a956-cf0eaf465a42",
        "truckNumber": "MH 01 AB 1880"
      }
    }
  ]
}
```

Notes:
- `pendingSettlement.amount` is the sum of outstanding (freight minus allocated) across all trips in the org.
- `recentTrips` is limited to the latest 3 by `startDate` desc then `createdAt` desc.
- `recentTrips.startDate` uses `yyyy-MM-dd` format.

Curl:
```bash
curl -X GET http://localhost:8080/api/dashboard \
  -H "Authorization: Bearer <JWT>"
```

---

# 12) Dev-only endpoints
(Only available when `spring.profiles.active=dev`)

## GET /api/dev/db-check
- Auth: Public in dev
- Response:
```json
{
  "schema": "truckbook",
  "organizations": 1,
  "users": 1,
  "trucks": 2,
  "trips": 4
}
```

---

# Curl Examples (quick copy-paste)

1) Request OTP
```bash
curl -X POST http://localhost:8080/api/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phoneE164":"+919999999999"}'
```

2) Verify OTP
```bash
curl -X POST http://localhost:8080/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneE164":"+919999999999","otp":"123456"}'
```

3) Create Truck
```bash
curl -X POST http://localhost:8080/api/trucks \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"truckNumber":"MH 01 AB 1880","status":"ACTIVE"}'
```

4) Create Trip
```bash
curl -X POST http://localhost:8080/api/trips \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"truckId":"c9e1c29b-a44f-4fe3-a956-cf0eaf465a42","tripCode":"TRP-001","fromLocation":"Mumbai","toLocation":"Gujrat","startDate":"31-01-2026","freightAmount":30000}'
```

5) Add Fuel Log
```bash
curl -X POST http://localhost:8080/api/trips/<TRIP_ID>/fuel \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"filledOn":"31-01-2026","liters":120.5,"ratePerLiter":95.25,"fuelStation":"HP Petrol Pump"}'
```

6) Create Settlement
```bash
curl -X POST http://localhost:8080/api/settlements \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"partyId":"8699b355-4d6d-49f3-a08e-9099ae0d90e0","settlementDate":"31-01-2026","receivedAmount":50000,"paymentMode":"CASH"}'
```

7) Reports Overview
```bash
curl -X GET "http://localhost:8080/api/reports/overview?from=01-01-2026&to=31-01-2026&groupBy=month" \
  -H "Authorization: Bearer <JWT>"
```

8) Current Subscription
```bash
curl -X GET http://localhost:8080/api/subscription/current \
  -H "Authorization: Bearer <JWT>"
```

9) Admin Activate Subscription
```bash
curl -X POST http://localhost:8080/api/admin/subscription/activate \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <ADMIN_KEY>" \
  -d '{"orgId":"c865036a-f8c8-4296-99fd-8cc9984c4a45","planCode":"GROWTH","months":1}'
```
