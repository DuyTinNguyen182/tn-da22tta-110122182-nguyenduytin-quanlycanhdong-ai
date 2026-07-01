import React from "react";
import { CalendarDays, X } from "lucide-react";
import CustomDropdown from "../../../../components/UI/CustomDropdown";

const SeasonDetailFormModal = ({
  open,
  editingDetail,
  catalogSeasons,
  yearOptions,
  formData,
  errors = {},
  submitting,
  onChange,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(editingDetail);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="relative border-b border-gray-100 px-6 py-4 pr-14">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing
              ? "Chỉnh sửa chi tiết mùa vụ"
              : "Thêm chi tiết mùa vụ mới"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isEditing
              ? "Cập nhật năm và mốc thời gian của chi tiết mùa vụ."
              : "Chọn mùa vụ và nhập mốc thời gian để tạo chi tiết mùa vụ mới."}
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Danh mục mùa vụ
              </label>
              {isEditing ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
                  {editingDetail?.season?.name || "Không xác định"}
                </div>
              ) : (
                <CustomDropdown
                  value={formData.seasonId}
                  onChange={(value) => onChange("seasonId", value)}
                  options={catalogSeasons.map((cat) => ({
                    value: cat._id,
                    label: cat.name,
                  }))}
                  placeholder="Chọn mùa vụ"
                  aria-invalid={Boolean(errors.seasonId)}
                />
              )}
              {errors.seasonId ? (
                <p className="text-xs font-medium text-rose-600">
                  {errors.seasonId}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Năm
              </label>
              <CustomDropdown
                value={formData.year}
                onChange={(value) => onChange("year", value)}
                options={yearOptions.map((optionYear) => ({
                  value: optionYear,
                  label: optionYear,
                }))}
                placeholder="Chọn năm"
                icon={CalendarDays}
                variant="filter"
                disabled={isEditing}
                aria-invalid={Boolean(errors.year)}
              />
              {errors.year ? (
                <p className="text-xs font-medium text-rose-600">
                  {errors.year}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(event) => onChange("startDate", event.target.value)}
                disabled={submitting}
                aria-invalid={Boolean(errors.startDate)}
                className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:border-emerald-500 ${
                  errors.startDate ? "border-rose-300" : "border-gray-200"
                }`}
              />
              {errors.startDate ? (
                <p className="text-xs font-medium text-rose-600">
                  {errors.startDate}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Ngày kết thúc (Tùy chọn)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(event) => onChange("endDate", event.target.value)}
                disabled={submitting}
                aria-invalid={Boolean(errors.endDate)}
                className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:border-emerald-500 ${
                  errors.endDate ? "border-rose-300" : "border-gray-200"
                }`}
              />
              {errors.endDate ? (
                <p className="text-xs font-medium text-rose-600">
                  {errors.endDate}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
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

export default SeasonDetailFormModal;
