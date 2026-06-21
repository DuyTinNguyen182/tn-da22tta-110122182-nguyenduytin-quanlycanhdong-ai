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
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      <AdminSidebar
        collapsed={isSidebarCollapsed}
        setCollapsed={setIsSidebarCollapsed}
      />

      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300
        ${isSidebarCollapsed ? "ml-20" : "ml-64"}`}
      >
        <AdminHeader />

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
