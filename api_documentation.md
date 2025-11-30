# A1Care API Documentation

## Authentication

### Login / Signup
```bash
curl -X POST https://api-esf1.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "9876543210",
    "role": "User",
    "fcm_token": "sample_fcm_token"
  }'
```

### Update Profile
```bash
curl -X PUT https://api-esf1.onrender.com/api/auth/profile \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

## Services

### Get All Services (Home Screen)
```bash
curl -X GET https://api-esf1.onrender.com/api/booking/services
```

### Get Lab Tests (Sorted by Price)
```bash
curl -X GET "https://api-esf1.onrender.com/api/lab-tests?sort=price_low_high"
```

### Get Medical Equipment (Sorted by Price)
```bash
curl -X GET "https://api-esf1.onrender.com/api/medical-equipment?sort=price_low_high"
```

### Get Ambulances (Sorted by Price)
```bash
curl -X GET "https://api-esf1.onrender.com/api/ambulance?sort=price_low_high"
```

## Bookings

### Create Booking (COD)
```bash
curl -X POST https://api-esf1.onrender.com/api/booking/create \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "itemType": "User",
    "itemId": "<DOCTOR_USER_ID>",
    "serviceId": "<SERVICE_ID>",
    "slotId": "SLOT_001",
    "slotStartTime": "2023-10-27T09:00:00.000Z",
    "slotEndTime": "2023-10-27T09:30:00.000Z",
    "booking_date": "2023-10-27",
    "payment_method": "COD"
  }'
```

### Get User Bookings
```bash
curl -X GET https://api-esf1.onrender.com/api/booking/user \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

## Admin Panel

### Approve Doctor
```bash
curl -X PUT https://api-esf1.onrender.com/api/admin/doctors/<DOCTOR_USER_ID>/approve \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Get All Bookings (Admin)
```bash
curl -X GET "https://api-esf1.onrender.com/api/admin/bookings?status=Upcoming" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Get Analytics
```bash
curl -X GET https://api-esf1.onrender.com/api/admin/analytics \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
