import React, { useEffect, useState } from "react";
import { DollarSign, Calendar, X, FileText, MapPin } from "lucide-react";
import CustomCheckbox from "./CustomCheckbox";
import CustomDropdown from "./CustomDropdown";

const FarmingLogModal = ({
  isOpen,
  editingLog,
  logForm,
  taskGroups,
  seasonLoggablePlots,
  onClose,
  onSave,
  onTaskChange,
  onFormChange,
  onTogglePlot,
  onSelectAllPlots,
}) => {
  const [selectedGroupValue, setSelectedGroupValue] = useState("");

  // Đồng bộ Giai đoạn khi mở Modal hoặc khi edit
  useEffect(() => {
    if (isOpen && taskGroups.length > 0) {
      if (logForm.task?.stage) {
        const stageId = logForm.task.stage._id || logForm.task.stage;
        setSelectedGroupValue(`stage:${stageId}`);
      } else if (!logForm.task && !selectedGroupValue) {
        setSelectedGroupValue(taskGroups[0]?.value || "");
      }
    }
  }, [isOpen, taskGroups, logForm.task]);

  if (!isOpen) return null;

  const allSelected =
    seasonLoggablePlots.length > 0 &&
    logForm.selectedPlotIds.length === seasonLoggablePlots.length;

  // LOGIC HIỆN BẮT BUỘC: Chỉ true khi ĐÃ CHỌN công việc VÀ công việc đó thuộc Giai đoạn 0
  const isDescriptionRequired =
    logForm.task !== null && Number(logForm.task?.stage?.order || 0) === 0;

  // Lấy danh sách option cho Dropdown Giai đoạn
  const stageOptions = taskGroups.map((g) => ({
    value: g.value,
    label: g.label,
  }));

  // Lấy danh sách option cho Dropdown Công việc
  const activeGroup = taskGroups.find((g) => g.value === selectedGroupValue);
  const taskOptions = (activeGroup?.children || []).map((t) => ({
    value: t.value,
    label: t.label,
  }));

  // Xử lý khi đổi Giai đoạn
  const handleStageChange = (val) => {
    setSelectedGroupValue(val);
    onTaskChange(null); // Đổi giai đoạn thì reset luôn công việc đã chọn
  };

  // Xử lý khi chọn Công việc
  const handleTaskSelect = (val) => {
    const selectedTask = activeGroup?.children.find(
      (t) => t.value === val,
    )?.task;
    onTaskChange(selectedTask || null);
  };

  const getToday = () => new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm transition-opacity">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-dropdown-enter">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-800">
              {editingLog ? "Cập nhật nhật ký" : "Thêm nhật ký mới"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Row 1: Giai đoạn & Công việc (Dùng CustomDropdown) */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Giai đoạn
              </label>
              <CustomDropdown
                value={selectedGroupValue}
                onChange={handleStageChange}
                options={stageOptions}
                placeholder="Chọn giai đoạn"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Công việc
              </label>
              <CustomDropdown
                value={logForm.task ? `task:${logForm.task._id}` : ""}
                onChange={handleTaskSelect}
                options={taskOptions}
                placeholder="-- Chọn công việc --"
              />
            </div>
          </div>

          {/* Row 2: Ngày & Chi phí */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Calendar size={12} /> Ngày thực hiện
              </label>
              <input
                type="date"
                max={getToday()}
                value={logForm.date}
                onChange={(e) => onFormChange({ date: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                <DollarSign size={12} /> Tổng chi phí
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={logForm.cost}
                  onChange={(e) => onFormChange({ cost: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm font-bold text-emerald-700 outline-none transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="0"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                  đ
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Ghi chú (Đã bọc logic render Bắt buộc) */}
          <div className="mb-5">
            <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
              <span className="flex items-center gap-1.5">
                <FileText size={12} /> Ghi chú công việc
              </span>
              {isDescriptionRequired ? (
                <span className="text-red-500">* Bắt buộc nhập</span>
              ) : (
                <span className="text-gray-400 font-normal normal-case">
                  (Không bắt buộc)
                </span>
              )}
            </label>
            <textarea
              rows={2}
              value={logForm.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              required={isDescriptionRequired}
              className={`w-full resize-none rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition-all focus:ring-1 ${
                isDescriptionRequired
                  ? "border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                  : "border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              }`}
              placeholder={
                isDescriptionRequired
                  ? "Ví dụ: Mua thuốc Toxbait rải ốc..."
                  : "Nhập chi tiết công việc nếu có..."
              }
            />
          </div>

          {/* Row 4: Áp dụng cho thửa */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-600">
                <MapPin size={12} className="text-gray-400" /> Áp dụng cho thửa
              </label>
              <button
                type="button"
                onClick={onSelectAllPlots}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>

            <div className="grid max-h-32 gap-2 overflow-y-auto sm:grid-cols-2">
              {seasonLoggablePlots.map((plot) => {
                const checked = logForm.selectedPlotIds.includes(plot._id);
                return (
                  <label
                    key={plot._id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-all ${
                      checked
                        ? "border-emerald-400 bg-emerald-50/50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <CustomCheckbox
                      checked={checked}
                      onChange={() => onTogglePlot(plot._id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-semibold ${checked ? "text-emerald-800" : "text-gray-700"}`}
                      >
                        {plot.name}
                      </p>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400">
                      {Number(plot.area || 0).toLocaleString()} m²
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 bg-gray-50 px-5 py-3.5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-100"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onSave}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700"
          >
            {editingLog ? "Lưu thay đổi" : "Lưu nhật ký"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FarmingLogModal;
