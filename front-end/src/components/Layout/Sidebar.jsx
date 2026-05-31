import React from "react";
import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  BookText,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  Map,
  ScanLine,
  Sprout,
} from "lucide-react";
import { useAnnouncements } from "../../context/AnnouncementContext";

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { unreadCount, hasUnread } = useAnnouncements();
  const menuItems = [
    { icon: LayoutDashboard, label: "Tổng quan", path: "/dashboard" },
    { icon: Map, label: "Thửa ruộng của tôi", path: "/fields" },
    { icon: Sprout, label: "Nhật ký canh tác", path: "/crops" },
    { icon: AlertTriangle, label: "Nhật ký bệnh", path: "/disease-logs" },
    { icon: ScanLine, label: "AI dự đoán", path: "/ai-scan" },
    { icon: FileText, label: "AI tư vấn", path: "/ask-ai" },
    { icon: Bell, label: "Thông báo & cảnh báo", path: "/announcements" },
    {
      icon: BookText,
      label: "Khuyến nghị mùa vụ",
      path: "/season-recommendations",
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex h-20 flex-shrink-0 items-center border-b border-gray-100 px-6">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden">
          <img
            src="/Logo_AgriSmart.png"
            alt="AgriSmart Logo"
            className="h-full w-full object-contain"
          />
        </div>

        {!collapsed && (
          <div className="ml-3 flex flex-col overflow-hidden">
            <h3 className="whitespace-nowrap text-xl font-bold text-gray-800">
              AgriSmart
            </h3>
            <p className="whitespace-nowrap text-xs text-gray-500">
              Nông nghiệp thông minh
            </p>
          </div>
        )}
      </div>

      <nav className="relative flex-1 space-y-2 px-3 py-6">
        <p
          className={`mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 transition-all duration-300 ${
            collapsed ? "h-0 overflow-hidden opacity-0" : "h-auto opacity-100"
          }`}
        >
          Menu chính
        </p>

        {menuItems.map((item) => {
          const isAnnouncementItem = item.path === "/announcements";

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group relative flex items-center rounded-xl px-3 py-3 transition-all ${
                  collapsed ? "justify-center" : "justify-between"
                } ${
                  isActive
                    ? "bg-emerald-50 font-semibold text-emerald-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-emerald-600"
                }`
              }
            >
              <div className="flex items-center">
                <div className="relative">
                  <item.icon size={20} className="stroke-[1.5]" />
                  {collapsed && isAnnouncementItem && hasUnread ? (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  ) : null}
                </div>
                {!collapsed && (
                  <span className="ml-3 whitespace-nowrap text-sm">
                    {item.label}
                  </span>
                )}
              </div>

              {!collapsed && isAnnouncementItem && hasUnread ? (
                <span className="ml-3 inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}

              {collapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 z-[100] ml-4 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  {item.label}
                  <div className="absolute -left-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-gray-800"></div>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="flex-shrink-0 border-t border-gray-100 p-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
        >
          <ChevronLeft
            size={20}
            className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
