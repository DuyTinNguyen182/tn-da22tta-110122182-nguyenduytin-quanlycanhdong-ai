import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Filter,
  LayoutDashboard,
  Map,
  RefreshCw,
  Sprout,
  Users,
  Wallet,
} from "lucide-react";
import api from "../../services/api";
import LoadingScreen from "../../components/Layout/LoadingScreen";

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
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
          {subtitle ? <p className="mt-2 text-xs text-gray-400">{subtitle}</p> : null}
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone] || tones.emerald}`}>{icon}</div>
      </div>
    </div>
  );
};

const SectionCard = ({ title, description, actions, children }) => (
  <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {actions}
    </div>
    {children}
  </section>
);

const DataTable = ({ columns, rows, emptyText, rowKey }) => {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100">
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
  const farmerRows = useMemo(() => (overview?.farmerOverview || []).slice(0, 6), [overview]);
  const taskRows = useMemo(() => (overview?.taskOverview || []).slice(0, 6), [overview]);
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
    <div className="h-full overflow-y-auto bg-[#f4f6f8] p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Tổng quan điều hành hợp tác xã
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Tách riêng phần thống kê toàn hệ thống và phần thống kê theo mùa vụ để admin nhìn dữ
            liệu tổng quan và dữ liệu vận hành theo từng đợt canh tác rõ hơn.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-emerald-200 hover:text-emerald-700"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      <SectionCard
        title="Thống kê toàn hệ thống"
        description="Nhóm chỉ số cứng của hợp tác xã, không phụ thuộc bộ lọc mùa vụ."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Cánh đồng"
            value={loading ? "--" : formatNumber(systemSummary.fieldCount)}
            subtitle={`${formatNumber(systemSummary.activeSeasonCount)} vụ đang canh tác`}
            icon={<LayoutDashboard size={22} />}
            tone="emerald"
          />
          <StatCard
            title="Nông dân"
            value={loading ? "--" : formatNumber(systemSummary.farmerCount)}
            subtitle={`${formatNumber(systemSummary.completedSeasonCount)} vụ đã kết thúc`}
            icon={<Users size={22} />}
            tone="orange"
          />
          <StatCard
            title="Thửa ruộng"
            value={loading ? "--" : formatNumber(systemSummary.plotCount)}
            subtitle={`${formatNumber(systemSummary.activePlotCount)} thửa đang active`}
            icon={<Sprout size={22} />}
            tone="blue"
          />
          <StatCard
            title="Diện tích đã khai báo"
            value={loading ? "--" : formatArea(systemSummary.totalArea)}
            subtitle={`${formatNumber(systemSummary.inactivePlotCount)} thửa tạm ngưng`}
            icon={<Map size={22} />}
            tone="slate"
          />
        </div>
      </SectionCard>

      <div className="mt-8">
        <SectionCard
          title="Bộ lọc thống kê mùa vụ"
          description="Chỉ áp dụng cho phần thống kê vận hành theo mùa vụ ở bên dưới."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:border-gray-300 hover:text-gray-800"
              >
                Đặt lại
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
              >
                <Filter size={16} />
                Áp dụng bộ lọc
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Mùa vụ
              </label>
              <select
                value={filterForm.seasonId}
                onChange={(event) =>
                  setFilterForm((prev) => ({ ...prev, seasonId: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
              >
                <option value="">Tất cả mùa vụ</option>
                {(options.seasons || []).map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Năm
              </label>
              <select
                value={filterForm.year}
                onChange={(event) =>
                  setFilterForm((prev) => ({ ...prev, year: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
              >
                <option value="">Tất cả năm</option>
                {(options.years || []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Cánh đồng
              </label>
              <select
                value={filterForm.fieldId}
                onChange={(event) =>
                  setFilterForm((prev) => ({ ...prev, fieldId: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
              >
                <option value="">Tất cả cánh đồng</option>
                {(options.fields || []).map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-8">
        <SectionCard
          title="Thống kê theo mùa vụ đã lọc"
          description="Các số liệu dưới đây thay đổi theo bộ lọc mùa vụ, năm và cánh đồng."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Đợt mùa vụ thực tế"
              value={loading ? "--" : formatNumber(seasonalSummary.seasonInstanceCount)}
              subtitle={`${formatNumber(seasonalSummary.activeSeasonCount)} vụ đang canh tác`}
              icon={<CalendarDays size={22} />}
              tone="emerald"
            />
            <StatCard
              title="Nông dân tham gia"
              value={loading ? "--" : formatNumber(seasonalSummary.participatingFarmerCount)}
              subtitle={`${formatNumber(seasonalSummary.participatingFieldCount)} cánh đồng có tham gia`}
              icon={<Users size={22} />}
              tone="orange"
            />
            <StatCard
              title="Thửa tham gia vụ"
              value={loading ? "--" : formatNumber(seasonalSummary.assignedPlotCount)}
              subtitle={`${formatNumber(seasonalSummary.readyPlotCount)} thửa sẵn sàng ghi nhật ký`}
              icon={<Sprout size={22} />}
              tone="blue"
            />
            <StatCard
              title="Chi phí đã ghi nhận"
              value={loading ? "--" : formatCurrency(seasonalSummary.totalCost)}
              subtitle={`${formatNumber(seasonalSummary.diaryLogCount)} nhật ký trong phạm vi lọc`}
              icon={<Wallet size={22} />}
              tone="slate"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Diện tích tham gia"
              value={loading ? "--" : formatArea(seasonalSummary.assignedArea)}
              subtitle="Diện tích của các thửa đã gán vào vụ"
              icon={<Map size={22} />}
              tone="emerald"
            />
            <StatCard
              title="Vụ chưa có nhật ký"
              value={loading ? "--" : formatNumber(seasonalSummary.seasonWithoutDiaryCount)}
              subtitle="Giúp admin phát hiện mùa vụ chưa được cập nhật"
              icon={<ClipboardList size={22} />}
              tone="orange"
            />
            <StatCard
              title="Thửa chưa sẵn sàng"
              value={loading ? "--" : formatNumber(seasonalSummary.inactiveAssignedPlotCount)}
              subtitle="Thửa đã gán nhưng hiện không active"
              icon={<Activity size={22} />}
              tone="blue"
            />
            <StatCard
              title="Vụ đã kết thúc"
              value={loading ? "--" : formatNumber(seasonalSummary.completedSeasonCount)}
              subtitle="Tổng số đợt mùa vụ đã hoàn thành trong phạm vi lọc"
              icon={<CalendarDays size={22} />}
              tone="slate"
            />
          </div>
        </SectionCard>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Tổng hợp theo mùa vụ"
          description="Nhóm theo tên mùa vụ và năm để admin so sánh quy mô triển khai giữa các đợt canh tác."
        >
          <DataTable
            rowKey={(row) => `${row.seasonId}-${row.year}`}
            emptyText="Chưa có dữ liệu mùa vụ theo bộ lọc đã chọn."
            columns={[
              {
                key: "seasonLabel",
                label: "Mùa vụ",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-gray-900">{row.seasonLabel}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {row.activeSeasonCount} active, {row.completedSeasonCount} completed
                    </p>
                  </div>
                ),
              },
              {
                key: "scope",
                label: "Quy mô",
                render: (row) => (
                  <div className="space-y-1 text-sm">
                    <p>{row.fieldCount} cánh đồng</p>
                    <p>{row.farmerCount} nông dân</p>
                    <p>{row.plotCount} thửa</p>
                  </div>
                ),
              },
              {
                key: "assignedArea",
                label: "Diện tích",
                render: (row) => formatArea(row.assignedArea),
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

        <SectionCard
          title="Nhật ký gần đây"
          description="Hoạt động canh tác mới nhất trong phạm vi bộ lọc mùa vụ."
        >
          {recentActivities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Chưa có nhật ký nào trong phạm vi lọc.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((item) => {
                const statusMeta = getStatusMeta(item.status);

                return (
                  <article
                    key={item._id}
                    className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{item.taskName}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.fieldName} • {item.farmerName}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>{formatDate(item.date)}</span>
                      <span>{item.plotName || "Toàn cánh đồng"}</span>
                      <span>{item.seasonLabel}</span>
                    </div>
                    {item.description ? (
                      <p className="mt-3 line-clamp-2 text-sm text-gray-600">{item.description}</p>
                    ) : null}
                    <p className="mt-3 text-sm font-semibold text-emerald-700">
                      {formatCurrency(item.cost)}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <SectionCard
          title="Cánh đồng nổi bật theo hoạt động"
          description="Ưu tiên các cánh đồng có nhiều nhật ký hoặc chi phí phát sinh trong phạm vi đang xem."
        >
          <DataTable
            rowKey={(row) => row.fieldId}
            emptyText="Chưa có thống kê cánh đồng."
            columns={[
              {
                key: "fieldName",
                label: "Cánh đồng",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-gray-900">{row.fieldName}</p>
                    <p className="mt-1 text-xs text-gray-400">{row.address || "Chưa cập nhật địa bàn"}</p>
                  </div>
                ),
              },
              {
                key: "participation",
                label: "Tham gia",
                render: (row) => (
                  <div className="space-y-1 text-sm">
                    <p>{row.seasonInstanceCount} đợt mùa vụ</p>
                    <p>{row.farmerCount} nông dân</p>
                    <p>{row.plotCount} thửa</p>
                  </div>
                ),
              },
              {
                key: "assignedArea",
                label: "Diện tích",
                render: (row) => formatArea(row.assignedArea),
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

        <SectionCard
          title="Nông dân tham gia nhiều"
          description="Cho biết ai đang có nhiều hoạt động mùa vụ, nhiều thửa tham gia và phát sinh nhật ký."
        >
          <DataTable
            rowKey={(row) => row.farmerId}
            emptyText="Chưa có thống kê nông dân."
            columns={[
              {
                key: "fullName",
                label: "Nông dân",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-gray-900">{row.fullName}</p>
                    <p className="mt-1 text-xs text-gray-400">{row.email || "Không có email"}</p>
                  </div>
                ),
              },
              {
                key: "scope",
                label: "Phạm vi",
                render: (row) => (
                  <div className="space-y-1 text-sm">
                    <p>{row.fieldCount} cánh đồng</p>
                    <p>{row.seasonInstanceCount} vụ</p>
                    <p>{row.plotCount} thửa</p>
                  </div>
                ),
              },
              {
                key: "diaryLogCount",
                label: "Nhật ký",
                render: (row) => formatNumber(row.diaryLogCount),
              },
              {
                key: "totalCost",
                label: "Chi phí",
                render: (row) => formatCurrency(row.totalCost),
              },
            ]}
            rows={farmerRows}
          />
        </SectionCard>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Các đợt mùa vụ thực tế"
          description="Chi tiết từng vụ đã được nông dân bắt đầu trên từng cánh đồng."
        >
          <DataTable
            rowKey={(row) => row._id}
            emptyText="Chưa có đợt mùa vụ nào trong phạm vi lọc."
            columns={[
              {
                key: "seasonLabel",
                label: "Vụ",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-gray-900">{row.seasonLabel}</p>
                    <p className="mt-1 text-xs text-gray-400">{row.field.name}</p>
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
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  );
                },
              },
              {
                key: "plots",
                label: "Thửa / nhật ký",
                render: (row) => (
                  <div className="space-y-1 text-sm">
                    <p>{row.plotCount} thửa</p>
                    <p>{row.diaryLogCount} nhật ký</p>
                  </div>
                ),
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

        <SectionCard
          title="Tổng hợp theo công việc"
          description="Nhìn nhanh nhóm công việc nào xuất hiện nhiều hoặc tốn chi phí nhất."
        >
          {taskRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Chưa có dữ liệu công việc trong phạm vi lọc.
            </div>
          ) : (
            <div className="space-y-3">
              {taskRows.map((item) => (
                <div
                  key={item.taskId}
                  className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{item.taskName}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatNumber(item.diaryLogCount)} nhật ký
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-700">
                      {formatCurrency(item.totalCost)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default AdminOverview;
