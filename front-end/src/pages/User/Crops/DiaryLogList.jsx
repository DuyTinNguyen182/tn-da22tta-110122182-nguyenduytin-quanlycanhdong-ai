import React from "react";
import { Calendar, Edit2, Layers, Plus, Sprout, Trash2, BookOpen } from "lucide-react";
import LoadingScreen from "../../../components/Layout/LoadingScreen";

const getLogPlots = (log) => {
  if (Array.isArray(log?.plots) && log.plots.length > 0) {
    return log.plots.filter(Boolean);
  }
  if (log?.plot) {
    return [log.plot];
  }
  return [];
};

const getLogScopeLabel = (log) => {
  if (log?.scope === "all_plots") {
    return "Tất cả thửa";
  }
  const plots = getLogPlots(log);
  if (plots.length <= 1) {
    return plots[0]?.name || "Một thửa";
  }
  return `${plots.length} thửa`;
};

const DiaryLogList = ({
  loading,
  currentSeason,
  isSeasonActive,
  filteredLogs,
  totalLogs,
  onCreateLog,
  onEditLog,
  onDeleteLog,
}) => {
  if (loading) {
    return <LoadingScreen message="Đang tải dữ liệu mùa vụ..." />;
  }

  if (!currentSeason) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
        <div className="mb-4 rounded-2xl bg-gray-100 p-5">
          <Sprout size={40} className="text-gray-300" />
        </div>
        <p className="font-semibold text-gray-600">Chưa có vụ nào.</p>
        <p className="mt-1.5 max-w-xs text-sm">
          Hãy bắt đầu một vụ mới để ghi nhật ký canh tác.
        </p>
      </div>
    );
  }

  if (filteredLogs.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-center">
        <div className="mb-3 rounded-xl bg-gray-100 p-3">
          <BookOpen size={24} className="text-gray-300" />
        </div>
        <p className="font-medium text-gray-500">
          {totalLogs === 0
            ? "Chưa có nhật ký nào cho vụ này."
            : "Không tìm thấy nhật ký phù hợp."}
        </p>
        {isSeasonActive && totalLogs === 0 && (
          <button
            onClick={onCreateLog}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 ring-1 ring-emerald-100 transition-all hover:bg-emerald-100"
          >
            <Plus size={15} /> Ghi nhật ký đầu tiên
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredLogs.map((log, index) => {
        const logPlots = getLogPlots(log);
        const cost = Number(log.cost || 0);
        return (
          <div key={log._id} className="group relative pl-7">
            {/* Timeline connector */}
            {index !== filteredLogs.length - 1 && (
              <div className="absolute bottom-[-12px] left-[10px] top-7 w-[2px] bg-gradient-to-b from-emerald-200 to-gray-200" />
            )}

            {/* Timeline dot */}
            <div className="absolute left-0 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-emerald-200">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>

            {/* Log card */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md">
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: task name + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">                      
                      {log.taskDetailName && (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                          {log.taskName}
                        </span>
                      )}
                      <h3 className="truncate text-sm font-bold text-gray-800">{log.title || log.taskName}</h3>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(log.date).toLocaleDateString("vi-VN")}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-500">
                        <Layers size={11} />
                        {getLogScopeLabel(log)}
                      </span>
                    </div>
                  </div>

                  {/* Right: cost + actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    {cost > 0 && (
                      <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-sm font-bold text-gray-700 ring-1 ring-gray-100">
                        {cost.toLocaleString()}
                        <span className="ml-0.5 text-[10px] font-normal text-gray-400">đ</span>
                      </span>
                    )}
                    {isSeasonActive && (
                      <div className="flex gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <button
                          onClick={() => onEditLog(log)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="Sửa"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteLog(log._id)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {log.description && (
                  <p className="mt-2.5 rounded-lg bg-gray-50/80 p-2.5 text-sm leading-relaxed text-gray-600 ring-1 ring-gray-100">
                    {log.description}
                  </p>
                )}

                {/* Plot tags — only show if NOT "all_plots" scope and has multiple */}
                {log.scope !== "all_plots" && logPlots.length > 1 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {logPlots.map((plot) => (
                      <span
                        key={plot?._id || plot}
                        className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 ring-1 ring-emerald-100"
                      >
                        {plot?.name || "Thửa"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DiaryLogList;
