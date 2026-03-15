# A1Care Platform: Strategic Project Summary

## 🚀 Overview
A1Care is an integrated healthcare ecosystem providing on-demand home healthcare services and doctor consultations. The platform bridges the gap between healthcare providers (Partners) and patients (Users) through a robust backend and dedicated mobile/web interfaces.

## 🏗 Key Components
1. **A1Care Backend**: Node.js/Express server handling core business logic, payments, and notifications.
2. **User App**: Expo-based mobile application for patients to discover services, book appointments, and manage health records.
3. **Partner App**: Expo-based mobile application for healthcare professionals and agencies to manage service requests, earnings, and subscriptions.
4. **Admin Panel**: React 19 web dashboard for super-admin oversight, financial monitoring, and system configuration.

## 💡 Strategic Main Points

### 1. Unified Healthcare Workflow
- **Demand Side (User)**: Seamless discovery of Doctors and Services (Home care, Lab tests, etc.).
- **Supply Side (Partner)**: Subscription-based model for providers to list their services and accept real-time bookings.
- **Clinical Tracking (Planned)**: Integration of a Digital Health Vault for patients to track prescriptions, doctor notes, and diagnostic reports after every visit.
- **Support Logic**: Integrated ticketing system for conflict resolution and patient support.

### 2. Financial Ecosystem
- **Wallet-First Architecture**: Internal wallet system for both users and partners.
- **Payment Integrity**: Integration with **Easebuzz** for transaction handling.
- **Subscription Engine**: Partners operate on a subscription basis, ensuring predictable platform revenue.

### 3. Real-Time Operations
- **Live Monitoring**: Dashboard provides high-density telemetry (KPIs, Active Sessions, Revenue Trends).
- **Communication Layer**: Expo Push Notifications and Twilio SMS keep all stakeholders synced during the booking lifecycle.
- **Socket Connectivity**: Real-time status updates via Socket.io for live booking monitoring.

### 4. Enterprise-Grade Admin Panel
- **Mission Control**: Premium Admin Dashboard featuring glassmorphism and real-time operational intel.
- **Hierarchical Governance**: Formal split between **Super Admins** (System security, API keys, audit logs) and **Admins** (Daily operations, booking management).
- **Granular Control**: Dedicated modules for Managing Staff, OP Bookings, Service Categories, and System Settings.

## 🛠 Technology Stack
- **Backend**: Node.js, Express 5, MongoDB (Mongoose), TypeScript.
- **Frontend (Web)**: React 19, Vite, Tailwind CSS v4, React Query.
- **Mobile**: Expo 54 (React Native 0.81), NativeWind, Zustand.
- **Infrastructure**: AWS S3 (Media), Redis (Caching), Firebase Admin (Auth/Notifications).
