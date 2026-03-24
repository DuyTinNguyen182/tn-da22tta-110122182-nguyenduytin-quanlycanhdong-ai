import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  Sprout,
  ScanLine,
  FileText,
  ChevronLeft,
} from "lucide-react";

const Sidebar = ({ collapsed, setCollapsed }) => {
  const menuItems = [
    { icon: LayoutDashboard, label: "Tổng quan", path: "/dashboard" },
    { icon: Map, label: "Quản lý Ruộng", path: "/fields" },
    { icon: Sprout, label: "Nhật ký Mùa vụ", path: "/crops" },
    { icon: ScanLine, label: "AI Chẩn đoán", path: "/ai-scan" },
    { icon: FileText, label: "AI tư vấn", path: "/ask-ai" },
  ];

  return (
    <aside
      className={`h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-20" : "w-64"}
      `}
    >
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-gray-100 flex-shrink-0">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0">
          <Sprout className="text-white" size={24} />
        </div>

        {!collapsed && (
          <div className="ml-3 flex flex-col overflow-hidden">
            <h3 className="text-xl font-bold text-gray-800 whitespace-nowrap">
              AgriSmart
            </h3>
            <p className="text-xs text-gray-500 whitespace-nowrap">
              Nông nghiệp số
            </p>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-6 space-y-2 relative">
        <p
          className={`px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 transition-all duration-300
            ${collapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto"}
          `}
        >
          Menu Chính
        </p>

        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group relative flex items-center rounded-xl px-3 py-3 transition-all
              ${collapsed ? "justify-center" : "justify-between"}
              ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-emerald-600"
              }`
            }
          >
            <div className="flex items-center">
              <item.icon size={20} className="stroke-[1.5]" />
              {!collapsed && (
                <span className="ml-3 text-sm whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </div>

            {/* Tooltip khi collapse */}
            {collapsed && (
              <div
                className="absolute left-full ml-4 top-1/2 -translate-y-1/2
                  bg-gray-800 text-white text-xs font-medium px-3 py-2 rounded-lg
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                  transition-all duration-200 shadow-xl whitespace-nowrap z-[100] pointer-events-none"
              >
                {item.label}
                
                {/* Mũi tên nhỏ bên trái tooltip */}
                <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-0 h-0 border-y-[6px] border-y-transparent border-r-[6px] border-r-gray-800"></div>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer - Toggle */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full px-3 py-2.5
            text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors cursor-pointer"
        >
          <ChevronLeft
            size={20}
            className={`transition-transform duration-300
              ${collapsed ? "rotate-180" : ""}
            `}
          />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;