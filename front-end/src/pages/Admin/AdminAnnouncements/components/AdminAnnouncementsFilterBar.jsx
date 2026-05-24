import React from "react";
import { BellRing, Eye, Plus, Trash2 } from "lucide-react";
import CustomDropdown from "../../../../components/UI/CustomDropdown";
import {
  TYPE_OPTIONS,
  VISIBILITY_OPTIONS,
} from "../adminAnnouncementsUtils.jsx";

const AdminAnnouncementsFilterBar = ({
  filters,
  selectedCount,
  submitting,
  onFilterChange,
  onDeleteSelected,
  onCreate,
}) => (
  <div className="flex flex-wrap gap-3">
    <input
      value={filters.keyword}
      onChange={(event) => onFilterChange("keyword", event.target.value)}
      placeholder="Tìm tiêu đề hoặc nội dung..."
      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
    />

    <CustomDropdown
      value={filters.type}
      onChange={(value) => onFilterChange("type", value)}
      options={TYPE_OPTIONS}
      placeholder="Tất cả loại"
      icon={BellRing}
      variant="filter"
      className="min-w-[180px]"
    />

    <CustomDropdown
      value={filters.visibility}
      onChange={(value) => onFilterChange("visibility", value)}
      options={VISIBILITY_OPTIONS}
      placeholder="Tất cả trạng thái"
      icon={Eye}
      variant="filter"
      className="min-w-[180px]"
    />

    <button
      type="button"
      onClick={onDeleteSelected}
      disabled={selectedCount === 0 || submitting}
      className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Trash2 size={16} />
      Xóa đã chọn
    </button>

    <button
      type="button"
      onClick={onCreate}
      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700"
    >
      <Plus size={16} />
      Thêm mới
    </button>
  </div>
);

export default AdminAnnouncementsFilterBar;
