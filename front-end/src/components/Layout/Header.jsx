import React, { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import HeaderOverview from "./HeaderOverview";
import ConfirmLogout from "../Common/ConfirmLogout";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogout, setShowLogout] = useState(false);

  const handleLogoutConfirm = async () => {
    setShowLogout(false);
    await logout();
    navigate("/");
  };

  return (
    <header
      className={`sticky top-0 z-40 flex min-h-20 w-full items-center gap-4 border-b border-gray-200 bg-white/90 px-6 py-2 backdrop-blur-sm md:px-8 } ${location.pathname === "/" ? "hidden" : ""}`}
    >
      <HeaderOverview className="flex-1" />

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div
              onClick={() => navigate("/account")}
              className="ml-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
            >
              <div className="hidden text-right leading-tight md:block">
                <p className="text-sm font-bold text-gray-800">
                  {user.fullName || "Người dùng"}
                </p>
                <p className="text-[11px] text-gray-500">
                  {(user.role || "").toLowerCase() === "admin"
                    ? "Ban quản lý hợp tác xã"
                    : "Nông dân thành viên"}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 font-bold text-emerald-700">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </div>
            </div>

            {/* <>
              <button
                onClick={() => setShowLogout(true)}
                className="ml-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                title="Đăng xuất"
              >
                <LogOut size={16} />
                <span className="hidden md:inline">Đăng xuất</span>
              </button>
              <ConfirmLogout isOpen={showLogout} onClose={() => setShowLogout(false)} onConfirm={handleLogoutConfirm} />
            </> */}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-emerald-600"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95"
            >
              <LogIn size={16} /> Đăng ký ngay
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
