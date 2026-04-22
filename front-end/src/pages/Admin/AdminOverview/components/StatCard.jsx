import React from "react";

const StatCard = ({ title, value, subtitle, icon, tone = "emerald" }) => {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {subtitle ? <p className="mt-1.5 text-xs text-gray-400">{subtitle}</p> : null}
        </div>
        <div className={`rounded-xl p-2.5 ${tones[tone] || tones.emerald}`}>{icon}</div>
      </div>
    </div>
  );
};

export default StatCard;
