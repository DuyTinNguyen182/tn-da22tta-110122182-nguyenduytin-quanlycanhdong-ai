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
import api from "../../../services/api";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import StatCard from "./components/StatCard";
import SectionCard from "./components/SectionCard";
import DataTable from "./components/DataTable";

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
