import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  BookText,
  Briefcase,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  LayoutDashboard,
  ListChecks,
  Map,
  ShieldCheck,
  Users,
} from "lucide-react";

const AdminSidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();

  const navItems = [
    { name: "Thống kê", icon: LayoutDashboard, path: "/admin" },
    { name: "Cánh đồng", icon: Map, path: "/admin/fields" },
    { name: "Người dùng", icon: Users, path: "/admin/users" },
    { name: "Mùa vụ gốc", icon: CalendarDays, path: "/admin/seasons" },
    { name: "Lịch mùa vụ", icon: CalendarRange, path: "/admin/season-details" },
    { name: "Công việc", icon: Briefcase, path: "/admin/tasks" },
    {
      name: "Chi tiết công việc",
      icon: ListChecks,
      path: "/admin/task-details",
    },
    {
      name: "Theo dõi dịch bệnh",
      icon: AlertTriangle,
      path: "/admin/disease-monitoring",
    },
    { name: "Thông báo & cảnh báo", icon: Bell, path: "/admin/announcements" },
    {
      name: "Khuyến nghị mùa vụ",
      icon: BookText,
      path: "/admin/season-recommendations",
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-800 bg-gray-900 transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex h-16 flex-shrink-0 items-center border-b border-gray-800 px-6">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-lg">
            <ShieldCheck className="text-white" size={20} />
          </div>
          {!collapsed && (
            <h1 className="whitespace-nowrap text-lg font-bold tracking-tight text-white">
              Admin
            </h1>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        <p
          className={`mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 transition-all duration-300 ${
            collapsed ? "h-0 overflow-hidden opacity-0" : "h-auto opacity-100"
          }`}
        >
          Quản lý hệ thống
        </p>

        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/admin" && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group relative flex items-center rounded-xl px-3 py-3 transition-all ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-emerald-600 font-medium text-white shadow-md"
                  : "font-medium text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <item.icon size={20} className="stroke-[1.5] flex-shrink-0" />
              {!collapsed && (
                <span className="ml-3 whitespace-nowrap text-sm">
                  {item.name}
                </span>
              )}

              {collapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 z-[100] ml-4 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl transition-all duration-200 group-hover:opacity-100">
                  {item.name}
                  <div className="absolute -left-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-gray-800"></div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex-shrink-0 border-t border-gray-800 p-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
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

export default AdminSidebar;
