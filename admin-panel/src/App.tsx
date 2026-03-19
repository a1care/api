import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ModulePlaceholderPage } from "@/pages/ModulePlaceholderPage";
import { AdminManagementPage } from "@/pages/AdminManagementPage";
import { AuditLogsPage } from "@/pages/AuditLogsPage";
import { AppManagementPage } from "@/pages/AppManagementPage";
import { SystemSettingsPage } from "@/pages/SystemSettingsPage";
import { ServiceManagementPage } from "@/pages/ServiceManagementPage";
import { UserManagementPage } from "@/pages/UserManagementPage";
import { BookingOperationsPage } from "@/pages/BookingOperationsPage";
import { OPBookingsPage } from "@/pages/OPBookingsPage";
import { DoctorStaffManagementPage } from "@/pages/DoctorStaffManagementPage";
import { TicketsPage } from "@/pages/TicketsPage";
import { SubscriptionManagementPage } from "@/pages/SubscriptionManagementPage";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />

            {/* Service Management Hierarchy */}
            <Route path="/service-management" element={<ServiceManagementPage />} />
            <Route path="/service-categories" element={<ServiceManagementPage />} />
            <Route path="/service-subcategories" element={<ServiceManagementPage />} />
            <Route path="/service-child-services" element={<ServiceManagementPage />} />

            {/* Revenue & Subscriptions */}
            <Route path="/partner-revenue-model" element={<SubscriptionManagementPage />} />

            {/* User Management Section */}
            <Route path="/manage-patients" element={<UserManagementPage category="patient" />} />
            <Route path="/manage-doctors" element={<DoctorStaffManagementPage />} />
            <Route path="/service-providers" element={<DoctorStaffManagementPage />} />
            <Route path="/manage-nurses" element={<UserManagementPage category="nurse" />} />
            <Route path="/manage-ambulances" element={<UserManagementPage category="ambulance" />} />
            <Route path="/manage-rentals" element={<UserManagementPage category="rental" />} />

            {/* Compatibility Redirects */}
            <Route path="/patients" element={<Navigate to="/manage-patients" replace />} />
            <Route path="/doctors" element={<Navigate to="/manage-doctors" replace />} />

            {/* Operations */}
            <Route path="/bookings" element={<BookingOperationsPage />} />
            <Route path="/op-bookings" element={<OPBookingsPage />} />
            <Route path="/support-tickets" element={<TicketsPage />} />
            <Route path="/notifications" element={<ModulePlaceholderPage title="Broadcast Notifications" description="Send operational announcements to users/providers." />} />
            <Route path="/reports" element={<ModulePlaceholderPage title="Reports" description="View business and operational metrics." />} />

            {/* Super Admin Restricted */}
            <Route element={<ProtectedRoute allowRoles={["super_admin"]} />}>
              <Route path="/admin-management" element={<AdminManagementPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/settings" element={<ModulePlaceholderPage title="System Settings" description="Critical system configurations are restricted to super_admin." />} />
              <Route path="/manage-customer-app" element={<AppManagementPage appKey="user_app" />} />
              <Route path="/manage-provider-app" element={<AppManagementPage appKey="provider_app" />} />
              <Route path="/manage-system-config" element={<SystemSettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
