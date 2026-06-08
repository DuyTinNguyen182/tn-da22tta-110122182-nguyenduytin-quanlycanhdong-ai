import React, { useState } from "react";
import { Bell, Headset, LogIn } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAnnouncements } from "../../context/AnnouncementContext";
import HeaderOverview from "./HeaderOverview";

const CONTACT_PHONE = "0794325729";

const Header = () => {
  const { user } = useAuth();
  const { unreadCount, hasUnread } = useAnnouncements();
  const navigate = useNavigate();
  const location = useLocation();

  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <header
      className={`sticky top-0 z-40 flex min-h-20 w-full items-center gap-4 border-b border-gray-200 bg-white/90 px-6 py-2 backdrop-blur-sm md:px-8 ${location.pathname === "/" ? "hidden" : ""}`}
    >
      <HeaderOverview className="flex-1" />

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="flex items-center gap-2">
              <Link
                to="/announcements"
                onClick={() => setIsContactOpen(false)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                aria-label="Thông báo và cảnh báo"
                title="Thông báo và cảnh báo"
              >
                <Bell size={18} />
                {hasUnread ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsContactOpen((current) => !current)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  aria-expanded={isContactOpen}
                  aria-label="Hỗ trợ"
                  title="Hỗ trợ"
                >
                  <Headset size={18} />
                </button>

                {isContactOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-72 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-xl">
                    <p className="text-sm font-bold text-gray-900">
                      Hỗ trợ
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Mọi thắc mắc xin liên hệ đến ban quản lý hợp tác xã qua
                      số điện thoại{" "}
                      <a
                        href={`tel:${CONTACT_PHONE}`}
                        className="font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        {CONTACT_PHONE}
                      </a>
                      .
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div
              onClick={() => {
                setIsContactOpen(false);
                navigate("/account");
              }}
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
