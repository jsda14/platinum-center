import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthSession } from './ui/hooks/useAuthSession';
import { ProtectedRoute } from './ui/components/ProtectedRoute/ProtectedRoute';
import { RoleRedirect } from './ui/components/RoleRedirect/RoleRedirect';
import { AuthLayout } from './ui/layouts/AuthLayout/AuthLayout';
import { AdminLayout } from './ui/layouts/AdminLayout/AdminLayout';
import { MemberLayout } from './ui/layouts/MemberLayout/MemberLayout';
import { AdminMembers } from './ui/pages/AdminMembers/AdminMembers';
import { Login } from './ui/pages/Login/Login';
import { MemberPortal } from './ui/pages/MemberPortal/MemberPortal';
import { MemberPayments } from './ui/pages/MemberPayments/MemberPayments';
import { MemberSuggestions } from './ui/pages/MemberSuggestions/MemberSuggestions';
import { MemberRenewal } from './ui/pages/MemberRenewal/MemberRenewal';
import { PaymentResult } from './ui/pages/PaymentResult/PaymentResult';
import { SetupProfile } from './ui/pages/SetupProfile/SetupProfile';
import { MemberSettings } from './ui/pages/MemberSettings/MemberSettings';
import { AdminPayments } from './ui/pages/AdminPayments/AdminPayments';
import { AdminMemberDetail } from './ui/pages/AdminMemberDetail/AdminMemberDetail';
import { AdminDashboard } from './ui/pages/AdminDashboard/AdminDashboard';
import { AdminPlans } from './ui/pages/AdminPlans/AdminPlans';
import { AdminSettings } from './ui/pages/AdminSettings/AdminSettings';
import { AdminCommunications } from './ui/pages/AdminCommunications/AdminCommunications';



export function App() {
  useAuthSession();

  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />

      {/* Public / Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/setup-profile" element={<SetupProfile />} />
      </Route>
      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'receptionist']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="members/:id" element={<AdminMemberDetail />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="communications" element={<AdminCommunications />} />
      </Route>

      {/* Receptionist routes */}
      <Route
        path="/reception/*"
        element={
          <ProtectedRoute allowedRoles={['receptionist']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<div>Panel Recepción</div>} />
      </Route>

      {/* Member Portal routes */}
      <Route
        path="/portal/*"
        element={
          <ProtectedRoute allowedRoles={['member']}>
            <MemberLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MemberPortal />} />
        <Route path="payments" element={<MemberPayments />} />
        <Route path="suggestions" element={<MemberSuggestions />} />
        <Route path="renewal" element={<MemberRenewal />} />
        <Route path="payment-result" element={<PaymentResult />} />
        <Route path="settings" element={<MemberSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
