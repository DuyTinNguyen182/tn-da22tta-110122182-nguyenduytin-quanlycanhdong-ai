import React, { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  Filter,
  ListChecks,
  Map,
  RefreshCw,
  ShieldAlert,
  Sprout,
} from "lucide-react";
import api from "../../../services/api";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import PaginationControls from "../../../components/Common/PaginationControls";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import { useFeedback } from "../../../hooks/useFeedback";
import StatCard from "./StatCard";

const CURRENT_YEAR = new Date().getFullYear();
const ROWS_PER_PAGE = 10;

const buildDefaultFilters = (seasonId = "", year = String(CURRENT_YEAR)) => ({
  fieldId: "",
  seasonId,
  year,
  taskId: "",
  taskDetailId: "",
  status: "all",
});

const buildQueryParams = (filters) => {
  const params = {};
  if (filters.fieldId) params.fieldId = filters.fieldId;
  if (filters.seasonId) params.seasonId = filters.seasonId;
  if (filters.year) params.year = filters.year;
  if (filters.taskId) params.taskId = filters.taskId;
  if (filters.taskDetailId) params.taskDetailId = filters.taskDetailId;
  if (filters.status) params.status = filters.status;
  return params;
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa thực hiện";

const getStatusClasses = (status) =>
  status === "done"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-700";

const getStatusText = (status) => {
  if (status === "done") return "Đã làm";
  if (status === "pending") return "Chưa làm";
  return "Tất cả";
};

const Dashboard = () => {
  const { toast } = useFeedback();
  const [options, setOptions] = useState({
    fields: [],
    seasons: [],
    tasks: [],
    statuses: [],
    years: [],
  });
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [currentSeasonLoaded, setCurrentSeasonLoaded] = useState(false);
  const [defaultSeasonApplied, setDefaultSeasonApplied] = useState(false);
  const [filterForm, setFilterForm] = useState(buildDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(buildDefaultFilters);

  const fetchCurrentSeason = async () => {
    try {
      const res = await api.get("/user-overview/dashboard/current-season");
      setCurrentSeason(res.data || null);
    } catch (_error) {
      setCurrentSeason(null);
    } finally {
      setCurrentSeasonLoaded(true);
    }
  };

  const fetchOptions = async () => {
    const res = await api.get("/user-overview/dashboard/options");
    setOptions(
      res.data || {
        fields: [],
        seasons: [],
        tasks: [],
        statuses: [],
        years: [],
      }
    );
  };

  const fetchStatistics = async (filters, { silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await api.get("/user-overview/dashboard/statistics", {
        params: buildQueryParams(filters),
      });

      setStatistics(res.data);
    } catch (error) {
      console.error("Lỗi tải thống kê dashboard:", error);
      toast.error(error.response?.data?.message || "Không thể tải thống kê");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCurrentSeason();
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        await fetchOptions();
        setBootstrapped(true);
      } catch (error) {
        console.error("Lỗi tải bộ lọc dashboard:", error);
        toast.error(error.response?.data?.message || "Không thể tải bộ lọc dashboard");
        setLoading(false);
      }
    };

    bootstrap();
  }, [toast]);

  const resolveInitialFilters = useMemo(() => {
    if (!currentSeason?.seasonId) {
      return buildDefaultFilters();
    }

    const matchedSeason = options.seasons.find((item) => item._id === currentSeason.seasonId);
    if (!matchedSeason) {
      return buildDefaultFilters();
    }

    const seasonYear = currentSeason.startDate
      ? String(new Date(currentSeason.startDate).getFullYear())
      : String(CURRENT_YEAR);

    return buildDefaultFilters(matchedSeason._id, seasonYear);
  }, [currentSeason, options.seasons]);

  useEffect(() => {
    if (!bootstrapped || !currentSeasonLoaded || defaultSeasonApplied) {
      return;
    }

    setFilterForm(resolveInitialFilters);
    setAppliedFilters(resolveInitialFilters);
    setDefaultSeasonApplied(true);
  }, [bootstrapped, currentSeasonLoaded, defaultSeasonApplied, resolveInitialFilters]);

  useEffect(() => {
    if (!bootstrapped || !defaultSeasonApplied) {
      return;
    }

    fetchStatistics(appliedFilters);
  }, [appliedFilters, bootstrapped, defaultSeasonApplied]);

  const currentTask = useMemo(
    () => options.tasks.find((item) => item._id === filterForm.taskId) || null,
    [options.tasks, filterForm.taskId]
  );

  const taskDetailOptions = useMemo(() => {
    if (!currentTask) return [];

    return (currentTask.taskDetails || []).map((item) => ({
      value: item._id,
      label: item.name,
    }));
  }, [currentTask]);

  const fieldOptions = useMemo(
    () => [
      { value: "", label: "Tất cả cánh đồng" },
      ...(options.fields || []).map((item) => ({
        value: item._id,
        label: item.name,
      })),
    ],
    [options.fields]
  );

  const seasonOptions = useMemo(
    () => [
      { value: "", label: "Tất cả mùa vụ" },
      ...(options.seasons || []).map((item) => ({
        value: item._id,
        label: item.name,
      })),
    ],
    [options.seasons]
  );

  const yearOptions = useMemo(
    () => [
      { value: "", label: "Tất cả năm" },
      ...(options.years || []).map((year) => ({
        value: String(year),
        label: String(year),
      })),
    ],
    [options.years]
  );

  const taskOptions = useMemo(
    () => [
      { value: "", label: "Tất cả công việc" },
      ...(options.tasks || []).map((item) => ({
        value: item._id,
        label: item.name,
      })),
    ],
    [options.tasks]
  );

  const statusOptions = useMemo(
    () =>
      (options.statuses || []).map((item) => ({
        value: item.value,
        label: getStatusText(item.value),
      })),
    [options.statuses]
  );

  const rows = statistics?.rows || [];
  const summary = statistics?.summary || {
    totalPlotCount: 0,
    doneCount: 0,
    pendingCount: 0,
    visibleCount: 0,
    completionRate: 0,
    matchedSeasonCount: 0,
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return rows.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [rows, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setAppliedFilters({ ...filterForm });
  };

  const handleResetFilters = () => {
    setCurrentPage(1);
    setFilterForm(resolveInitialFilters);
    setAppliedFilters(resolveInitialFilters);
  };

  const handleRefresh = () => {
    fetchStatistics(appliedFilters, { silent: true });
  };

  const handleTaskChange = (value) => {
    setFilterForm((prev) => ({
      ...prev,
      taskId: value,
      taskDetailId: "",
    }));
  };

  if (loading && !statistics) {
    return <LoadingScreen fullScreen={true} message="Đang tải thống kê..." />;
  }

  let seasonBanner = null;
  if (currentSeason && currentSeason.seasonName && currentSeason.startDate) {
    const start = new Date(currentSeason.startDate);
    const now = new Date();
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));

    seasonBanner = (
      <div className="mb-0 rounded-xl bg-emerald-50 px-6 py-4 text-base font-medium text-emerald-900 shadow-sm">
        Mùa vụ hiện tại:
        {" "}
        <span className="font-bold">
          {currentSeason.seasonName} {start.getFullYear()}
        </span>
        . Ngày bắt đầu:
        {" "}
        <span className="font-semibold">{start.toLocaleDateString("vi-VN")}</span>
        . Mùa vụ đã bắt đầu được
        {" "}
        <span className="font-semibold">{diffDays >= 0 ? diffDays : 0}</span>
        {" "}
        ngày.
      </div>
    );
  } else {
    seasonBanner = (
      <div className="mb-0 rounded-xl bg-amber-50 px-6 py-4 text-base font-medium text-amber-900 shadow-sm">
        Không có mùa vụ nào đang canh tác.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6 lg:p-6">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3">
        {seasonBanner}

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
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                Làm mới
              </button>

              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
              >
                Đặt lại bộ lọc
              </button>

              <button
                type="button"
                onClick={handleApplyFilters}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700"
              >
                <Filter size={16} />
                Áp dụng
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                Cánh đồng
              </p>
              <CustomDropdown
                value={filterForm.fieldId}
                onChange={(value) => setFilterForm((prev) => ({ ...prev, fieldId: value }))}
                options={fieldOptions}
                placeholder="Chọn cánh đồng"
                icon={Map}
                variant="filter"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                Mùa vụ
              </p>
              <CustomDropdown
                value={filterForm.seasonId}
                onChange={(value) => setFilterForm((prev) => ({ ...prev, seasonId: value }))}
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
                onChange={(value) => setFilterForm((prev) => ({ ...prev, year: value }))}
                options={yearOptions}
                placeholder="Chọn năm"
                icon={CalendarDays}
                variant="filter"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                Công việc
              </p>
              <CustomDropdown
                value={filterForm.taskId}
                onChange={handleTaskChange}
                options={taskOptions}
                placeholder="Chọn công việc"
                icon={Briefcase}
                variant="filter"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                Chi tiết công việc
              </p>
              <CustomDropdown
                value={filterForm.taskDetailId}
                onChange={(value) =>
                  setFilterForm((prev) => ({ ...prev, taskDetailId: value }))
                }
                options={[
                  {
                    value: "",
                    label: currentTask ? "Tất cả chi tiết" : "Chọn công việc trước",
                  },
                  ...taskDetailOptions,
                ]}
                placeholder="Chọn chi tiết công việc"
                icon={ListChecks}
                variant="filter"
                className={!currentTask ? "opacity-70" : ""}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                Trạng thái
              </p>
              <CustomDropdown
                value={filterForm.status}
                onChange={(value) => setFilterForm((prev) => ({ ...prev, status: value }))}
                options={statusOptions}
                placeholder="Chọn trạng thái"
                icon={ShieldAlert}
                variant="filter"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          <StatCard
            title="Tổng số thửa"
            value={summary.totalPlotCount}
            unit="thửa"
            icon={Map}
            color="emerald"
          />
          <StatCard
            title="Đã hoàn thành"
            value={summary.doneCount}
            unit="lượt"
            icon={Briefcase}
            color="blue"
          />
          <StatCard
            title="Chưa hoàn thành"
            value={summary.pendingCount}
            unit="lượt"
            icon={ShieldAlert}
            color="amber"
          />
          <StatCard
            title="Tỉ lệ hoàn thành"
            value={`${summary.completionRate}%`}
            unit=""
            icon={ListChecks}
            color="violet"
          />
        </section>

        <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bảng thống kê theo thửa ruộng</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Đã làm
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Chưa làm
              </span>
            </div>
          </div>

          {loading ? (
            <LoadingScreen message="Đang cập nhật bảng thống kê..." />
          ) : rows.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center px-6 text-center">
              <div className="rounded-3xl bg-amber-50 p-4 text-amber-600">
                <ShieldAlert size={28} />
              </div>
              <p className="mt-4 text-lg font-semibold text-gray-800">Chưa có dữ liệu phù hợp</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                Hãy thử đổi mùa vụ, năm, công việc hoặc trạng thái. Nếu đang lọc theo chi tiết công
                việc, cần kiểm tra xem công việc cha đã được chọn đúng chưa.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px]">
                  <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                    <tr>
                      <th className="px-5 py-4">Thửa ruộng</th>
                      <th className="px-5 py-4">Cánh đồng</th>
                      <th className="px-5 py-4">Mùa vụ</th>
                      <th className="px-5 py-4">Công việc</th>
                      <th className="px-5 py-4">Ngày thực hiện</th>
                      <th className="px-5 py-4">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr key={row.assignmentId} className="border-t border-gray-100 align-top">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{row.plotName}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            Diện tích: {Number(row.plotArea || 0).toLocaleString("vi-VN")} m2
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="inline-flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                            <Map size={14} />
                            {row.fieldName}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{row.seasonLabel}</p>
                          <p className="mt-1 text-sm text-gray-500">Năm: {row.year || "--"}</p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{row.activityLabel}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {row.taskDetailName ? row.taskName : "Công việc chung"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                              row.performedAt
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {formatDate(row.performedAt)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(row.status)}`}
                          >
                            {getStatusText(row.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-gray-500">
                  Hiển thị {paginatedRows.length} dòng trong tổng số {rows.length} dòng theo bộ lọc
                  hiện tại.
                </p>

                <PaginationControls
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
