import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PublicRoute = () => {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();

  // Nếu ĐÃ CÓ user (đã đăng nhập) -> Chuyển hướng thẳng vào Dashboard hoặc Admin
  if (user) {
    if (role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Nếu CHƯA đăng nhập -> Cho phép render các trang bên trong (Landing, Login, Register)
  return <Outlet />;
};

export default PublicRoute;
