import React from "react";
import { LogOut, LogIn } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitleMap = {
    "/dashboard": "Tổng quan nông trại",
    "/fields": "Quản lý cánh đồng",
    "/crops": "Nhật ký mùa vụ",
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
    <header className="h-20 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40 w-full">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Nếu ĐÃ ĐĂNG NHẬP */}
        {user ? (
          <>
            <div 
              onClick={() => navigate("/account")}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ml-1"
            >
              <div className="text-right hidden md:block leading-tight">
                {/* Hiển thị tên thật lấy từ DB */}
                <p className="text-sm font-bold text-gray-800">
                  {user.fullName || "Người dùng"}
                </p>
                <p className="text-[11px] text-gray-500">Chủ hộ canh tác</p>
              </div>

              <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200 text-emerald-700 font-bold">
                {/* Lấy chữ cái đầu của tên làm Avatar */}
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </div>
            </div>

            {/* Nút đăng xuất */}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </>
        ) : (
          /* Nếu CHƯA ĐĂNG NHẬP */
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-gray-600 hover:text-emerald-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95"
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
