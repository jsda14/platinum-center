import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthSession } from './ui/hooks/useAuthSession';
import { ProtectedRoute } from './ui/components/ProtectedRoute/ProtectedRoute';
import { RoleRedirect } from './ui/components/RoleRedirect/RoleRedirect';
import { AuthLayout } from './ui/layouts/AuthLayout/AuthLayout';
import { AdminLayout } from './ui/layouts/AdminLayout/AdminLayout';
import { MemberLayout } from './ui/layouts/MemberLayout/MemberLayout';
import { Login } from './ui/pages/Login/Login';

import { MemberPortal } from './ui/pages/MemberPortal/MemberPortal';

import { MemberPayments } from './ui/pages/MemberPayments/MemberPayments';

import { MemberSuggestions } from './ui/pages/MemberSuggestions/MemberSuggestions';

export function App() {
  useAuthSession();

  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />

      {/* Public / Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
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
        <Route index element={<div>Dashboard Admin</div>} />
        <Route path="members" element={<div>Gestión de Miembros</div>} />
        <Route path="payments" element={<div>Gestión de Pagos</div>} />
        <Route path="config" element={<div>Configuración del Gym</div>} />
      </Route>

      {/* Receptionist routes */}
      <Route
        path="/reception/*"
        element={
          <ProtectedRoute allowedRoles={['receptionist', 'super_admin']}>
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
          <ProtectedRoute allowedRoles={['member', 'super_admin']}>
            <MemberLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MemberPortal />} />
        <Route path="payments" element={<MemberPayments />} />
        <Route path="suggestions" element={<MemberSuggestions />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
