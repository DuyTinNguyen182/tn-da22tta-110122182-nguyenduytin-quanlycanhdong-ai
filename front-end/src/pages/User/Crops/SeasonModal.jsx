import React, { useMemo } from "react";
import { Calendar, Leaf, X } from "lucide-react";
import CustomDropdown from "./CustomDropdown";
import CustomCheckbox from "./CustomCheckbox";

const SeasonModal = ({
  isOpen,
  seasonForm,
  seasonCatalogs,
  seasonSelectablePlots,
  selectedSeasonCatalog,
  onClose,
  onSave,
  onFormChange,
  onTogglePlot,
}) => {
  if (!isOpen) return null;

  const seasonOptions = useMemo(
    () => [
      { value: "", label: "-- Chọn mùa vụ --" },
      ...seasonCatalogs.map((s) => ({ value: s._id, label: s.name })),
    ],
    [seasonCatalogs]
  );

  const selectedCount = seasonForm.plotIds?.length || 0;
  const totalCount = seasonSelectablePlots.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-dropdown-enter">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-white/15 p-1.5">
              <Leaf size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {seasonForm.editingSeasonId ? "Chỉnh sửa vụ mùa" : "Bắt đầu vụ mới"}
              </h3>
              <p className="mt-0.5 text-xs text-emerald-200">
                Cấu hình thông tin và chọn thửa tham gia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-emerald-200 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          {/* Season info row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Leaf size={11} className="text-gray-400" />
                Mùa vụ
              </label>
              <CustomDropdown
                value={seasonForm.seasonId}
                onChange={(val) => onFormChange({ seasonId: val })}
                options={seasonOptions}
                placeholder="Chọn mùa vụ"
                className="w-full"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Calendar size={11} className="text-gray-400" />
                Năm vụ
              </label>
              <input
                type="number"
                value={seasonForm.year}
                onChange={(e) => onFormChange({ year: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2 text-sm font-medium outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Calendar size={11} className="text-gray-400" />
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={seasonForm.startDate}
                onChange={(e) => onFormChange({ startDate: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2 text-sm font-medium outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* Season preview */}
          {selectedSeasonCatalog && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 ring-1 ring-emerald-100">
              <Leaf size={14} className="shrink-0 text-emerald-500" />
              <p className="text-xs font-medium text-emerald-700">
                Tên hiển thị:{" "}
                <strong className="text-emerald-800">
                  {selectedSeasonCatalog.name} {seasonForm.year}
                </strong>
              </p>
            </div>
          )}

          {/* Plot selection */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">Chọn thửa tham gia</h4>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                selectedCount > 0
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                  : "bg-gray-50 text-gray-500 ring-gray-200"
              }`}>
                {selectedCount}/{totalCount} thửa
              </span>
            </div>

            <div className="grid max-h-[250px] gap-2 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 sm:grid-cols-2">
              {seasonSelectablePlots.map((plot) => (
                <div
                  key={plot._id}
                  onClick={() => {
                    if (plot.canSelect) onTogglePlot(plot._id);
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                    plot.isSelected
                      ? "border-emerald-300 bg-white shadow-sm shadow-emerald-50"
                      : "border-gray-200 bg-white"
                  } ${
                    plot.canSelect
                      ? "cursor-pointer hover:border-gray-300"
                      : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <CustomCheckbox
                    checked={plot.isSelected}
                    disabled={!plot.canSelect}
                    onChange={() => {
                      if (plot.canSelect) onTogglePlot(plot._id);
                    }}
                  />
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${
                      plot.isSelected ? "text-emerald-700" : "text-gray-700"
                    }`}>
                      {plot.name}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {Number(plot.area || 0).toLocaleString()} m²
                      {plot.status !== "active" && (
                        <span className="ml-1.5 font-semibold text-orange-500">• Tạm ngưng</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-200"
            >
              Hủy
            </button>
            <button
              onClick={onSave}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-lg"
            >
              {seasonForm.editingSeasonId ? "Cập nhật vụ" : "Bắt đầu vụ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonModal;
