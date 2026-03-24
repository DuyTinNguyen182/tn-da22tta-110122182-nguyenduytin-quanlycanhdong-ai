import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext"; // Import Context

// Pages
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ProtectedLayout from "./components/Layout/ProtectedRoute";
import PublicRoute from "./components/Layout/PublicRoute";
import Dashboard from "./pages/Dashboard";
import Fields from "./pages/Fields";
import CropsPage from "./pages/Crops";
import AIScan from "./pages/AIScan";
import AIChat from "./pages/AIChat";
import AdminLayout from "./components/Layout/AdminLayout";
import AdminOverview from "./pages/Admin/AdminOverview";
import AdminUsers from "./pages/Admin/AdminUsers";
import AdminSeasons from "./pages/Admin/AdminSeasons";
import AdminTasks from "./pages/Admin/AdminTasks";

// Dummy Pages
const ReportsPage = () => (
  <div className="p-8 font-bold text-2xl">Trang Báo cáo (Đang phát triển)</div>
);

function App() {
  return (
    // Bọc toàn bộ App trong AuthProvider
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- PUBLIC ROUTES (Không cần đăng nhập) --- */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* --- PRIVATE ROUTES (Phải đăng nhập mới vào được) --- */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/fields" element={<Fields />} />
            <Route path="/crops" element={<CropsPage />} />
            <Route path="/ai-scan" element={<AIScan />} />
            <Route path="/ask-ai" element={<AIChat />} />
          </Route>

          {/* --- ADMIN ROUTES --- */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/seasons" element={<AdminSeasons />} />
            <Route path="/admin/tasks" element={<AdminTasks />} />
          </Route>

          {/* Mặc định chuyển về Login nếu sai đường dẫn */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
