import React from "react";
import { Pencil, Trash2 } from "lucide-react";

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

const TaskRow = ({
  task,
  stageOptions,
  taskOptions,
  onStartEdit,
  onDelete,
}) => {
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

  // Hàm sinh badge hiển thị trạng thái cấu hình Gợi ý ở chế độ xem (View Mode)
  const renderRecommendationBadge = () => {
    const rec = task.recommendation;
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

  return (
    <tr className="border-t border-gray-100 transition hover:bg-gray-50/50">
      <td className="px-5 py-3">
        <span className="text-sm font-medium text-gray-700">{stageName}</span>
      </td>

      <td className="px-5 py-3">
        <span className="text-sm font-semibold text-gray-800">{task.name}</span>
      </td>

      <td className="px-5 py-3">
        <span className="text-sm font-semibold text-gray-600">
          {task.order}
        </span>
      </td>

      <td className="px-5 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryBadgeClass}`}
        >
          {categoryLabel}
        </span>
      </td>

      <td className="px-5 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${task.isRepeatable ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
        >
          {task.isRepeatable ? "Có" : "Không"}
        </span>
      </td>

      <td className="px-5 py-3">
        <span
          className="block max-w-[150px] truncate text-xs font-medium text-gray-500"
          title={prerequisiteNames}
        >
          {prerequisiteNames || "—"}
        </span>
      </td>

      <td className="px-5 py-3">{renderRecommendationBadge()}</td>

      <td className="px-5 py-3">
        <div className="flex justify-end gap-1.5">
          <button
            onClick={() => onStartEdit(task)}
            className="rounded-lg bg-blue-50 p-1.5 text-blue-700 transition hover:bg-blue-100"
            title="Chỉnh sửa"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(task)}
            className="rounded-lg bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100"
            title="Xóa công việc"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default TaskRow;
