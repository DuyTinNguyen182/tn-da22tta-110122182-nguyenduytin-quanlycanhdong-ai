import React, { useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useIsMobileLayout from "../../hooks/useIsMobileLayout";
import Header from "./Header";
import MobileBottomNav from "./MobileBottomNav";
import Sidebar from "./Sidebar";

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobileLayout = useIsMobileLayout();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const enableMobileLayout = isMobileLayout && !isAdmin;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (enableMobileLayout && !MOBILE_ALLOWED_PATHS.has(location.pathname)) {
    return <Navigate to="/ai-scan" replace />;
  }

  if (enableMobileLayout) {
    const currentTitle = MOBILE_PAGE_TITLES[location.pathname] || "AgriSmart";

    return (
      <div
        className="min-h-screen bg-slate-50 font-sans text-slate-900"
        style={{
          "--app-top-offset": "calc(64px + env(safe-area-inset-top))",
          "--app-bottom-offset": "calc(80px + env(safe-area-inset-bottom))",
        }}
      >
        <header
          className="sticky top-0 z-40 border-b border-slate-200 bg-white/92 backdrop-blur-xl md:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
                AgriSmart
              </p>
              <h1 className="truncate text-base font-bold text-slate-900">{currentTitle}</h1>
            </div>

            <button
              type="button"
              onClick={() => navigate("/account")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 font-bold text-emerald-700"
              aria-label="Tài khoản"
            >
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
            </button>
          </div>
        </header>

        <main className="min-h-0">
          <Outlet />
        </main>

        <MobileBottomNav />
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
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        <Header />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProtectedLayout;
