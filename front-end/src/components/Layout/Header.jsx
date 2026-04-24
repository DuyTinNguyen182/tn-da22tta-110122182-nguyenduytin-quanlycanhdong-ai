import React from "react";
import { LogIn, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitleMap = {
    "/dashboard": "Tổng quan diện tích canh tác",
    "/fields": "Thửa ruộng của tôi",
    "/crops": "Nhật ký mùa vụ",
    "/disease-logs": "Nhật ký bệnh",
    "/season-recommendations": "Khuyến nghị mùa vụ",
    "/ai-scan": "AI chẩn đoán bệnh lúa",
    "/ask-ai": "AI tư vấn canh tác",
    "/account": "Tài khoản cá nhân",
  };

  const pageTitle = pageTitleMap[location.pathname] || "Nông nghiệp số";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b border-gray-200 bg-white/90 px-8 backdrop-blur-sm">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold text-gray-900 md:text-xl">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div
              onClick={() => navigate("/account")}
              className="ml-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
            >
              <div className="hidden text-right leading-tight md:block">
                <p className="text-sm font-bold text-gray-800">{user.fullName || "Người dùng"}</p>
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

            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
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
