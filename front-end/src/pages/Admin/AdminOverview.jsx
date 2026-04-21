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

    </div>
  );
};

export default AdminOverview;
