import React from "react";
import { Bell, Search, User, LogOut, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="h-20 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40 w-full">
      {/* Search Bar */}
      <div className="flex items-center bg-gray-100/80 px-4 py-2.5 rounded-xl w-96 border border-transparent focus-within:border-emerald-200 focus-within:bg-white transition-all">
        <Search size={18} className="text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Tìm kiếm thửa ruộng, giống lúa..."
          className="bg-transparent border-none outline-none text-sm text-gray-700 w-full placeholder-gray-400"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Nếu ĐÃ ĐĂNG NHẬP */}
        {user ? (
          <>
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 h-8">
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

              {/* Nút đăng xuất nhỏ */}
              <button
                onClick={handleLogout}
                className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </button>
            </div>
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
