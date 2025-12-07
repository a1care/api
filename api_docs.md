
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
    "mobile_number": "9068891",
    "role": "User"
  }'
```

### Login (Doctor)
```bash
curl -X POST https://api-esf1.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "8068891",
    "role": "Doctor"
  }'
```

## 2. User Flow

### Get Main Services (Home)
```bash
curl -X GET https://api-esf1.onrender.com/api/booking/services
```

### Get Sub-Services (Level 1)
Replace `:serviceId` with `692c5b96e45d3902a404bd28`.
```bash
curl -X GET "https://api-esf1.onrender.com/api/booking/services/692c5b96e45d3902a404bd28/items"
```

### Get Child-Services (Level 2)
Replace `:parentServiceItemId` with `693170e1a5e3046dc7db04b7`.
```bash
curl -X GET "https://api-esf1.onrender.com/api/booking/services/692c5b96e45d3902a404bd28/items?parentServiceItemId=693170e1a5e3046dc7db04b7"
```

### View Available Doctors
```bash
curl -X GET https://api-esf1.onrender.com/api/booking/doctors/opd
```

### Get Doctor Slots
```bash
curl -X GET "https://api-esf1.onrender.com/api/booking/doctors/6935b54f55259d00c29a4bd1/slots?date=2025-12-08"
```

### Book Appointment (Doctor)
```bash
curl -X POST https://api-esf1.onrender.com/api/booking/create \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzViNTRlNTUyNTlkMDBjMjlhNGJjZCIsInJvbGUiOiJVc2VyIiwiaWF0IjoxNzY1MTI3NTAyLCJleHAiOjE3OTY2NjM1MDJ9.HUUe9ByqX2W7IuQDqKlg5AjUfgk8U-kI5_9yjsmpMek" \
  -H "Content-Type: application/json" \
  -d '{
    "itemType": "User",
    "itemId": "6935b54f55259d00c29a4bd1",
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
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzViNTRmNTUyNTlkMDBjMjlhNGJkMSIsInJvbGUiOiJEb2N0b3IiLCJpYXQiOjE3NjUxMjc1MDMsImV4cCI6MTc5NjY2MzUwM30.JSmve6GXSe6f6cBc_tLW9ez2imhWYxq53StTqddXC8Y"
```

### Manage Slots
```bash
curl -X POST https://api-esf1.onrender.com/api/doctor/slots \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzViNTRmNTUyNTlkMDBjMjlhNGJkMSIsInJvbGUiOiJEb2N0b3IiLCJpYXQiOjE3NjUxMjc1MDMsImV4cCI6MTc5NjY2MzUwM30.JSmve6GXSe6f6cBc_tLW9ez2imhWYxq53StTqddXC8Y" \
  -H "Content-Type: application/json" \
  -d '{
    "working_hours": [
        { "day": "Monday", "start": "09:00", "end": "17:00", "enabled": true },
        { "day": "Tuesday", "start": "09:00", "end": "17:00", "enabled": true }
    ]
  }'
```
