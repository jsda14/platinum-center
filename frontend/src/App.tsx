import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuthSession } from './ui/hooks/useAuthSession';
import { ProtectedRoute } from './ui/components/ProtectedRoute/ProtectedRoute';
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
import { TermsOfService } from './ui/pages/TermsOfService/TermsOfService';
import { PrivacyPolicy } from './ui/pages/PrivacyPolicy/PrivacyPolicy';
import { CookieBanner } from './ui/components/CookieBanner/CookieBanner';
import { Landing } from './ui/pages/Landing/Landing';
import { AdminProfile } from './ui/pages/AdminProfile/AdminProfile';

import { useAppSelector } from './infrastructure/store/store';

// Helper redirects to maintain DRY principle and handle hardcoded inner-component navigations
function AdminMembersRedirect() {
  const { profile } = useAppSelector((state) => state.auth);
  if (profile?.role === 'receptionist') {
    return <Navigate to="/reception/members" replace />;
  }
  return (
    <AdminLayout>
      <AdminMembers />
    </AdminLayout>
  );
}

function AdminMemberDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAppSelector((state) => state.auth);
  if (profile?.role === 'receptionist') {
    return <Navigate to={`/reception/members/${id}`} replace />;
  }
  return (
    <AdminLayout>
      <AdminMemberDetail />
    </AdminLayout>
  );
}

function AdminPaymentsRedirect() {
  const { profile } = useAppSelector((state) => state.auth);
  if (profile?.role === 'receptionist') {
    return <Navigate to="/reception/payments" replace />;
  }
  return (
    <AdminLayout>
      <AdminPayments />
    </AdminLayout>
  );
}

function AdminPlansRedirect() {
  const { profile } = useAppSelector((state) => state.auth);
  if (profile?.role === 'receptionist') {
    return <Navigate to="/reception/plans" replace />;
  }
  return (
    <AdminLayout>
      <AdminPlans />
    </AdminLayout>
  );
}

export function App() {
  useAuthSession();

  return (
    <>
      <Routes>
      <Route path="/" element={<Landing />} />

      {/* Public / Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/setup-profile" element={<SetupProfile />} />
      </Route>

      {/* Public pages */}
      <Route path="/terminos" element={<TermsOfService />} />
      <Route path="/politica-privacidad" element={<PrivacyPolicy />} />

      {/* Specific routes matched first to handle cross-role redirects and component re-use */}
      <Route
        path="/admin/members/:id"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'receptionist']}>
            <AdminMemberDetailRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/members"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'receptionist']}>
            <AdminMembersRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'receptionist']}>
            <AdminPaymentsRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/plans"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'receptionist']}>
            <AdminPlansRedirect />
          </ProtectedRoute>
        }
      />

      {/* Admin routes (restricted to super_admin only) */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="communications" element={<AdminCommunications />} />
        <Route path="profile" element={<AdminProfile />} />
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
        <Route index element={<AdminMembers />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="members/:id" element={<AdminMemberDetail />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="profile" element={<AdminProfile />} />
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
    <CookieBanner />
  </>
  );
}

export default App;
