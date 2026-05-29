import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import LoadingScreen from "../../../../components/Layout/LoadingScreen";
import PaginationControls from "../../../../components/Common/PaginationControls";

const TASK_CATEGORY_LABELS = {
  FERTILIZER: "Phân bón",
  PESTICIDE: "Thuốc BVTV",
  WATER: "Nước (Tưới tiêu)",
  LABOR: "Nhân công",
  SEED: "Lúa giống",
  OTHER: "Khác",
};

const TASK_CATEGORY_BADGE_STYLES = {
  FERTILIZER: "bg-amber-50 text-amber-700 border border-amber-100",
  PESTICIDE: "bg-rose-50 text-rose-700 border border-rose-100",
  WATER: "bg-sky-50 text-sky-700 border border-sky-100",
  LABOR: "bg-violet-50 text-violet-700 border border-violet-100",
  SEED: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  OTHER: "bg-gray-100 text-gray-700 border border-gray-200",
};

const renderRecommendationBadge = (rec) => {
  if (!rec || !rec.isSuggested) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
        Tự do (Không nhắc)
      </span>
    );
  }
  if (rec.isSowingTask) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
        Vạch sạ (Ngày 0)
      </span>
    );
  }
  if (rec.startDay < 0 || rec.endDay < 0) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
        Chuẩn bị trước sạ
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
      Ngày lúa: {rec.startDay} - {rec.endDay}
    </span>
  );
};

const TaskTable = ({
  tasks,
  loading,
  stageOptions,
  taskOptionsForPrerequisites,
  currentPage,
  totalPages,
  totalTasks,
  onPageChange,
  onStartEdit,
  onDelete,
}) => {
  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        {loading ? (
          <LoadingScreen message="Đang tải dữ liệu công việc..." />
        ) : tasks.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-gray-500">
            Chưa có công việc nào thuộc tiêu chí này
          </div>
        ) : (
          <table className="w-full min-w-full table-auto">
            <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500 whitespace-nowrap">
                  Giai đoạn
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500 whitespace-nowrap">
                  Tên công việc
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500 whitespace-nowrap">
                  Thứ tự
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500 whitespace-nowrap">
                  Danh mục
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500 whitespace-nowrap">
                  Lặp lại
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500 whitespace-nowrap">
                  Tiên quyết
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500 min-w-[210px] whitespace-nowrap">
                  Cấu hình nhắc việc
                </th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase text-gray-500 whitespace-nowrap">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => {
                const stageName =
                  stageOptions?.find((s) => s.value === task.stage?._id)?.label ||
                  stageOptions?.find((s) => s.value === task.stage)?.label ||
                  "Chưa xác định";

                const prerequisiteNames = (task.prerequisites || [])
                  .map((p) => p.name || "")
                  .filter(Boolean)
                  .join(", ");

                const categoryLabel = TASK_CATEGORY_LABELS[task.category] || "Khác";
                const categoryBadgeClass =
                  TASK_CATEGORY_BADGE_STYLES[task.category] ||
                  TASK_CATEGORY_BADGE_STYLES.OTHER;

                return (
                  <tr key={task._id} className="transition hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-gray-700">{stageName}</span>
                    </td>

                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold text-gray-800">{task.name}</span>
                    </td>

                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold text-gray-600">{task.order}</span>
                    </td>

                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryBadgeClass}`}>
                        {categoryLabel}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${task.isRepeatable ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {task.isRepeatable ? "Có" : "Không"}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <span className="block max-w-[150px] truncate text-xs font-medium text-gray-500" title={prerequisiteNames}>
                        {prerequisiteNames || "—"}
                      </span>
                    </td>

                    <td className="px-5 py-3">{renderRecommendationBadge(task.recommendation)}</td>

                    <td className="px-5 py-3">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => onStartEdit(task)} className="rounded-lg bg-blue-50 p-1.5 text-blue-700 transition hover:bg-blue-100" title="Chỉnh sửa">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => onDelete(task)} className="rounded-lg bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100" title="Xóa công việc">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && tasks.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-gray-500">
            Hiển thị {tasks.length} công việc trong tổng số {totalTasks} công việc theo bộ lọc hiện tại.
          </p>
          <PaginationControls page={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
};

export default TaskTable;

