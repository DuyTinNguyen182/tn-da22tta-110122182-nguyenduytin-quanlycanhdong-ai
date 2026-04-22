import React from "react";

const StatCard = ({ title, value, unit, icon: Icon, color }) => {
  const colorStyles = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", ring: "ring-violet-100" },
    // fallback for old color names
    orange: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
    purple: { bg: "bg-violet-50", text: "text-violet-600", ring: "ring-violet-100" },
  };

  const c = colorStyles[color] || colorStyles.emerald;

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className={`shrink-0 rounded-xl p-2.5 ring-1 ${c.bg} ${c.text} ${c.ring}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-500">{title}</p>
        <h3 className="mt-0.5 text-xl font-bold text-gray-800">
          {value}
          <span className="ml-1 text-xs font-normal text-gray-400">{unit}</span>
        </h3>
      </div>
    </div>
  );
};

export default StatCard;
