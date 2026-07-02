import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Headset } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAnnouncements } from "../../context/AnnouncementContext";
import useIsMobileLayout from "../../hooks/useIsMobileLayout";
import Header from "./Header";
import MobileBottomNav from "./MobileBottomNav";
import Sidebar from "./Sidebar";

const CONTACT_PHONE = "0794325729";

const MOBILE_ALLOWED_PATHS = new Set([
  "/ai-scan",
  "/announcements",
  "/disease-logs",
  "/ask-ai",
  "/account",
]);

const MOBILE_PAGE_TITLES = {
  "/announcements": "Thông báo",
  "/ai-scan": "AI dự đoán",
  "/disease-logs": "Nhật ký bệnh",
  "/ask-ai": "AI tư vấn",
  "/account": "Tài khoản",
};

const ProtectedLayout = () => {
  const { user } = useAuth();
  const { unreadCount, hasUnread } = useAnnouncements();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileContactOpen, setIsMobileContactOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobileLayout = useIsMobileLayout();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const enableMobileLayout = isMobileLayout && !isAdmin;
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!enableMobileLayout || typeof window === "undefined") {
      setIsKeyboardOpen(false);
      return undefined;
    }

    const visualViewport = window.visualViewport;
    if (!visualViewport) {
      setIsKeyboardOpen(false);
      return undefined;
    }

    const updateKeyboardState = () => {
      const activeElement = document.activeElement;
      const activeTag = activeElement?.tagName?.toLowerCase();
      const isTextField =
        activeTag === "input" ||
        activeTag === "textarea" ||
        Boolean(activeElement?.isContentEditable);
      const viewportGap = window.innerHeight - visualViewport.height;

      setIsKeyboardOpen(isTextField && viewportGap > 120);
    };

    updateKeyboardState();
    visualViewport.addEventListener("resize", updateKeyboardState);
    visualViewport.addEventListener("scroll", updateKeyboardState);
    window.addEventListener("focusin", updateKeyboardState);
    window.addEventListener("focusout", updateKeyboardState);

    return () => {
      visualViewport.removeEventListener("resize", updateKeyboardState);
      visualViewport.removeEventListener("scroll", updateKeyboardState);
      window.removeEventListener("focusin", updateKeyboardState);
      window.removeEventListener("focusout", updateKeyboardState);
    };
  }, [enableMobileLayout]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (enableMobileLayout && !MOBILE_ALLOWED_PATHS.has(location.pathname)) {
    return <Navigate to="/ai-scan" replace />;
  }

  if (enableMobileLayout) {
    const currentTitle = MOBILE_PAGE_TITLES[location.pathname] || "AgriSmart";
    const hideMobileBottomNav = location.pathname === "/ask-ai" && isKeyboardOpen;

    return (
      <div
        className="min-h-screen bg-slate-50 font-sans text-slate-900"
        style={{
          "--app-top-offset": "calc(64px + env(safe-area-inset-top))",
          "--app-bottom-offset": hideMobileBottomNav
            ? "0px"
            : "calc(80px + env(safe-area-inset-bottom))",
        }}
      >
        <header
          className="sticky top-0 z-40 border-b border-slate-200 bg-white/92 backdrop-blur-xl md:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden">
                <img
                  src="/Logo_AgriSmart.png"
                  alt="AgriSmart Logo"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  AgriSmart
                </p>
                <h1 className="truncate text-base font-bold text-slate-900">
                  {currentTitle}
                </h1>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileContactOpen(false);
                  navigate("/announcements");
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
                aria-label="Thông báo và cảnh báo"
              >
                <Bell size={18} />
                {hasUnread ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMobileContactOpen((current) => !current)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
                  aria-expanded={isMobileContactOpen}
                  aria-label="Hỗ trợ"
                >
                  <Headset size={18} />
                </button>

                {isMobileContactOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-72 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xl">
                    <p className="text-sm font-bold text-slate-900">Hỗ trợ</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Mọi thắc mắc xin liên hệ đến ban quản lý hợp tác xã qua
                      số điện thoại{" "}
                      <a
                        href={`tel:${CONTACT_PHONE}`}
                        className="font-bold text-emerald-700"
                      >
                        {CONTACT_PHONE}
                      </a>
                      .
                    </p>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMobileContactOpen(false);
                  navigate("/account");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 font-bold text-emerald-700"
                aria-label="Tài khoản"
              >
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </button>
            </div>
          </div>
        </header>

        <main className="min-h-0">
          <Outlet />
        </main>

        {hideMobileBottomNav ? null : <MobileBottomNav />}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen bg-gray-50 font-sans text-gray-900"
      style={{
        "--app-top-offset": "80px",
        "--app-bottom-offset": "0px",
      }}
    >
      <Sidebar collapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />

      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProtectedLayout;
