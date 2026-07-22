import React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { AuthProvider, useAuth, UserRole } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
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
import Messages from "@/pages/Messages";
import Clinical from "@/pages/Clinical";
import Settings from "@/pages/Settings";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function RoleRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return null;
  
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  const userRoleLower = user.role.toLowerCase();
  const prefix = userRoleLower === "receptionist" ? "reception" : userRoleLower;
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
    <Route path="appointments" element={<Appointments />} />
    <Route path="patients" element={<Patients />} />
    <Route path="staff" element={<StaffManagement />} />
    <Route path="attendance" element={<Attendance />} />
    <Route path="tasks" element={<Tasks />} />
    <Route path="leave-requests" element={<LeaveRequests />} />
    <Route path="voicemail" element={<Voicemail />} />
    <Route path="clinical" element={<Clinical />} />
    <Route path="treatment-plans" element={<PlaceholderPage title="Treatment Plans" description="Phase-based treatment planning with cost estimates" />} />
    <Route path="imaging" element={<PlaceholderPage title="Imaging" description="X-rays, intraoral photos, and document vault" />} />
    <Route path="billing" element={<PlaceholderPage title="Billing & Insurance" description="Invoices, payments, and insurance claims" />} />
    <Route path="inventory" element={<PlaceholderPage title="Inventory" description="Stock management, purchase orders, and supplies" />} />
    <Route path="reports" element={<PlaceholderPage title="Reports & Analytics" description="Revenue trends, chair utilization, and custom reports" />} />
    <Route path="notifications" element={<PlaceholderPage title="Notifications" description="SMS, email, and WhatsApp reminders" />} />
    <Route path="messages" element={<Messages />} />
    <Route path="crm" element={<PlaceholderPage title="CRM" description="Patient engagement, recall campaigns, and feedback" />} />
    <Route path="settings" element={<Settings />} />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <Routes>
              <Route path="/" element={<RoleRedirect />} />
              <Route path="/login" element={<Login isAdmin={false} />} />
              <Route path="/admin/login" element={<Login isAdmin={true} />} />
              <Route path="/admin/signup" element={<Signup />} />

              <Route path="/superadmin" element={<ProtectedLayout allowedRoles={["Admin"]} />}>
                <Route path="dashboard" element={<AdminDashboard />} />
                {sharedRoutes}
              </Route>

              <Route path="/admin" element={<ProtectedLayout allowedRoles={["Admin"]} />}>
                <Route path="dashboard" element={<AdminDashboard />} />
                {sharedRoutes}
              </Route>

              <Route path="/dentist" element={<ProtectedLayout allowedRoles={["Dentist"]} />}>
                <Route path="dashboard" element={<DentistDashboard />} />
                {sharedRoutes}
              </Route>

              <Route path="/reception" element={<ProtectedLayout allowedRoles={["Staff"]} />}>
                <Route path="dashboard" element={<ReceptionDashboard />} />
                {sharedRoutes}
              </Route>

              <Route path="/staff" element={<ProtectedLayout allowedRoles={["Staff"]} />}>
                <Route path="dashboard" element={<ReceptionDashboard />} />
                {sharedRoutes}
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
