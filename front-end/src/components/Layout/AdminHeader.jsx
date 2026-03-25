import React from "react";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AdminHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="h-20 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-8 sticky top-0 z-40 w-full text-white">
      <div className="flex items-center">
        <h2 className="text-xl font-bold text-white">Quản trị hệ thống</h2>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3 pl-4 h-8">
            <div className="text-right hidden md:block leading-tight">
              <p className="text-sm font-bold text-white">
                {user.fullName || "Quản trị viên"}
              </p>
              <p className="text-[11px] text-gray-400">Admin</p>
            </div>

            <div className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 text-white font-bold">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : "A"}
            </div>

            <button
              onClick={handleLogout}
              className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-gray-800 rounded-lg transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default AdminHeader;