import React from "react";
import { DollarSign, Calendar, X, FileText } from "lucide-react";
import CustomCheckbox from "./CustomCheckbox";

const DiaryLogModal = ({
  isOpen,
  editingLog,
  logForm,
  taskTypes,
  seasonLoggablePlots,
  onClose,
  onSave,
  onFormChange,
  onTogglePlot,
  onSelectAllPlots,
}) => {
  if (!isOpen) return null;

  const allSelected =
    seasonLoggablePlots.length > 0 &&
    logForm.selectedPlotIds.length === seasonLoggablePlots.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-dropdown-enter">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-white">
              {editingLog ? "Cập nhật nhật ký" : "Ghi nhật ký mới"}
            </h3>
            <p className="mt-0.5 text-xs text-emerald-200">
              {editingLog ? "Chỉnh sửa thông tin nhật ký canh tác" : "Thêm ghi chép công việc mới"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-emerald-200 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5">
          {/* Task type selection */}
          <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
            Công việc
          </label>
          <div className="mb-5 flex flex-wrap gap-2">
            {taskTypes.map((task) => {
              const isSelected = logForm.taskType?._id === task._id;
              return (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => onFormChange({ taskType: task })}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100 ring-2 ring-emerald-200"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-600"
                  }`}
                >
                  {task.name}
                </button>
              );
            })}
          </div>

          {/* Date + Cost */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Calendar size={12} className="text-gray-400" />
                Ngày
              </label>
              <input
                type="date"
                value={logForm.date}
                onChange={(e) => onFormChange({ date: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm font-medium outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                <DollarSign size={12} className="text-gray-400" />
                Chi phí
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={logForm.cost}
                  onChange={(e) => onFormChange({ cost: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pl-8 pr-3 text-sm font-medium outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="0"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  ₫
                </span>
              </div>
            </div>
          </div>

          {/* Plot selection */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Áp dụng cho thửa
              </label>
              <button
                type="button"
                onClick={onSelectAllPlots}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              >
                {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>
            <div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 sm:grid-cols-2">
              {seasonLoggablePlots.map((plot) => {
                const checked = logForm.selectedPlotIds.includes(plot._id);
                return (
                  <div
                    key={plot._id}
                    onClick={() => onTogglePlot(plot._id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                      checked
                        ? "border-emerald-300 bg-white shadow-sm shadow-emerald-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <CustomCheckbox
                      checked={checked}
                      onChange={() => onTogglePlot(plot._id)}
                    />
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${checked ? "text-emerald-700" : "text-gray-700"}`}>
                        {plot.name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {Number(plot.area || 0).toLocaleString()} m²
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
              <FileText size={12} className="text-gray-400" />
              Mô tả
            </label>
            <textarea
              rows={2}
              value={logForm.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              placeholder="Chi tiết công việc..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 bg-gray-50/80 px-5 py-3.5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-200"
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-lg"
          >
            {editingLog ? "Lưu thay đổi" : "Tạo nhật ký"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiaryLogModal;
