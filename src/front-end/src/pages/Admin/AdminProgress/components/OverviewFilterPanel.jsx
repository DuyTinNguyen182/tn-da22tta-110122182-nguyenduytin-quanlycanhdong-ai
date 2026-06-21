import React from "react";
import {
  Briefcase,
  CalendarDays,
  Filter,
  Map as MapIcon,
  RefreshCw,
  ShieldAlert,
  Layers3,
  Sprout,
} from "lucide-react";
import CustomDropdown from "../../../../components/UI/CustomDropdown";

const OverviewFilterPanel = ({
  refreshing,
  onRefresh,
  onReset,
  onApply,
  canApplyFilters,
  filterForm,
  setFilterForm,
  fieldOptions,
  stageOptions,
  seasonOptions,
  yearOptions,
  taskOptions,
  statusOptions,
  onStageChange,
  onTaskChange,
}) => {
  return (
    <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xl font-bold uppercase tracking-[0.1em] text-emerald-700">
            <Filter size={18} />
            Bộ lọc thống kê
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Làm mới
          </button>

          <button
            type="button"
            onClick={onReset}
            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-amber-200 hover:text-amber-700"
          >
            Đặt lại
          </button>

          <button
            type="button"
            onClick={onApply}
            disabled={!canApplyFilters}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            <Filter size={16} />
            Áp dụng
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6 2xl:grid-cols-6">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
            Cánh đồng
          </p>
          <CustomDropdown
            value={filterForm.fieldId}
            onChange={(value) =>
              setFilterForm((prev) => ({ ...prev, fieldId: value }))
            }
            options={fieldOptions}
            placeholder="Chọn cánh đồng"
            icon={MapIcon}
            variant="filter"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
            Mùa vụ
          </p>
          <CustomDropdown
            value={filterForm.seasonId}
            onChange={(value) =>
              setFilterForm((prev) => ({ ...prev, seasonId: value }))
            }
            options={seasonOptions}
            placeholder="Chọn mùa vụ"
            icon={Sprout}
            variant="filter"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
            Năm
          </p>
          <CustomDropdown
            value={filterForm.year}
            onChange={(value) =>
              setFilterForm((prev) => ({ ...prev, year: value }))
            }
            options={yearOptions}
            placeholder="Chọn năm"
            icon={CalendarDays}
            variant="filter"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
            Giai đoạn
          </p>
          <CustomDropdown
            value={filterForm.stageId}
            onChange={onStageChange}
            options={stageOptions}
            placeholder="Chọn giai đoạn"
            icon={Layers3}
            variant="filter"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
            Công việc
          </p>
          <CustomDropdown
            value={filterForm.taskId}
            onChange={onTaskChange}
            options={taskOptions}
            placeholder="Chọn công việc"
            icon={Briefcase}
            disabled={!filterForm.stageId}
            variant="filter"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
            Trạng thái
          </p>
          <CustomDropdown
            value={filterForm.status}
            onChange={(value) =>
              setFilterForm((prev) => ({ ...prev, status: value }))
            }
            options={statusOptions}
            placeholder="Chọn trạng thái"
            icon={ShieldAlert}
            variant="filter"
          />
        </div>
      </div>
    </section>
  );
};

export default OverviewFilterPanel;
