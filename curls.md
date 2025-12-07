Analyzing Production Server...
logging in User (9018647)...
User Token Acquired.
logging in Doctor (8018647)...
Doctor Token Acquired.

# A1Care API Production Guide

Base URL: `https://api-esf1.onrender.com/api`

> **Note**: Tokens expire. Generate new ones via Login if needed.

## 1. Authentication

### Login (User)
**Response**: Returns `token`, `role`, and `isRegistered`.
```bash
curl -X POST https://api-esf1.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "9018647",
    "role": "User"
  }'
```

### Login (Doctor)
```bash
curl -X POST https://api-esf1.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "8018647",
    "role": "Doctor"
  }'
```

## 2. User Flow

### Get Main Services (Home)
```bash
curl -X GET https://api-esf1.onrender.com/api/booking/services
```

### Get Sub-Services (Level 1)
Replace `:serviceId` with `692c5b97e45d3902a404bd2b`.
```bash
curl -X GET "https://api-esf1.onrender.com/api/booking/services/692c5b97e45d3902a404bd2b/items"
```

### Get Child-Services (Level 2)
Replace `:parentServiceItemId` with `REPLACE_WITH_SUB_SERVICE_ID`.
```bash
curl -X GET "https://api-esf1.onrender.com/api/booking/services/692c5b97e45d3902a404bd2b/items?parentServiceItemId=REPLACE_WITH_SUB_SERVICE_ID"
```

### View Available Doctors
```bash
curl -X GET https://api-esf1.onrender.com/api/booking/doctors/opd
```

### Get Doctor Slots
```bash
curl -X GET "https://api-esf1.onrender.com/api/booking/doctors/6934dd6b79c636c5210b95ef/slots?date=2025-12-08"
```

### Book Appointment (Doctor)
```bash
curl -X POST https://api-esf1.onrender.com/api/booking/create \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzRkZDY5NzljNjM2YzUyMTBiOTVlYiIsInJvbGUiOiJVc2VyIiwiaWF0IjoxNzY1MDcyMjM0LCJleHAiOjE3OTY2MDgyMzR9.13bJZ5bv10GbZIUchtfEy0u1dVw8YxCgHL9oR2_Sbk0" \
  -H "Content-Type: application/json" \
  -d '{
    "itemType": "User",
    "itemId": "6934dd6b79c636c5210b95ef",
    "booking_date": "2025-12-08",
    "slotStartTime": "2025-12-08T10:00:00.000Z",
    "slotEndTime": "2025-12-08T10:30:00.000Z",
    "payment_method": "COD"
  }'
```

## 3. Doctor Flow

### Doctor Dashboard (Appointments)
**Returns**: Appointments grouped by status (new, upcoming, completed, cancelled).
```bash
curl -X GET https://api-esf1.onrender.com/api/doctor/appointments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzRkZDZiNzljNjM2YzUyMTBiOTVlZiIsInJvbGUiOiJEb2N0b3IiLCJpYXQiOjE3NjUwNzIyMzUsImV4cCI6MTc5NjYwODIzNX0.AHTSG1I23o9pEvxzeUm77Lb-H_2zMfeQDGgD60_NTBs"
```

### Manage Slots
```bash
curl -X POST https://api-esf1.onrender.com/api/doctor/slots \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzRkZDZiNzljNjM2YzUyMTBiOTVlZiIsInJvbGUiOiJEb2N0b3IiLCJpYXQiOjE3NjUwNzIyMzUsImV4cCI6MTc5NjYwODIzNX0.AHTSG1I23o9pEvxzeUm77Lb-H_2zMfeQDGgD60_NTBs" \
  -H "Content-Type: application/json" \
  -d '{
    "working_hours": [
        { "day": "Monday", "start": "09:00", "end": "17:00", "enabled": true },
        { "day": "Tuesday", "start": "09:00", "end": "17:00", "enabled": true }
    ]
  }'
```

