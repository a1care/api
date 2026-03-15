# A1Care Platform: Detailed Technical Analysis & Architectural Blueprint

This document provides a comprehensive, segment-by-segment analysis of the A1Care ecosystem. It is designed to provide full technical context for developers and AI agents joining the project.

---

## 1. 📂 System Architecture Overview

### 🔙 The Backend Core (`a1care backend/`)
The backend is a **Modular Monolith** built with Node.js and Express 5. It follows a feature-folder pattern where each concern (Admins, Bookings, Wallet) lives in its own module directory.
- **Entry Point**: `src/index.ts` initializes the server, database connection (MongoDB), and middleware stacks.
- **Module Structure**: Each module (`src/modules/[module_name]`) typically contains:
  - `controller.ts`: Business logic and request handling.
  - `model.ts`: Mongoose schema definitions.
  - `routes.ts`: API endpoint definitions.
  - `schema.ts`: Zod validation schemas.
- **Middleware**: Custom authentication middleware (`protect`, `protectAdmin`) ensures Role-Based Access Control (RBAC).

### 📱 Mobile Ecosystem (`user app/` & `partner app/`)
Both apps are built on **Expo 54** (React Native 0.81) using a shared design philosophy.
- **Router**: `expo-router` provides file-system based routing.
- **Styling**: `nativewind` (Tailwind CSS for React Native) ensures rapid, consistent UI development.
- **State Management**: 
  - `React Query`: Manages server-side state and caching.
  - `Zustand`: Manages client-side global state (User Auth, Preferences).
- **Security**: Auth tokens are stored in `expo-secure-store`.

---

## 2. 🔐 Administrative Tiering (RBAC Flow)

The platform differentiates strictly between **Super Admins** (System Governance) and **Admins** (Operational Management).

| Feature / Permission | Super Admin | Admin | Technical Marker (`requireAdminRole`) |
| :--- | :---: | :---: | :--- |
| **Manage Admins** (Create/Update Role) | ✅ | ❌ | `requireAdminRole(["super_admin"])` |
| **System Config** (AWS, API Keys, Easebuzz) | ✅ | ❌ | `requireAdminRole(["super_admin"])` |
| **App Branding** (Logo, Banners, Colors) | ✅ | ❌ | `requireAdminRole(["super_admin"])` |
| **Audit Logs** (Track Admin Actions) | ✅ | ❌ | `requireAdminRole(["super_admin"])` |
| **Delete Users/Doctors** | ✅ | ❌ | `requireAdminRole(["super_admin"])` |
| **View Dashboard & KPIs** | ✅ | ✅ | `requireAdminRole(["admin", "super_admin"])` |
| **Manage Bookings** (Approve/Reject) | ✅ | ✅ | `requireAdminRole(["admin", "super_admin"])` |
| **Update User Status** (Active/Inactive) | ✅ | ✅ | `requireAdminRole(["admin", "super_admin"])` |
| **Customer Support** (Tickets) | ✅ | ✅ | `requireAdminRole(["admin", "super_admin"])` |

### The "Super Admin Only" Flow
1. **Bootstrap**: System is initialized via `ENV` Super Admin (Configured in `.env`).
2. **Expansion**: Super Admin creates focused "Admin" accounts for operations staff.
3. **Control**: Admins manage daily network tasks, but only the Super Admin can modify infrastructure keys.
4. **Safety**: Critical destructive actions (Delete User) and system audits are restricted to the Super Admin tier to prevent operational mistakes.

---

## 3. 🏛 Database & Model Registry (MongoDB)

Key entities that drive the platform:

| Model | Purpose | Key Attributes |
| :--- | :--- | :--- |
| **User/Doctor** | Core Identity | Roles (USER, DOCTOR, ADMIN), Wallet Balance, Service Type, Verification Status. |
| **DoctorAppointment** | Medical Bookings | Patient Reference, Doctor ID, Payment Status, Appointment Date/Slot. |
| **ServiceRequest** | Professional Services | Home care tasks, Lab tests, Child Service References, Fulfillment Status. |
| **Wallet/Transaction** | Financial Ledger | Balance, Type (Debit/Credit), Purpose (Booking, Refund, Subscription). |
| **PartnerSubscription** | Revenue Model | Subscription Tier, Expiry Date, Active/Inactive state. |
| **Ticket** | Support System | Subject, Priority (LOW, MEDIUM, HIGH), Status (OPEN, RESOLVED). |

---

## 4. 🔄 Core Operational Workflows

### A. The Booking Protocol
1. **Request**: User app fetches services via `GET /modules/Services`.
2. **Validation**: Server checks for available balances or initializes a payment intent via `POST /modules/Bookings/service-booking`.
3. **Execution**: If successful, a `ServiceRequest` is created.
4. **Dispatch**: Backend hits the `Notifications` module to alert relevant partners via Expo Push.
5. **Fulfillment**: Partner accepts and updates status (`Accepted` -> `In-Progress` -> `Completed`).

### B. The Payment & Settlement Cycle
- **Integration**: Uses **Easebuzz Pay** for external payment processing.
- **Internal Ledger**: Every paid booking creates a record in the `Wallet` module.
- **Commission**: Platform fees are calculated during the booking request based on service type settings.

---

## 5. 🎨 UI/UX Execution Strategy

### The Admin Panel Experience
- **Paradigm**: A high-fidelity "Mission Control" interface.
- **Design System**: Built on Tailwind CSS v4 with a custom design system defined in `styles.css`.
- **Key Feature**: **Administrative Intelligence Dashboard**—A glassmorphic telemetry display provideing real-time KPIs (Revenue, Volume, Retention).

### User-Centric Design (Mobile)
- **Hierarchy**: Clear navigation between `Home`, `Bookings`, and `Services`.
- **Trust Elements**: Verified badges for doctors, transparent pricing, and real-time support access.

---

## 6. 🛡 Security & Reliability

- **Validation**: Every POST/PUT request is piped through **Zod Schema Validation**.
- **Environments**: Strict separation of concerns via `.env` files (AWS keys, DB URIs).
- **Error Handling**: Centralized error middleware captures and formats issues into consistent API responses.
- **Monitoring**: Integration with Audit Logs for tracking administrative actions.

---

## 7. 🔌 Integration Map

| Service | Module | Functionality |
| :--- | :--- | :--- |
| **AWS S3** | `utils/shared` | Storage for Profile Photos, Documents, and Certificates. |
| **Twilio** | `utils/shared` | SMS alerts for transactions and OTPs. |
| **Easebuzz** | `modules/Wallet` | Indian Payment Gateway for online transactions. |
| **Expo Push** | `modules/Notifications` | Real-time push notifications to Android/iOS. |
| **Firebase Admin** | `modules/Authentication` | Handling cloud-based identity and analytics. |

---

## 8. 🚀 Future Development Notes

- **Modularity**: When adding new booking types, extend the `Bookings` module rather than creating a new high-level module to maintain standard patterns.
- **Caching**: Leverage the existing **Redis** integration for high-traffic endpoints (e.g., Service Lists).
- **Socket.io**: Ensure event names are consistent across backend (`emit`) and mobile (`on`) for real-time status syncing.
- **Clinical Integration**: Prioritize the implementation of the "Report Tracking" flow to bridge the gap between booking and clinical fulfillment.

---

## 9. 🧬 Implementation Blueprint: Clinical Report Tracking (CRITICAL)

To evolve A1Care from a booking engine to a healthcare provider, the following architectural flow must be implemented:

### A. Data Layer Expansion
- **New Model**: `MedicalRecord`
  - `patientId`: Reference to User.
  - `appointmentId`: Reference to the specific Booking.
  - `doctorId`: Reference to the fulfilling provider.
  - `clinicalNotes`: Text field for diagnosis.
  - `prescriptions`: Array of S3 URLs (PDF/Images).
  - `labReports`: Array of linked diagnostic files.

### B. The Fulfiller Flow (Partner App)
1. **Completion Trigger**: When a doctor marks an appointment as "Completed".
2. **Clinical Input**: A mandatory/optional form appears calling `POST /api/medical-records/upload`.
3. **Asset Handling**: Files are streamed to AWS S3, and metadata is stored in the new model.

### C. The Consumer Flow (User App)
1. **Health Vault**: A new section in the profile displaying a chronological list of `MedicalRecords`.
2. **Transparency**: Patients can download their prescriptions and view doctor notes directly after the session.
3. **Tracking**: Integration of a "Progress Chart" for recurring services (e.g., Physiotherapy status).

### D. Security & HIPAA Compliance
- **Encryption**: Medical files in S3 must be encrypted at rest.
- **Access Control**: Only the assigned Patient and the specific Doctor who fulfilled the service should have access to the `MedicalRecord`.

---

## 10. 📣 Communication Engine (Push & Email)

The platform features a multi-channel communication stack that keeps users and providers in sync.

### 📧 Email Infrastructure (`utils/email.ts`)
- **Technology**: Nodemailer with SMTP transport.
- **Configuration**: Managed dynamically via the Admin Panel (System Credentials).
- **Trigger Positions**:
  - **Account Lifecycle**: Welcome email sent upon first-time profile completion.
  - **Bookings**: Immediate confirmation email for new appointments and status updates (Confirmed/Cancelled).
  - **Financials**: Credit notifications for successful Easebuzz payments and manual admin adjustments.
  - **Security**: Prepared OTP fallback template for identity verification.
- **Templates**: Centralized HTML templates with a consistent A1Care 24/7 design language.

### 📱 Push Notification Stack (`utils/sendPushNotification.ts`)
- **Technology**: Firebase Admin SDK for the backend; Expo Notifications for mobile.
- **Persistence**: Every notification is saved to the `NotificationModel` in MongoDB, enabling an "In-App Inbox" experience.
- **In-App Inbox**: Both Patient and Partner apps have dedicated notification centers (REST API: `GET /api/notifications`).
- **Deep Linking**: Push payloads include a `data` object with `screen` and `id` keys to navigate the user to the specific booking or ticket.
