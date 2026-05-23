import React, { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

const AdminLayout = () => {
  const { user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const role = (user?.role || "").toLowerCase();

  // Nếu chưa có user -> Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có user mà không phải admin -> Về page user
  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex bg-gray-50 min-h-screen font-sans text-gray-900">
      <AdminSidebar
        collapsed={isSidebarCollapsed}
        setCollapsed={setIsSidebarCollapsed}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 h-screen
        ${isSidebarCollapsed ? "ml-20" : "ml-64"}`}
      >
        <AdminHeader />

        {/* Đổi overflow-hidden thành overflow-y-auto để phần content có thể scroll độc lập */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
