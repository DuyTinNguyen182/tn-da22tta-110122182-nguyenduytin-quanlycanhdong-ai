import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Briefcase,
  ChevronLeft,
  LayoutDashboard,
  Map,
  ShieldCheck,
  Users,
  CalendarDays,
} from "lucide-react";

const AdminSidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();

  const navItems = [
    { name: "Tổng quan", icon: <LayoutDashboard size={20} />, path: "/admin" },
    { name: "Cánh đồng", icon: <Map size={20} />, path: "/admin/fields" },
    { name: "Người dùng", icon: <Users size={20} />, path: "/admin/users" },
    { name: "Mùa vụ", icon: <CalendarDays size={20} />, path: "/admin/seasons" },
    { name: "Công việc", icon: <Briefcase size={20} />, path: "/admin/tasks" },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-800 bg-gray-900 transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex h-20 items-center justify-between border-b border-gray-800 px-6">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-lg">
            <ShieldCheck className="text-white" size={24} />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Admin</h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Hop tac xa
              </p>
            </div>
          )}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`absolute -right-3 top-8 z-50 rounded-full border border-gray-700 bg-gray-800 p-1 text-gray-400 transition-all hover:text-white ${
            collapsed ? "rotate-180" : ""
          }`}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-8">
        <p
          className={`mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 transition-all ${
            collapsed ? "h-0 opacity-0" : "opacity-100"
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
              className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-3 transition-all ${
                isActive
                  ? "bg-emerald-600 font-medium text-white shadow-md"
                  : "font-medium text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {item.icon}
              {!collapsed && <span>{item.name}</span>}

              {collapsed && (
                <div className="absolute left-full z-50 ml-4 whitespace-nowrap rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
