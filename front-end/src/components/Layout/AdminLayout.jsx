import React, { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

const AdminLayout = () => {
  const { user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Nếu chưa có user -> Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có user mà không phải admin -> Về page user
  if (user.role !== "admin") {
      return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex bg-gray-50 min-h-screen font-sans text-gray-900">
      <AdminSidebar collapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />

      <div 
        className={`flex-1 flex flex-col transition-all duration-300 
        ${isSidebarCollapsed ? "ml-20" : "ml-64"}`}
      >
        <AdminHeader />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;