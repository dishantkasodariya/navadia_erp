import React from "react";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/dm-serif-display/400.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider, useAuth, UserRole } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import AdminDashboard from "@/pages/AdminDashboard";
import DentistDashboard from "@/pages/DentistDashboard";
import ReceptionDashboard from "@/pages/ReceptionDashboard";
import Patients from "@/pages/Patients";
import Appointments from "@/pages/Appointments";
import StaffManagement from "@/pages/StaffManagement";
import Attendance from "@/pages/Attendance";
import Tasks from "@/pages/Tasks";
import LeaveRequests from "@/pages/LeaveRequests";
import Voicemail from "@/pages/Voicemail";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function RoleRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  const prefix = user.role === "receptionist" ? "reception" : user.role;
  return <Navigate to={`/${prefix}/dashboard`} replace />;
}

function ProtectedLayout({ allowedRoles }: { allowedRoles: UserRole[] }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <AppLayout />
    </ProtectedRoute>
  );
}

const sharedRoutes = (
  <>
    <Route path="patients" element={<Patients />} />
    <Route path="appointments" element={<Appointments />} />
    <Route path="staff" element={<StaffManagement />} />
    <Route path="attendance" element={<Attendance />} />
    <Route path="tasks" element={<Tasks />} />
    <Route path="leave-requests" element={<LeaveRequests />} />
    <Route path="voicemail" element={<Voicemail />} />
    <Route path="clinical" element={<PlaceholderPage title="Clinical Records" description="EMR, tooth charts, and SOAP notes" />} />
    <Route path="treatment-plans" element={<PlaceholderPage title="Treatment Plans" description="Phase-based treatment planning with cost estimates" />} />
    <Route path="imaging" element={<PlaceholderPage title="Imaging" description="X-rays, intraoral photos, and document vault" />} />
    <Route path="billing" element={<PlaceholderPage title="Billing & Insurance" description="Invoices, payments, and insurance claims" />} />
    <Route path="inventory" element={<PlaceholderPage title="Inventory" description="Stock management, purchase orders, and supplies" />} />
    <Route path="reports" element={<PlaceholderPage title="Reports & Analytics" description="Revenue trends, chair utilization, and custom reports" />} />
    <Route path="notifications" element={<PlaceholderPage title="Notifications" description="SMS, email, and WhatsApp reminders" />} />
    <Route path="crm" element={<PlaceholderPage title="CRM" description="Patient engagement, recall campaigns, and feedback" />} />
    <Route path="settings" element={<PlaceholderPage title="Settings" description="Clinic configuration, branches, and user roles" />} />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/admin" element={<ProtectedLayout allowedRoles={["admin"]} />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              {sharedRoutes}
            </Route>

            <Route path="/dentist" element={<ProtectedLayout allowedRoles={["dentist"]} />}>
              <Route path="dashboard" element={<DentistDashboard />} />
              {sharedRoutes}
            </Route>

            <Route path="/reception" element={<ProtectedLayout allowedRoles={["receptionist"]} />}>
              <Route path="dashboard" element={<ReceptionDashboard />} />
              {sharedRoutes}
            </Route>

            <Route path="/staff" element={<ProtectedLayout allowedRoles={["staff"]} />}>
              <Route path="dashboard" element={<ReceptionDashboard />} />
              {sharedRoutes}
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
