import React from "react";
import { X } from "lucide-react";
import CustomDropdown from "../../../../components/UI/CustomDropdown";

const TaskDetailModal = ({
  open,
  editingItem,
  formData,
  onChange,
  onClose,
  onSubmit,
  submitting,
  taskOptions,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="relative border-b border-gray-100 px-6 py-4 pr-14">
          <h2 className="text-xl font-bold text-gray-900">
            {editingItem
              ? "Chỉnh sửa chi tiết công việc"
              : "Thêm chi tiết công việc"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Đóng form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
            <CustomDropdown
              value={formData.taskId}
              onChange={(val) =>
                onChange({ target: { name: "taskId", value: val } })
              }
              options={taskOptions}
              placeholder="Chọn công việc"
            />

            <input
              value={formData.name}
              name="name"
              onChange={onChange}
              placeholder="Ví dụ: Phun thuốc lần 1"
              className="rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all ${
                submitting
                  ? "cursor-not-allowed bg-gray-300"
                  : "bg-emerald-600 shadow-sm hover:bg-emerald-700"
              }`}
            >
              {submitting
                ? "Đang xử lý..."
                : editingItem
                  ? "Cập nhật"
                  : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskDetailModal;
