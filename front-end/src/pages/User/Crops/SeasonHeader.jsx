import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Filter,
  Layers,
  Plus,
  Sprout,
  X,
} from "lucide-react";
import CustomDropdown from "./CustomDropdown";
import TaskFilterDropdown from "./TaskFilterDropdown";

const getSeasonYear = (season) =>
  season?.year || (season?.startDate ? new Date(season.startDate).getFullYear() : "");

const SeasonHeader = ({
  selectedField,
  sortedSeasons,
  selectedSeasonId,
  currentSeason,
  isSeasonActive,
  seasonAssignedPlots,
  filterPlotId,
  filterTaskId,
  filterPlotOptions,
  taskTypes,
  totalCost,
  onSelectSeason,
  onCreateLog,
  onFilterPlotChange,
  onFilterTaskChange,
  onResetFilters,
}) => {
  const [showPlotPopover, setShowPlotPopover] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowPlotPopover(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowPlotPopover(false);
  }, [selectedSeasonId]);

  const seasonOptions = useMemo(
    () =>
      (sortedSeasons || []).map((season) => ({
        value: season._id,
        label: getSeasonYear(season) ? `${season.name} ${getSeasonYear(season)}` : season.name,
        dot: season.status === "active" ? "bg-emerald-500" : "bg-gray-300",
        badge:
          season.status === "active"
            ? { text: "Đang canh tác", className: "bg-emerald-100 text-emerald-700" }
            : { text: "Kết thúc", className: "bg-gray-100 text-gray-500" },
      })),
    [sortedSeasons]
  );

  const plotFilterOptions = useMemo(
    () => [
      { value: "", label: "Tất cả thửa" },
      ...(filterPlotOptions || []).map((plot) => ({ value: plot._id, label: plot.name })),
    ],
    [filterPlotOptions]
  );

  const taskFilterOptions = useMemo(
    () => [
      { value: "", label: "Tất cả việc" },
      ...(taskTypes || []).map((task) => ({
        value: `task:${task._id}`,
        label: task.name,
        children: (task.taskDetails || []).map((detail) => ({
          value: `task-detail:${detail._id}`,
          label: detail.name,
        })),
      })),
    ],
    [taskTypes]
  );

  if (!selectedField) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 text-gray-400">
        <Sprout size={56} className="mb-3 text-gray-300" />
        <h3 className="text-lg font-bold text-gray-600">Chọn cánh đồng để bắt đầu</h3>
      </div>
    );
  }

  const hasFilters = filterPlotId || filterTaskId;

  return (
    <div className="z-10 border-b border-gray-200 bg-white px-5 py-3 shadow-sm lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-xl font-bold text-gray-800">{selectedField.name}</h1>
          {selectedField.address && (
            <span className="hidden truncate text-xs text-gray-400 lg:block">
              {selectedField.address}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {currentSeason && isSeasonActive && (
            <button
              onClick={onCreateLog}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-lg"
            >
              <Plus size={16} /> Ghi nhật ký
            </button>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {sortedSeasons.length > 0 ? (
          <CustomDropdown
            value={selectedSeasonId}
            onChange={onSelectSeason}
            options={seasonOptions}
            placeholder="Chọn vụ mùa"
            variant={isSeasonActive ? "active" : "default"}
            size="default"
            className="min-w-[200px]"
          />
        ) : (
          <span className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
            Chưa có vụ
          </span>
        )}

        {currentSeason && seasonAssignedPlots.length > 0 && (
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setShowPlotPopover((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                showPlotPopover
                  ? "border-emerald-300 bg-emerald-50 text-emerald-600 ring-2 ring-emerald-100"
                  : "border-gray-200 bg-white text-gray-500 hover:border-emerald-200 hover:text-emerald-600"
              }`}
            >
              <Layers size={13} />
              {seasonAssignedPlots.length} thửa
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${showPlotPopover ? "rotate-180" : ""}`}
              />
            </button>

            {showPlotPopover && (
              <div className="absolute left-0 top-full z-20 mt-1.5 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl shadow-gray-200/50 animate-dropdown-enter">
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Thửa tham gia vụ
                </p>
                <div className="max-h-52 space-y-0.5 overflow-y-auto">
                  {seasonAssignedPlots.map((plot) => (
                    <div
                      key={plot._id}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            plot.status === "active" ? "bg-emerald-400" : "bg-orange-400"
                          }`}
                        />
                        <span className="font-medium text-gray-700">{plot.name}</span>
                      </div>
                      {plot.status !== "active" && (
                        <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                          Tạm ngưng
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentSeason && isSeasonActive && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-bold text-green-600 ring-1 ring-green-100">
            <CheckCircle2 size={12} />
            {currentSeason.loggablePlotCount || 0}/{currentSeason.activePlotCount || 0} sẵn sàng
          </span>
        )}

        <div className="mx-0.5 h-6 w-px bg-gray-200" />

        <CustomDropdown
          value={filterPlotId}
          onChange={onFilterPlotChange}
          options={plotFilterOptions}
          icon={Filter}
          size="small"
          variant="filter"
          className="min-w-[140px]"
        />

        <TaskFilterDropdown
          value={filterTaskId}
          onChange={onFilterTaskChange}
          options={taskFilterOptions}
          className="min-w-[140px]"
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



