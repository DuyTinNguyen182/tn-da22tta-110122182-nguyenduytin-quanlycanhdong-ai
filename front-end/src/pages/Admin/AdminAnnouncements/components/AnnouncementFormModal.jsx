import React from "react";
import { BellRing, Plus, Save, Users, X } from "lucide-react";
import CustomCheckbox from "../../../../components/UI/CustomCheckbox";
import CustomDropdown from "../../../../components/UI/CustomDropdown";
import {
  FORM_TYPE_OPTIONS,
  TARGET_MODE_OPTIONS,
} from "../adminAnnouncementsUtils.jsx";

const AnnouncementFormModal = ({
  open,
  editingId,
  form,
  optionsLoading,
  submitting,
  fieldOptions,
  farmerOptions,
  selectedFieldFarmers,
  onClose,
  onFormChange,
  onTargetModeChange,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {editingId
                ? "Chỉnh sửa thông báo/cảnh báo"
                : "Tạo thông báo/cảnh báo mới"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Hệ thống sẽ gửi qua web và email cho nhóm nông dân bạn chọn.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Loại
              </span>
              <CustomDropdown
                value={form.type}
                onChange={(value) => onFormChange("type", value)}
                options={FORM_TYPE_OPTIONS}
                placeholder="Chọn loại"
                icon={BellRing}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Nhóm người nhận
              </span>
              <CustomDropdown
                value={form.targetMode}
                onChange={onTargetModeChange}
                options={TARGET_MODE_OPTIONS}
                placeholder="Chọn nhóm người nhận"
                icon={Users}
              />
            </label>
          </div>

          {form.targetMode === "field_users" ? (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Cánh đồng nhận thông báo
              </span>
              <CustomDropdown
                value={form.fieldId}
                onChange={(value) => onFormChange("fieldId", value)}
                options={fieldOptions}
                placeholder="Chọn cánh đồng"
                icon={Users}
              />
              <p className="mt-2 text-xs text-gray-500">
                {form.fieldId
                  ? `Sẽ gửi cho ${selectedFieldFarmers.length} nông dân thuộc cánh đồng đã chọn.`
                  : "Chọn một cánh đồng để gửi cho toàn bộ nông dân thuộc cánh đồng đó."}
              </p>
            </label>
          ) : null}

          {form.targetMode === "selected_users" ? (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Chọn nông dân nhận thông báo
              </span>
              <CustomDropdown
                value={form.userIds}
                onChange={(value) => onFormChange("userIds", value)}
                options={farmerOptions}
                placeholder="Chọn một hoặc nhiều nông dân"
                icon={Users}
                multi={true}
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">
              Tên thông báo/cảnh báo
            </span>
            <input
              value={form.title}
              onChange={(event) => onFormChange("title", event.target.value)}
              placeholder="Ví dụ: Cảnh báo sâu bệnh tuần này"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block m-0 py-0">
            <span className="mb-2 block text-sm font-semibold text-gray-700">
              Nội dung
            </span>
            <textarea
              rows={7}
              value={form.content}
              onChange={(event) => onFormChange("content", event.target.value)}
              placeholder="Nhập nội dung chi tiết để hiển thị cho nông dân..."
              className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl bg-gray-50 px-4 py-1">
            <CustomCheckbox
              checked={form.isVisible}
              onChange={() => onFormChange("isVisible", !form.isVisible)}
            />
            <span className="text-sm font-medium text-gray-700">
              Hiển thị ngay cho nông dân sau khi lưu
            </span>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || optionsLoading}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all ${
              submitting || optionsLoading
                ? "cursor-not-allowed bg-gray-300"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {editingId ? <Save size={16} /> : <Plus size={16} />}
            {submitting
              ? "Đang xử lý..."
              : editingId
                ? "Lưu cập nhật"
                : "Tạo và gửi"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementFormModal;
