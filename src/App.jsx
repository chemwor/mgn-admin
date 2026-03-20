import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import AdminPanel from "./pages/AdminPanel";
import AdminReview from "./pages/AdminReview";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public — no auth required */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Authenticated — moderator/super_admin only */}
        <Route
          element={
            <ProtectedRoute roles={["super_admin", "moderator"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/panel" element={<AdminPanel />} />
          <Route path="/panel/review/:id" element={<AdminReview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
