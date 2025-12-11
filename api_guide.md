# A1CARE API Documentation (Live Source of Truth)
*Generated from codebase on 2025-12-10*

## Base URL
`https://api-esf1.onrender.com/api`

---

## 1. Authentication & User Profile
**Base Path**: `/auth`

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `POST` | `/login` | Login/Signup with Mobile & Role. Returns JWT. | No |
| `POST` | `/register` | Complete profile (Name, Email) after login. | **Yes** |
| `POST` | `/coordinates` | Update user Latitude/Longitude. | **Yes** |
| `GET` | `/profile` | Get current user details. | **Yes** |
| `PUT` | `/profile` | Update user details. | **Yes** |

---

## 2. Booking & Home Screen (User App)
**Base Path**: `/booking`

### Service Discovery (Hierarchy)
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `GET` | `/services` | **Level 0**: Get Main Services (e.g., OPD, Lab). | No |
| `GET` | `/services/:id/sub-services` | **Level 1**: Get Sub-Services (e.g., Cardiology). | No |
| `GET` | `/sub-services/:id/child-services`| **Level 2**: Get Items (e.g., ECG, Full Body Checkup). | No |
| `GET` | `/doctors/nearby` | **Search**: Find doctors by location & service type. | No |
| `GET` | `/doctors/:id` | Get specific Doctor details. | No |
| `GET` | `/doctors/:id/slots` | Get Doctor's slots for a date (`?date=YYYY-MM-DD`). | No |

### Booking Actions
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | Create a new booking. | **Yes** |
| `GET` | `/user` | Get my booking history. | **Yes** |

---

## 3. Doctor App
**Base Path**: `/doctor`

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `GET` | `/appointments` | Get my appointments (Grouped: new, upcoming, etc). | **Yes** |
| `POST` | `/slots` | Create availability slots. | **Yes** |
| `GET` | `/slots` | View my slots. | **Yes** |
| `PUT` | `/appointments/:id/status` | Update booking status (Accept/Reject/Complete). | **Yes** |
| `PUT` | `/documents/upload` | Upload verification documents. | **Yes** |
| `PUT` | `/profile` | Update Doctor profile (fees, services). | **Yes** |

---

## 4. Admin Panel
**Base Path**: `/admin`

### Hierarchy Management (New)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/services/hierarchy` | Get full nested tree (Service -> Sub -> Child). |
| `POST` | `/services/:id/sub-services` | Add Sub-Service. |
| `POST` | `/services/sub-services/:id/child-services` | Add Child Service (Item). |

### General Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users` | List all users. |
| `GET` | `/doctors` | List all doctors. |
| `POST` | `/doctors` | Add a doctor manually. |
| `GET` | `/bookings` | List all bookings. |
