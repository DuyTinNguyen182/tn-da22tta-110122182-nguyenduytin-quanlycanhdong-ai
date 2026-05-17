import React, { useMemo } from "react";
import { DollarSign, Filter, Plus, Sprout, X } from "lucide-react";
import CustomDropdown from "./CustomDropdown";
import TaskFilterDropdown from "./TaskFilterDropdown";

const getSeasonYear = (season) =>
  season?.year ||
  (season?.startDate ? new Date(season.startDate).getFullYear() : "");

const SeasonHeader = ({
  selectedField,
  sortedSeasons,
  selectedSeasonId,
  currentSeason,
  isSeasonActive,
  filterPlotId,
  filterTaskId,
  filterPlotOptions,
  taskFilterOptions,
  totalCost,
  onSelectSeason,
  onCreateLog,
  onFilterPlotChange,
  onFilterTaskChange,
  onResetFilters,
}) => {
  const seasonOptions = useMemo(
    () =>
      (sortedSeasons || []).map((season) => ({
        value: season._id,
        label: getSeasonYear(season)
          ? `${season.name} ${getSeasonYear(season)}`
          : season.name,
        dot: season.status === "active" ? "bg-emerald-500" : "bg-gray-300",
        badge:
          season.status === "active"
            ? {
                text: "Đang canh tác",
                className: "bg-emerald-100 text-emerald-700",
              }
            : { text: "Kết thúc", className: "bg-gray-100 text-gray-500" },
      })),
    [sortedSeasons],
  );

  const plotFilterOptions = useMemo(
    () => [
      { value: "", label: "Tất cả thửa" },
      ...(filterPlotOptions || []).map((plot) => ({
        value: plot._id,
        label: plot.name,
      })),
    ],
    [filterPlotOptions],
  );

  if (!selectedField) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 text-gray-400">
        <Sprout size={56} className="mb-3 text-gray-300" />
        <h3 className="text-lg font-bold text-gray-600">
          Chọn cánh đồng để bắt đầu
        </h3>
      </div>
    );
  }

  const hasFilters = filterPlotId || filterTaskId;

  return (
    <div className="z-10 border-b border-gray-200 bg-white px-5 py-4 shadow-sm lg:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-gray-800">
            {selectedField.name}
          </h1>
        </div>

        {currentSeason && isSeasonActive && (
          <button
            onClick={onCreateLog}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-lg"
          >
            <Plus size={16} /> Ghi nhật ký
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {sortedSeasons.length > 0 ? (
          <CustomDropdown
            value={selectedSeasonId}
            onChange={onSelectSeason}
            options={seasonOptions}
            placeholder="Chọn vụ mùa"
            variant={isSeasonActive ? "active" : "default"}
            size="default"
            className="min-w-[220px]"
          />
        ) : (
          <span className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
            Chưa có vụ
          </span>
        )}

        <CustomDropdown
          value={filterPlotId}
          onChange={onFilterPlotChange}
          options={plotFilterOptions}
          icon={Filter}
          size="small"
          variant="filter"
          className="min-w-[150px]"
        />

        <TaskFilterDropdown
          value={filterTaskId}
          onChange={onFilterTaskChange}
          options={taskFilterOptions}
          className="min-w-[150px]"
        />

        {hasFilters && (
          <button
            onClick={onResetFilters}
            className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 hover:shadow-sm"
            title="Xóa bộ lọc"
          >
            <X size={15} />
          </button>
        )}

        <div className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-2 ring-1 ring-emerald-100">
          <DollarSign size={15} className="text-emerald-500" />
          <span className="text-sm font-bold text-emerald-700">
            {totalCost.toLocaleString()} đ
          </span>
        </div>
      </div>
    </div>
  );
};

export default SeasonHeader;
