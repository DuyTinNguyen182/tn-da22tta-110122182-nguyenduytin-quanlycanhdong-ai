import React from "react";
import { Leaf, MapPinned, ShieldCheck } from "lucide-react";
import CustomDropdown from "../../../../components/UI/CustomDropdown";
import {
  STATUS_FILTER_OPTIONS,
  TIME_FILTER_OPTIONS,
} from "../adminDiseaseMonitoringUtils.jsx";

const DiseaseMonitoringFilterBar = ({
  filters,
  fieldOptions,
  onFilterChange,
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
  </div>
);

export default DiseaseMonitoringFilterBar;
