
### 1. GET ALL SERVICES (Main Categories)
Curl:
```bash
curl -X GET https://api-esf1.onrender.com/api/booking/services
```

### 2. GET SUB-SERVICES (Level 1)
For Service: **OPD Booking** (ID: `692c5b96e45d3902a404bd28`)
Curl:
```bash
curl -X GET "https://api-esf1.onrender.com/api/booking/services/692c5b96e45d3902a404bd28/items"
```

### 3. GET CHILD-SERVICES (Level 2)
For Sub-Service: **sdsd** (ID: `693170e1a5e3046dc7db04b7`)
Parent Service: **OPD Booking** (ID: `692c5b96e45d3902a404bd28`)
Curl:
```bash
curl -X GET "https://api-esf1.onrender.com/api/booking/services/692c5b96e45d3902a404bd28/items?parentServiceItemId=693170e1a5e3046dc7db04b7"
```

> **Note**: No Level 2 (Child) items found for this sub-service on the live server yet.