import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

const AdminSidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();

  const navItems = [
    { name: "Tổng quan", icon: <LayoutDashboard size={20} />, path: "/admin" },
    { name: "Người dùng", icon: <Users size={20} />, path: "/admin/users" },
    { name: "Mùa vụ", icon: <CalendarDays size={20} />, path: "/admin/seasons" },
    { name: "Công việc", icon: <Briefcase size={20} />, path: "/admin/tasks" },
  ];

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen bg-gray-900 border-r border-gray-800 z-50 flex flex-col transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-gray-800">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="text-white" size={24} />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Admin</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Control Panel</p>
            </div>
          )}
        </Link>
        
        {/* Nút thu gọn Sidebar */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`absolute -right-3 top-8 bg-gray-800 border border-gray-700 rounded-full p-1 text-gray-400 hover:text-white transition-all z-50 ${
            collapsed ? "rotate-180" : ""
          }`}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-8 px-4 flex flex-col gap-2 overflow-y-auto">
        <p className={`text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2 transition-all ${collapsed ? "opacity-0 h-0" : "opacity-100"}`}>
          Quản Lý Hệ Thống
        </p>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative overflow-hidden ${
                isActive 
                  ? "bg-emerald-600 font-medium text-white shadow-md" 
                  : "text-gray-400 hover:bg-gray-800 hover:text-white font-medium"
              }`}
            >
              {item.icon}
              {!collapsed && <span>{item.name}</span>}
              
              {/* Tooltip khi collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
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