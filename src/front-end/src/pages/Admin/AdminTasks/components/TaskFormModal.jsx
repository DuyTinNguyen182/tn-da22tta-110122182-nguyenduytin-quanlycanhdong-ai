import React from "react";
import { Briefcase, X } from "lucide-react";
import CustomDropdown from "../../../../components/UI/CustomDropdown";

const TaskFormModal = ({
  open,
  modalMode,
  submitting,
  stageOptions,
  categoryOptions,
  taskOptionsForPrerequisites,
  recTypeOptions,

  // States
  stageId,
  setStageId,
  name,
  setName,
  order,
  setOrder,
  category,
  setCategory,
  isRepeatable,
  setIsRepeatable,
  prerequisites,
  setPrerequisites,
  recType,
  setRecType,
  startDay,
  setStartDay,
  endDay,
  setEndDay,

  // Handlers
  onClose,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-100 bg-white shadow-xl">
        {/* Header Popup */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {modalMode === "edit"
                ? "Chỉnh sửa công việc"
                : "Tạo công việc tiêu chuẩn mới"}
            </h2>
            <p className="text-xs text-gray-500">
              {modalMode === "edit"
                ? "Cập nhật thông tin và cấu hình gợi ý cho công việc đã chọn"
                : "Thiết lập công việc tiêu chuẩn và cấu hình gợi ý công việc"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Popup */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Thuộc giai đoạn vụ mùa
            </label>
            <CustomDropdown
              value={stageId}
              onChange={setStageId}
              options={stageOptions}
              placeholder="Chọn giai đoạn sản xuất"
              icon={Briefcase}
              variant="active"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Tên hạng mục công việc
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              placeholder="Ví dụ: Bón phân đợt 1, Xịt trừ rầy nâu..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Danh mục vật tư/loại đầu vào
            </label>
            <CustomDropdown
              value={category}
              onChange={setCategory}
              options={categoryOptions}
              placeholder="Chọn nhóm danh mục"
              variant="active"
              disabled={submitting}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Thứ tự hiển thị quy trình
              </label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                disabled={submitting}
                min="0"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Lặp lại công việc
              </label>
              <label className="flex h-[46px] cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={isRepeatable}
                  disabled={submitting}
                  onChange={(e) => setIsRepeatable(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">
                  Cho phép lặp lại nhiều lần
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Công việc điều kiện tiên quyết
            </label>
            <CustomDropdown
              value={prerequisites}
              onChange={setPrerequisites}
              options={taskOptionsForPrerequisites}
              placeholder="Chọn các công việc bắt buộc làm trước"
              multi
              variant="active"
              disabled={submitting}
            />
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
            <h3 className="text-sm font-bold text-blue-800">
              Thiết lập tự động gợi ý công việc
            </h3>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Loại mốc thời gian áp dụng
              </label>
              <CustomDropdown
                value={recType}
                onChange={setRecType}
                options={recTypeOptions}
                placeholder="Chọn loại mốc"
                variant="active"
                disabled={submitting}
              />
            </div>

            {recType === "AFTER" && (
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-3 animate-slideDown">
                <span className="text-sm text-gray-600">
                  Khung thời gian vàng: Từ ngày
                </span>
                <input
                  type="number"
                  min="0"
                  value={startDay}
                  onChange={(e) => setStartDay(Number(e.target.value))}
                  disabled={submitting}
                  className="w-16 rounded-lg border border-gray-200 p-1.5 text-sm text-center font-semibold outline-none focus:border-blue-500"
                />
                <span className="text-sm text-gray-600">đến ngày</span>
                <input
                  type="number"
                  min="0"
                  value={endDay}
                  onChange={(e) => setEndDay(Number(e.target.value))}
                  disabled={submitting}
                  className="w-16 rounded-lg border border-gray-200 p-1.5 text-sm text-center font-semibold outline-none focus:border-blue-500"
                />
                <span className="text-sm text-gray-600">sau sạ</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Popup */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 p-4 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {modalMode === "edit" ? "Lưu thay đổi" : "Xác nhận tạo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal;
