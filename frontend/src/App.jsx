import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import VoucherList from './pages/VoucherList.jsx';
import VoucherForm from './pages/VoucherForm.jsx';
import VoucherDetail from './pages/VoucherDetail.jsx';

// Redirects to /login when signed out, and to "/" when the role is not allowed
function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-note">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="vouchers" element={<VoucherList mode="all" />} />
        <Route path="pending" element={<Protected roles={['director']}><VoucherList mode="pending" /></Protected>} />
        <Route path="vouchers/new" element={<Protected roles={['employee']}><VoucherForm /></Protected>} />
        <Route path="vouchers/:id/edit" element={<Protected roles={['employee']}><VoucherForm /></Protected>} />
        <Route path="vouchers/:id" element={<VoucherDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
