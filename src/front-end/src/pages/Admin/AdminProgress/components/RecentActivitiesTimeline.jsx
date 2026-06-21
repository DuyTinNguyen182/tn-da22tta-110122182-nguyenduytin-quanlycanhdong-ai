import React from "react";
import {
  Clock,
  Map as MapIcon,
  CheckCircle2,
  User,
  Layers,
  CircleDollarSign,
  ChevronDown,
} from "lucide-react";

const getLogScopeLabel = (scope, plots = []) => {
  if (plots.length === 1) {
    return plots[0]?.name || "Một thửa";
  }
  if (scope === "all_plots") {
    return "Tất cả thửa";
  }
  return `${plots.length} thửa`;
};

const RecentActivitiesTimeline = ({
  activities = [],
  onLoadMore,
  loadingMore,
}) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="mb-3 text-gray-300" size={36} />
        <p className="text-sm font-medium text-gray-500">
          Chưa có hoạt động canh tác nào gần đây.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 text-left">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          Hoạt động canh tác gần đây
        </h3>
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {activities.length} hoạt động
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {activities.map((activity) => {
          const scopeLabel = getLogScopeLabel(activity.scope, activity.plots);

          return (
            <div
              key={activity._id}
              className="group flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-emerald-100 hover:shadow-md"
            >
              <div>
                {/* Dòng 1: Tên công việc & Ngày tháng */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <h4 className="font-bold text-gray-900">
                      {activity.activityName}
                    </h4>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-gray-400">
                    {new Date(activity.date).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* Dòng 2: Phân loại Nông dân & Phạm vi */}
                <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                    <User size={15} className="text-sky-500" />
                    {activity.farmerName}
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-gray-600">
                    <Layers size={15} className="text-amber-500" />
                    {activity.fieldName}
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-gray-600">
                    <MapIcon size={15} className="text-emerald-500" />
                    {scopeLabel}
                  </div>
                </div>

                {/* Ghi chú */}
                {activity.description && (
                  <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm italic leading-relaxed text-gray-600">
                    "{activity.description}"
                  </p>
                )}
              </div>

              {/* Phần Footer của Card: Tags Thửa & Chi phí */}
              <div className="mt-4 border-t border-gray-50 pt-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {activity.plots?.length > 1 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {activity.plots.map((plot) => (
                          <span
                            key={plot._id}
                            className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                          >
                            {plot.name || "Thửa"}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-400">
                      Mùa vụ:{" "}
                      <span className="text-gray-500">
                        {activity.seasonLabel}
                      </span>
                    </p>
                  </div>

                  {/* Chi phí làm nổi bật ở góc dưới cùng */}
                  <div className="shrink-0 rounded-xl bg-amber-50 px-3 py-1.5 font-bold text-amber-700">
                    <div className="flex items-center gap-1.5 text-sm">
                      <CircleDollarSign size={15} />
                      {activity.cost
                        ? `${activity.cost.toLocaleString("vi-VN")} đ`
                        : "0 đ"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nút Load More */}
      {activities.length >= 5 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></span>
            ) : (
              <ChevronDown size={16} />
            )}
            {loadingMore ? "Đang tải thêm..." : "Xem thêm hoạt động cũ hơn"}
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivitiesTimeline;
