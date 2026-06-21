import React from "react";
import { Leaf, MapPinned, RotateCcw, ShieldCheck, Sprout } from "lucide-react";
import CustomDropdown from "../../../../components/UI/CustomDropdown";
import {
  STATUS_FILTER_OPTIONS,
  TIME_FILTER_OPTIONS,
} from "../adminDiseaseMonitoringUtils.jsx";

const DiseaseMonitoringFilterBar = ({
  filters,
  fieldOptions,
  seasonOptions,
  onFilterChange,
  onReset,
}) => (
  <div className="flex flex-wrap gap-3">
    <CustomDropdown
      value={filters.fieldId}
      onChange={(value) => onFilterChange("fieldId", value)}
      options={fieldOptions}
      placeholder="Tất cả cánh đồng"
      icon={MapPinned}
      variant="filter"
      className="min-w-[220px]"
      size="default"
    />

    <CustomDropdown
      value={filters.seasonId}
      onChange={(value) => onFilterChange("seasonId", value)}
      options={seasonOptions}
      placeholder="Chọn mùa vụ"
      icon={Sprout}
      variant="filter"
      className="min-w-[220px]"
      size="default"
    />

    <CustomDropdown
      value={filters.timeRange}
      onChange={(value) => onFilterChange("timeRange", value)}
      options={TIME_FILTER_OPTIONS}
      placeholder="Chọn thời gian"
      icon={Leaf}
      variant="filter"
      className="min-w-[180px]"
      size="default"
    />

    <CustomDropdown
      value={filters.status}
      onChange={(value) => onFilterChange("status", value)}
      options={STATUS_FILTER_OPTIONS}
      placeholder="Tất cả xử lý"
      icon={ShieldCheck}
      variant="filter"
      className="min-w-[190px]"
      size="default"
    />

    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm font-semibold text-gray-600 transition-all hover:border-gray-200 hover:bg-white"
    >
      <RotateCcw size={15} />
    </button>
  </div>
);

export default DiseaseMonitoringFilterBar;
