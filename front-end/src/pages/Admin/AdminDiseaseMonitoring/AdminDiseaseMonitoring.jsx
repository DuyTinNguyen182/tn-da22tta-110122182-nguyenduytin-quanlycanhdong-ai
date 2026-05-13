import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Leaf, MapPinned } from "lucide-react";
import api from "../../../services/api";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import PaginationControls from "../../../components/Common/PaginationControls";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import { useFeedback } from "../../../hooks/useFeedback";

const PAGE_SIZE = 10;

const TIME_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "previous_week", label: "Tuần trước" },
  { value: "today", label: "Hôm nay" },
];

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--";

const formatSeasonLabel = (season) => {
  if (!season) return "";
  const baseName = season.seasonName || season.name || "Mùa vụ";
  return season.year ? `${baseName} ${season.year}` : baseName;
};

const getPlotSummary = (log) => {
  const plotNames = Array.isArray(log?.plots)
    ? log.plots.map((plot) => plot?.name).filter(Boolean)
    : [];

  if (plotNames.length === 0) {
    return log?.scope === "all_plots" ? "Toàn bộ thửa tham gia vụ" : "--";
  }

  return plotNames.join(", ");
};

const isInToday = (value) => {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

const isInPreviousWeek = (value) => {
  const date = new Date(value);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfRange = new Date(startOfToday);
  startOfRange.setDate(startOfRange.getDate() - 7);

  return date >= startOfRange && date < startOfToday;
};

const AdminDiseaseMonitoring = () => {
  const { toast } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fields, setFields] = useState([]);
  const [activeSeason, setActiveSeason] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    fieldId: "",
    timeRange: "all",
  });

  const fieldOptions = useMemo(
    () => [
      { value: "", label: "Tất cả cánh đồng" },
      ...(fields || []).map((field) => ({
        value: field._id,
        label: field.name,
      })),
    ],
    [fields],
  );

  const fetchBaseData = useCallback(async () => {
    try {
      setLoading(true);

      const [fieldRes, activeSeasonRes] = await Promise.all([
        api.get("/fields"),
        api.get("/season-details/active"),
      ]);

      setFields(fieldRes.data || []);
      setActiveSeason(activeSeasonRes.data || null);
    } catch (error) {
      console.error("Lỗi tải dữ liệu theo dõi dịch bệnh:", error);
      toast.error(
        error.response?.data?.message ||
          "Không thể tải dữ liệu theo dõi dịch bệnh",
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchLogs = useCallback(
    async (fieldId = "", seasonDetailId = "", { silent = false } = {}) => {
      if (!seasonDetailId) {
        setLogs([]);
        return;
      }

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const res = await api.get("/disease-logs", {
          params: {
            seasonId: seasonDetailId,
            ...(fieldId ? { fieldId } : {}),
          },
        });

        setLogs(res.data || []);
      } catch (error) {
        console.error("Lỗi tải danh sách bệnh theo mùa vụ hiện tại:", error);
        toast.error(
          error.response?.data?.message || "Không thể tải danh sách bệnh",
        );
        setLogs([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  useEffect(() => {
    if (loading) return;
    fetchLogs(filters.fieldId, activeSeason?._id || "", { silent: true });
  }, [activeSeason?._id, fetchLogs, filters.fieldId, loading]);

  const filteredLogs = useMemo(() => {
    const sortedLogs = [...logs].sort(
      (left, right) =>
        new Date(right.detectedAt || right.createdAt || 0) -
        new Date(left.detectedAt || left.createdAt || 0),
    );

    if (filters.timeRange === "today") {
      return sortedLogs.filter((log) =>
        isInToday(log.detectedAt || log.createdAt),
      );
    }

    if (filters.timeRange === "previous_week") {
      return sortedLogs.filter((log) =>
        isInPreviousWeek(log.detectedAt || log.createdAt),
      );
    }

    return sortedLogs;
  }, [filters.timeRange, logs]);

  const summary = useMemo(
    () => ({
      total: filteredLogs.length,
      todayCount: logs.filter((log) =>
        isInToday(log.detectedAt || log.createdAt),
      ).length,
      fieldCount: new Set(
        filteredLogs.map((log) => log.fieldId).filter(Boolean),
      ).size,
    }),
    [filteredLogs, logs],
  );

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.fieldId, filters.timeRange]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading && !activeSeason && logs.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 p-6 lg:p-8">
        <LoadingScreen message="Đang tải theo dõi dịch bệnh..." />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6 lg:p-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Theo dõi dịch bệnh
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Theo dõi bệnh được ghi nhận từ nhật ký bệnh trong mùa vụ đang canh
              tác.
            </p>
          </div>

          {activeSeason ? (
            <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <CalendarDays size={16} />
              Mùa vụ hiện tại: {formatSeasonLabel(activeSeason)}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              <AlertTriangle size={16} />
              Chưa có mùa vụ đang canh tác
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Tổng bệnh
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {summary.total}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Ghi nhận hôm nay
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {summary.todayCount}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Cánh đồng có bệnh
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {summary.fieldCount}
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Danh sách ghi nhận
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Mỗi trang hiển thị 10 bệnh, sắp xếp mới nhất từ trên xuống.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <CustomDropdown
                value={filters.fieldId}
                onChange={(value) => handleFilterChange("fieldId", value)}
                options={fieldOptions}
                placeholder="Tất cả cánh đồng"
                icon={MapPinned}
                variant="filter"
                className="min-w-[220px]"
                size="default"
              />

              <CustomDropdown
                value={filters.timeRange}
                onChange={(value) => handleFilterChange("timeRange", value)}
                options={TIME_FILTER_OPTIONS}
                placeholder="Chọn thời gian"
                icon={Leaf}
                variant="filter"
                className="min-w-[180px]"
                size="default"
              />
            </div>
          </div>

          {!activeSeason ? (
            <div className="mt-5 flex h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 text-center">
              <div className="rounded-2xl bg-white p-4 text-amber-500 shadow-sm">
                <AlertTriangle size={28} />
              </div>
              <p className="mt-4 text-base font-semibold text-gray-700">
                Chưa có mùa vụ hiện tại để theo dõi
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Hãy kích hoạt một mùa vụ đang canh tác để xem nhật ký bệnh tương
                ứng.
              </p>
            </div>
          ) : loading || refreshing ? (
            <LoadingScreen message="Đang tải danh sách bệnh..." />
          ) : paginatedLogs.length === 0 ? (
            <div className="mt-5 flex h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 text-center">
              <div className="rounded-2xl bg-white p-4 text-gray-400 shadow-sm">
                <AlertTriangle size={28} />
              </div>
              <p className="mt-4 text-base font-semibold text-gray-700">
                Chưa có bệnh nào phù hợp
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Thử đổi cánh đồng hoặc mốc thời gian để xem thêm dữ liệu.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-3">Cánh đồng</th>
                      <th className="px-4 py-3">Nông dân</th>
                      <th className="px-4 py-3">Tên bệnh</th>
                      <th className="px-4 py-3">Thửa ảnh hưởng</th>
                      <th className="px-4 py-3">Ngày ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log) => (
                      <tr
                        key={log._id}
                        className="border-b border-gray-50 align-top"
                      >
                        <td className="px-4 py-4 text-sm font-medium text-gray-700">
                          {log.fieldName || "--"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {log.userName || log.user?.fullName || "--"}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-gray-900">
                            {log.diseaseName || "--"}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {log.seasonLabel || formatSeasonLabel(activeSeason)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm leading-6 text-gray-600">
                          {getPlotSummary(log)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {formatDateTime(log.detectedAt || log.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-gray-500">
                  Hiển thị {paginatedLogs.length} mục trong tổng số{" "}
                  {filteredLogs.length} bệnh theo bộ lọc hiện tại.
                </p>

                <PaginationControls
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  disabled={loading || refreshing}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDiseaseMonitoring;
