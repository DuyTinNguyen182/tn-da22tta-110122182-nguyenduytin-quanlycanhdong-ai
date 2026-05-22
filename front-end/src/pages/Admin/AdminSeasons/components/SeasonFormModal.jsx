import React from "react";
import { Plus, Save, X } from "lucide-react";

const SeasonFormModal = ({
  open,
  editingSeason,
  seasonName,
  submitting,
  onChange,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(editingSeason);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="relative border-b border-gray-100 px-6 py-4 pr-14">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? "Chỉnh sửa mùa vụ" : "Thêm mùa vụ mới"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isEditing
              ? "Cập nhật tên mùa vụ rồi lưu lại để thay đổi thông tin."
              : "Nhập tên mùa vụ mới để thêm vào danh mục."}
          </p>

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
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Tên mùa vụ
            </label>
            <input
              type="text"
              value={seasonName}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Ví dụ: Xuân Hè"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
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
                : isEditing
                  ? "Lưu thay đổi"
                  : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SeasonFormModal;
