import React from "react";
import { NavLink } from "react-router-dom";
import { AlertTriangle, Bell, FileText, ScanLine, User } from "lucide-react";
import { useAnnouncements } from "../../context/AnnouncementContext";

const mobileMenuItems = [
  { icon: ScanLine, label: "Quét bệnh", path: "/ai-scan" },
  { icon: Bell, label: "Thông báo", path: "/announcements" },
  { icon: AlertTriangle, label: "Nhật ký", path: "/disease-logs" },
  { icon: FileText, label: "Hỏi AI", path: "/ask-ai" },
  { icon: User, label: "Tài khoản", path: "/account" },
];

const MobileBottomNav = () => {
  const { hasUnread } = useAnnouncements();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-16px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid h-20 max-w-xl grid-cols-5 px-2">
        {mobileMenuItems.map((item) => {
          const isAnnouncementItem = item.path === "/announcements";

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? "text-emerald-700"
                    : "text-slate-400 hover:text-emerald-600"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                      isActive ? "bg-emerald-50 text-emerald-700" : "bg-transparent"
                    }`}
                  >
                    <item.icon size={20} className="stroke-[1.8]" />
                    {isAnnouncementItem && hasUnread ? (
                      <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                    ) : null}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
