import React from "react";

const FieldModal = ({ open, editingField, fieldForm, onChange, onClose, onSave }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-800">
          {editingField ? "Chỉnh sửa cánh đồng" : "Thêm cánh đồng mới"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tên cánh đồng</label>
            <input
              type="text"
              value={fieldForm.name}
              onChange={(event) => onChange({ name: event.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Ví dụ: Cánh đồng Bắc Kênh"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Địa bàn / địa chỉ mô tả
            </label>
            <textarea
              rows={3}
              value={fieldForm.address}
              onChange={(event) => onChange({ address: event.target.value })}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Ví dụ: Ấp 2, xã Mỹ An, khu vực bắc kênh"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-gray-200 px-4 py-2.5 font-medium text-gray-800 transition-all hover:bg-gray-300"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSave}
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
