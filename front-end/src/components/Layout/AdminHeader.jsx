import React from "react";
import { LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const pageTitleMap = {
  "/admin": "Tổng quan",
  "/admin/fields": "Quản lý cánh đồng",
  "/admin/users": "Quản lý người dùng",
  "/admin/seasons": "Quản lý mùa vụ",
  "/admin/tasks": "Quản lý công việc",
};

const AdminHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = pageTitleMap[location.pathname] || "Quản trị hệ thống";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-8 sticky top-0 z-40 w-full text-white">
      <h2 className="text-lg font-semibold text-white truncate">{pageTitle}</h2>

      {user ? (
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 text-sm font-semibold text-white">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : "A"}
            </div>
            <span className="text-sm font-medium text-gray-300">
              {user.fullName || "Quản trị viên"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      ) : null}
    </header>
  );
};

export default AdminHeader;