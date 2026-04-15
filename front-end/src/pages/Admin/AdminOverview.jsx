import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Filter,
  Map,
  RefreshCw,
  Sprout,
  Users,
  Wallet,
  LayoutDashboard,
} from "lucide-react";
import api from "../../services/api";
import LoadingScreen from "../../components/Layout/LoadingScreen";
import CustomDropdown from "../../components/UI/CustomDropdown";

const defaultFilters = {
  seasonId: "",
  year: "",
  fieldId: "",
};

const buildQueryParams = (filters) => {
  const params = {};

  if (filters.seasonId) params.seasonId = filters.seasonId;
  if (filters.year) params.year = filters.year;
  if (filters.fieldId) params.fieldId = filters.fieldId;

  return params;
};

const formatNumber = (value) => Number(value || 0).toLocaleString("vi-VN");
const formatArea = (value) => `${formatNumber(value)} m²`;
const formatCurrency = (value) => `${formatNumber(value)} đ`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString("vi-VN") : "--");

const getStatusMeta = (status) => {
  if (status === "active") {
    return {
      label: "Đang canh tác",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (status === "completed") {
    return {
      label: "Đã kết thúc",
      className: "bg-gray-100 text-gray-700",
    };
  }

  return {
    label: "Dự kiến",
    className: "bg-amber-100 text-amber-700",
  };
};

const StatCard = ({ title, value, subtitle, icon, tone = "emerald" }) => {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {subtitle ? <p className="mt-1.5 text-xs text-gray-400">{subtitle}</p> : null}
        </div>
        <div className={`rounded-xl p-2.5 ${tones[tone] || tones.emerald}`}>{icon}</div>
      </div>
    </div>
  );
};

const SectionCard = ({ title, actions, children }) => (
  <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {actions}
    </div>
    {children}
  </section>
);

const DataTable = ({ columns, rows, emptyText, rowKey }) => {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-top">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-gray-700">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminOverview = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterForm, setFilterForm] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  const fetchOverview = async (filters, { silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await api.get("/admin/overview", {
        params: buildQueryParams(filters),
      });

      setOverview(res.data);
    } catch (error) {
      console.error("Lỗi tải tổng quan admin", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview(appliedFilters);
  }, [appliedFilters]);

  const options = overview?.options || {};
  const systemSummary = overview?.summary?.system || {};
  const seasonalSummary = overview?.summary?.seasonal || {};

  const seasonRows = useMemo(() => (overview?.seasonOverview || []).slice(0, 6), [overview]);
  const fieldRows = useMemo(() => (overview?.fieldOverview || []).slice(0, 6), [overview]);
  const recentActivities = overview?.recentActivities || [];
  const seasonInstances = useMemo(
    () => (overview?.seasonInstances || []).slice(0, 8),
    [overview]
  );

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filterForm });
  };

  const handleResetFilters = () => {
    setFilterForm(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const handleRefresh = () => {
    fetchOverview(appliedFilters, { silent: true });
  };

  if (loading && !overview) {
    return <LoadingScreen fullScreen={true} message="Đang tải dữ liệu tổng quan..." />;
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f4f6f8] p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Tổng quan hợp tác xã
        </h1>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-emerald-200 hover:text-emerald-700"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* Thống kê hệ thống */}
      <SectionCard title="Thống kê hệ thống">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Cánh đồng"
            value={loading ? "--" : formatNumber(systemSummary.fieldCount)}
            subtitle={`${formatNumber(systemSummary.activeSeasonCount)} vụ đang canh tác`}
            icon={<LayoutDashboard size={20} />}
            tone="emerald"
          />
          <StatCard
            title="Nông dân"
            value={loading ? "--" : formatNumber(systemSummary.farmerCount)}
            subtitle={`${formatNumber(systemSummary.completedSeasonCount)} vụ đã kết thúc`}
            icon={<Users size={20} />}
            tone="orange"
          />
          <StatCard
            title="Thửa ruộng"
            value={loading ? "--" : formatNumber(systemSummary.plotCount)}
            subtitle={`${formatNumber(systemSummary.activePlotCount)} thửa đang active`}
            icon={<Sprout size={20} />}
            tone="blue"
          />
          <StatCard
            title="Diện tích"
            value={loading ? "--" : formatArea(systemSummary.totalArea)}
            subtitle={`${formatNumber(systemSummary.inactivePlotCount)} thửa tạm ngưng`}
            icon={<Map size={20} />}
            tone="slate"
          />
        </div>
      </SectionCard>

      {/* Bộ lọc mùa vụ */}
      <div className="mt-6">
        <SectionCard
          title="Bộ lọc mùa vụ"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:border-gray-300"
              >
                Đặt lại
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
              >
                <Filter size={14} />
                Áp dụng
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <CustomDropdown
              value={filterForm.seasonId}
              onChange={(val) => setFilterForm((prev) => ({ ...prev, seasonId: val }))}
              placeholder="Tất cả mùa vụ"
              variant="filter"
              options={[
                { value: "", label: "Tất cả mùa vụ" },
                ...(options.seasons || []).map((item) => ({
                  value: item._id,
                  label: item.name,
                })),
              ]}
            />

            <CustomDropdown
              value={filterForm.year}
              onChange={(val) => setFilterForm((prev) => ({ ...prev, year: val }))}
              placeholder="Tất cả năm"
              variant="filter"
              options={[
                { value: "", label: "Tất cả năm" },
                ...(options.years || []).map((item) => ({
                  value: item,
                  label: String(item),
                })),
              ]}
            />

            <CustomDropdown
              value={filterForm.fieldId}
              onChange={(val) => setFilterForm((prev) => ({ ...prev, fieldId: val }))}
              placeholder="Tất cả cánh đồng"
              variant="filter"
              options={[
                { value: "", label: "Tất cả cánh đồng" },
                ...(options.fields || []).map((item) => ({
                  value: item._id,
                  label: item.name,
                })),
              ]}
            />
          </div>
        </SectionCard>
      </div>

      {/* Thống kê mùa vụ - giảm từ 8 xuống 4 */}
      <div className="mt-6">
        <SectionCard title="Thống kê theo mùa vụ">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Đợt mùa vụ"
              value={loading ? "--" : formatNumber(seasonalSummary.seasonInstanceCount)}
              subtitle={`${formatNumber(seasonalSummary.activeSeasonCount)} đang canh tác`}
              icon={<CalendarDays size={20} />}
              tone="emerald"
            />
            <StatCard
              title="Nông dân tham gia"
              value={loading ? "--" : formatNumber(seasonalSummary.participatingFarmerCount)}
              subtitle={`${formatNumber(seasonalSummary.participatingFieldCount)} cánh đồng`}
              icon={<Users size={20} />}
              tone="orange"
            />
            <StatCard
              title="Thửa tham gia"
              value={loading ? "--" : formatNumber(seasonalSummary.assignedPlotCount)}
              subtitle={formatArea(seasonalSummary.assignedArea)}
              icon={<Sprout size={20} />}
              tone="blue"
            />
            <StatCard
              title="Chi phí ghi nhận"
              value={loading ? "--" : formatCurrency(seasonalSummary.totalCost)}
              subtitle={`${formatNumber(seasonalSummary.diaryLogCount)} nhật ký`}
              icon={<Wallet size={20} />}
              tone="slate"
            />
          </div>
        </SectionCard>
      </div>

      {/* Bảng: Mùa vụ + Nhật ký gần đây */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Tổng hợp theo mùa vụ">
          <DataTable
            rowKey={(row) => `${row.seasonId}-${row.year}`}
            emptyText="Chưa có dữ liệu mùa vụ."
            columns={[
              {
                key: "seasonLabel",
                label: "Mùa vụ",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-gray-900">{row.seasonLabel}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {row.activeSeasonCount} active · {row.completedSeasonCount} done
                    </p>
                  </div>
                ),
              },
              {
                key: "scope",
                label: "Quy mô",
                render: (row) => (
                  <span className="text-sm">
                    {row.fieldCount} đồng · {row.farmerCount} ND · {row.plotCount} thửa
                  </span>
                ),
              },
              {
                key: "totalCost",
                label: "Chi phí",
                render: (row) => formatCurrency(row.totalCost),
              },
            ]}
            rows={seasonRows}
          />
        </SectionCard>

        <SectionCard title="Nhật ký gần đây">
          {recentActivities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              Chưa có nhật ký nào.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map((item) => {
                const statusMeta = getStatusMeta(item.status);

                return (
                  <article
                    key={item._id}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{item.taskName}</p>
                        <p className="mt-0.5 text-xs text-gray-500 truncate">
                          {item.fieldName} • {item.farmerName}
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDate(item.date)}</span>
                      <span className="font-semibold text-emerald-700">
                        {formatCurrency(item.cost)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Bảng: Cánh đồng + Mùa vụ thực tế */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Cánh đồng nổi bật">
          <DataTable
            rowKey={(row) => row.fieldId}
            emptyText="Chưa có thống kê cánh đồng."
            columns={[
              {
                key: "fieldName",
                label: "Cánh đồng",
                render: (row) => (
                  <p className="font-semibold text-gray-900">{row.fieldName}</p>
                ),
              },
              {
                key: "participation",
                label: "Quy mô",
                render: (row) => (
                  <span className="text-sm">
                    {row.seasonInstanceCount} vụ · {row.farmerCount} ND · {row.plotCount} thửa
                  </span>
                ),
              },
              {
                key: "totalCost",
                label: "Chi phí",
                render: (row) => formatCurrency(row.totalCost),
              },
            ]}
            rows={fieldRows}
          />
        </SectionCard>

        <SectionCard title="Đợt mùa vụ thực tế">
          <DataTable
            rowKey={(row) => row._id}
            emptyText="Chưa có đợt mùa vụ nào."
            columns={[
              {
                key: "seasonLabel",
                label: "Vụ",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-gray-900">{row.seasonLabel}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{row.field.name}</p>
                  </div>
                ),
              },
              {
                key: "farmer",
                label: "Nông dân",
                render: (row) => row.farmer.fullName,
              },
              {
                key: "status",
                label: "Trạng thái",
                render: (row) => {
                  const statusMeta = getStatusMeta(row.status);
                  return (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  );
                },
              },
              {
                key: "totalCost",
                label: "Chi phí",
                render: (row) => formatCurrency(row.totalCost),
              },
            ]}
            rows={seasonInstances}
          />
        </SectionCard>
      </div>
    </div>
  );
};

export default AdminOverview;
