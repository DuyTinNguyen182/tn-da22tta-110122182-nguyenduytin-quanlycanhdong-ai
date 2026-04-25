import React from "react";
import { LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const pageTitleMap = {
  "/admin": "Tổng quan",
  "/admin/fields": "Quản lý cánh đồng",
  "/admin/users": "Quản lý người dùng",
  "/admin/seasons": "Quản lý mùa vụ",
  "/admin/season-details": "Lịch mùa vụ",
  "/admin/announcements": "Thông báo và cảnh báo",
  "/admin/season-recommendations": "Khuyến nghị mùa vụ",
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
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-800 bg-gray-900 px-8 text-white">
      <h2 className="truncate text-lg font-semibold text-white">{pageTitle}</h2>

      {user ? (
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-sm font-semibold text-white">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : "A"}
            </div>
            <span className="text-sm font-medium text-gray-300">
              {user.fullName || "Quản trị viên"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-red-400"
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
