import React from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import CustomDropdown from "../../../../components/UI/CustomDropdown";

const TASK_CATEGORY_LABELS = {
  FERTILIZER: "Phân bón",
  PESTICIDE: "Thuốc BVTV",
  WATER: "Nước (Tưới tiêu)",
  LABOR: "Nhân công",
  SEED: "Lúa giống",
  OTHER: "Khác",
};

const TASK_CATEGORY_BADGE_STYLES = {
  FERTILIZER: "bg-amber-50 text-amber-700",
  PESTICIDE: "bg-rose-50 text-rose-700",
  WATER: "bg-sky-50 text-sky-700",
  LABOR: "bg-violet-50 text-violet-700",
  SEED: "bg-emerald-50 text-emerald-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const TaskRow = ({
  task,
  stageOptions,
  taskOptions,
  isEditing,
  editingTaskName,
  editingTaskOrder,
  editingTaskCategory,
  editingTaskIsRepeatable,
  editingTaskStageId,
  editingTaskPrerequisites,
  submitting,
  onStartEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  onEditingTaskNameChange,
  onEditingTaskOrderChange,
  onEditingTaskCategoryChange,
  onEditingTaskIsRepeatableChange,
  onEditingTaskStageIdChange,
  onEditingTaskPrerequisitesChange,
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

  return (
    <tr className="border-t border-gray-100">
      <td className="px-5 py-3">
        {isEditing ? (
          <CustomDropdown
            value={editingTaskStageId}
            onChange={onEditingTaskStageIdChange}
            options={stageOptions}
            placeholder="Chọn giai đoạn"
            size="small"
          />
        ) : (
          <span className="font-medium text-gray-700">{stageName}</span>
        )}
      </td>
      <td className="px-5 py-3">
        {isEditing ? (
          <input
            value={editingTaskName}
            onChange={(e) => onEditingTaskNameChange(e.target.value)}
            placeholder="Tên công việc"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
        ) : (
          <span className="font-semibold text-gray-800">{task.name}</span>
        )}
      </td>
      <td className="px-5 py-3">
        {isEditing ? (
          <input
            type="number"
            value={editingTaskOrder}
            onChange={(e) => onEditingTaskOrderChange(Number(e.target.value))}
            placeholder="Thứ tự"
            min="0"
            className="w-20 rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
        ) : (
          <span className="font-semibold text-gray-800">{task.order}</span>
        )}
      </td>
      <td className="px-5 py-3">
        {isEditing ? (
          <CustomDropdown
            value={editingTaskCategory}
            onChange={onEditingTaskCategoryChange}
            options={[
              { value: "FERTILIZER", label: "Phân bón" },
              { value: "PESTICIDE", label: "Thuốc BVTV" },
              { value: "WATER", label: "Nước (Tưới tiêu)" },
              { value: "LABOR", label: "Nhân công" },
              { value: "SEED", label: "Lúa giống" },
              { value: "OTHER", label: "Khác" },
            ]}
            placeholder="Chọn danh mục"
            size="small"
          />
        ) : (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${categoryBadgeClass}`}
          >
            {categoryLabel}
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        {isEditing ? (
          <input
            type="checkbox"
            checked={editingTaskIsRepeatable}
            onChange={(e) => onEditingTaskIsRepeatableChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        ) : (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              task.isRepeatable
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {task.isRepeatable ? "Có" : "Không"}
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        {isEditing ? (
          <CustomDropdown
            value={editingTaskPrerequisites}
            onChange={onEditingTaskPrerequisitesChange}
            options={taskOptions}
            placeholder="Chọn công việc tiên quyết"
            size="small"
            multi={true}
          />
        ) : (
          <span className="font-medium text-gray-700 text-sm">
            {prerequisiteNames || "Không có"}
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <button
                disabled={submitting}
                onClick={() => onUpdate(task._id)}
                className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                title="Lưu"
              >
                <Save size={16} />
              </button>
              <button
                disabled={submitting}
                onClick={onCancelEdit}
                className="rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                title="Hủy"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                disabled={submitting}
                onClick={() => onStartEdit(task)}
                className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                title="Sửa"
              >
                <Pencil size={16} />
              </button>
              <button
                disabled={submitting}
                onClick={() => onDelete(task)}
                className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
                title="Xóa"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default TaskRow;
