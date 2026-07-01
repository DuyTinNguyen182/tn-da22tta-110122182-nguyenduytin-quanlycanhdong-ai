import React from "react";
import { X } from "lucide-react";

const FieldModal = ({
  open,
  editingField,
  fieldForm,
  submitting,
  errors = {},
  onChange,
  onClose,
  onSave,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-800">
          {editingField ? "Chỉnh sửa cánh đồng" : "Thêm cánh đồng mới"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Đóng form"
        >
          <X size={18} />
        </button>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tên cánh đồng
            </label>
            <input
              type="text"
              value={fieldForm.name}
              onChange={(event) => onChange({ name: event.target.value })}
              maxLength={100}
              disabled={submitting}
              required
              aria-invalid={Boolean(errors.name)}
              className={`w-full rounded-xl border px-4 py-2.5 outline-none transition-all focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 ${
                errors.name
                  ? "border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-gray-200 bg-gray-50 focus:border-emerald-500 focus:ring-emerald-500/20"
              }`}
              placeholder="Ví dụ: Cánh đồng Mỹ Tho"
              autoFocus
            />
            {errors.name ? (
              <p className="mt-1 text-xs font-medium text-rose-600">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Địa bàn / địa chỉ mô tả
            </label>
            <textarea
              rows={3}
              value={fieldForm.address}
              onChange={(event) => onChange({ address: event.target.value })}
              maxLength={255}
              disabled={submitting}
              aria-invalid={Boolean(errors.address)}
              className={`w-full resize-none rounded-xl border px-4 py-2.5 outline-none transition-all focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 ${
                errors.address
                  ? "border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-gray-200 bg-gray-50 focus:border-emerald-500 focus:ring-emerald-500/20"
              }`}
              placeholder="Ví dụ: Ấp 2, xã Mỹ Tho, Tiền Giang"
            />
            {errors.address ? (
              <p className="mt-1 text-xs font-medium text-rose-600">
                {errors.address}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl bg-gray-200 px-4 py-2.5 font-medium text-gray-800 transition-all hover:bg-gray-300"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={submitting}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white transition-all hover:bg-emerald-700"
          >
            {editingField ? "Cập nhật" : "Tạo mới"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldModal;
