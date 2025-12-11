
## 1. User Authentication
### 1.1 User Login & Signup
**Scenario**: A new user opens the app and enters mobile number.
```bash
curl --location 'https://api-esf1.onrender.com/api/auth/login' \
--header 'Content-Type: application/json' \
--data '{
    "mobile_number": "9238800606", 
    "role": "User", 
    "fcm_token": "device_fcm_token_123"
}'
```

### 1.2 User Profile Update
**Scenario**: User enters their name and email.
```bash
curl --location 'https://api-esf1.onrender.com/api/auth/register' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzhlYzYxNjdjYWJkZjY5MDJkMWQ5ZSIsInJvbGUiOiJVc2VyIiwiaWF0IjoxNzY1MzM4MjEwLCJleHAiOjE3OTY4NzQyMTB9._WxE_LrWIA5uc5Rp8JfnHJRuBOgtLs3FEFdISSdF0kk' \
--header 'Content-Type: application/json' \
--data '{
    "name": "Rahul Patient",
    "email": "rahul.patient@gmail.com"
}'
```

---

## 2. Doctor Onboarding
### 2.1 Doctor Login
**Scenario**: A doctor logs in.
```bash
curl --location 'https://api-esf1.onrender.com/api/auth/login' \
--header 'Content-Type: application/json' \
--data '{
    "mobile_number": "9474132115", 
    "role": "Doctor", 
    "fcm_token": "doctor_fcm_token_xyz"
}'
```

### 2.2 Doctor Profile Update (Fees & Experience)
**Scenario**: Doctor sets their consultation fees.
```bash
curl --location --request PUT 'https://api-esf1.onrender.com/api/doctor/profile' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzhlYzY0NjdjYWJkZjY5MDJkMWRhNiIsInJvbGUiOiJEb2N0b3IiLCJpYXQiOjE3NjUzMzgyMTIsImV4cCI6MTc5Njg3NDIxMn0.5T5Q2sGceyIM62TeKMBo6Rf3ZtGfluBOD1A03tMZip4' \
--header 'Content-Type: application/json' \
--data '{
    "consultation_fee": 500,
    "experience": 5,
    "about": "Expert Cardiologist",
    "offered_services": ["OPD", "Video Consultation"]
}'
```

### 2.3 Upload Documents
**Scenario**: Doctor uploads verification proofs.
```bash
# Note: Requires multipart/form-data. This is a simplified example.
curl --location --request PUT 'https://api-esf1.onrender.com/api/doctor/documents/upload' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzhlYzY0NjdjYWJkZjY5MDJkMWRhNiIsInJvbGUiOiJEb2N0b3IiLCJpYXQiOjE3NjUzMzgyMTIsImV4cCI6MTc5Njg3NDIxMn0.5T5Q2sGceyIM62TeKMBo6Rf3ZtGfluBOD1A03tMZip4' \
--form 'degree=@"/path/to/degree.pdf"' \
--form 'license=@"/path/to/license.jpg"'
```

---

## 3. Admin Verification
### 3.1 Admin Login
```bash
curl --location 'https://api-esf1.onrender.com/api/auth/login' \
--header 'Content-Type: application/json' \
--data '{
    "mobile_number": "9521766425", 
    "role": "Admin", 
    "fcm_token": "admin_device"
}'
```

### 3.2 Approve Doctor
**Scenario**: Admin approves the new doctor so they show up in search.
```bash
curl --location --request PUT 'https://api-esf1.onrender.com/api/admin/doctors/6938ec6467cabdf6902d1da8/approve' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzhlYzY2NjdjYWJkZjY5MDJkMWRhZSIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc2NTMzODIxNCwiZXhwIjoxNzk2ODc0MjE0fQ.sQIOLgqXrx2hfBQYR_D8nTi37V6bdGlxhPneVEmRbO4'
```

---

## 4. Doctor Schedule
### 4.1 Create Available Slots
**Scenario**: Doctor adds slots for today.
```bash
curl --location 'https://api-esf1.onrender.com/api/doctor/slots' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzhlYzY0NjdjYWJkZjY5MDJkMWRhNiIsInJvbGUiOiJEb2N0b3IiLCJpYXQiOjE3NjUzMzgyMTIsImV4cCI6MTc5Njg3NDIxMn0.5T5Q2sGceyIM62TeKMBo6Rf3ZtGfluBOD1A03tMZip4' \
--header 'Content-Type: application/json' \
--data '{
    "date": "2025-12-10",
    "slots": [
        { "start": "10:00", "end": "10:30" },
        { "start": "11:00", "end": "11:30" }
    ]
}'
```

---

## 5. User Home & Discovery
### 5.1 Get All Services (Home Screen)
**Scenario**: User sees main categories (e.g., Medical Services, Ambulance).
```bash
curl --location 'https://api-esf1.onrender.com/api/booking/services'
```

### 5.2 Get Sub-Services (e.g., Click "Doctor Services")
**Scenario**: User clicks a service to see specialties (e.g., Cardiology, General Physician).
```bash
curl --location 'https://api-esf1.onrender.com/api/booking/services/6938624235d000899adcfd24/sub-services'
```
### 5.3 Get Child Service Items (e.g., Click "Doctor Home Visit")
**Scenario**: User selects a sub-category.
```bash
curl --location 'https://api-esf1.onrender.com/api/booking/sub-services/6938628435d000899adcfd2a/child-services'
```
### 5.4 Search Doctors (If Service is OPD)
**Scenario**: User filters for doctors (optionally by location).
```bash
curl --location 'https://api-esf1.onrender.com/api/booking/doctors/opd' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzhlYzYxNjdjYWJkZjY5MDJkMWQ5ZSIsInJvbGUiOiJVc2VyIiwiaWF0IjoxNzY1MzM4MjEwLCJleHAiOjE3OTY4NzQyMTB9._WxE_LrWIA5uc5Rp8JfnHJRuBOgtLs3FEFdISSdF0kk'
```
## 6. Booking
### 6.1 Create Booking
**Scenario**: User books the 10:00 AM slot.
```bash
curl --location 'https://api-esf1.onrender.com/api/booking/create' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzhlYzYxNjdjYWJkZjY5MDJkMWQ5ZSIsInJvbGUiOiJVc2VyIiwiaWF0IjoxNzY1MzM4MjEwLCJleHAiOjE3OTY4NzQyMTB9._WxE_LrWIA5uc5Rp8JfnHJRuBOgtLs3FEFdISSdF0kk' \
--header 'Content-Type: application/json' \
--data '{
    "itemType": "User", 
    "itemId": "6938ec6467cabdf6902d1da6",
    "serviceId": "6938624235d000899adcfd24",
    "booking_date": "2025-12-10",
    "slotId": "SLOT_ID_FROM_GET_RESPONSE",
    "type": "OPD",
    "payment_method": "COD"
}'
```

### 6.2 View My Bookings
```bash
curl --location 'https://api-esf1.onrender.com/api/booking/user' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzhlYzYxNjdjYWJkZjY5MDJkMWQ5ZSIsInJvbGUiOiJVc2VyIiwiaWF0IjoxNzY1MzM4MjEwLCJleHAiOjE3OTY4NzQyMTB9._WxE_LrWIA5uc5Rp8JfnHJRuBOgtLs3FEFdISSdF0kk'
```
