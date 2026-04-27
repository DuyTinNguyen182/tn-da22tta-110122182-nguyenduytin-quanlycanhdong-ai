import React, { useEffect, useMemo, useState } from "react";
import {
  BellRing,
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

const CURRENT_YEAR = new Date().getFullYear();
const ROWS_PER_PAGE = 10;

const buildDefaultFilters = () => ({
  fieldId: "",
  seasonId: "",
  year: String(CURRENT_YEAR),
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

const AdminOverview = () => {
  const { toast, confirm } = useFeedback();
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
  const [filterForm, setFilterForm] = useState(buildDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(buildDefaultFilters);

  const fetchOptions = async () => {
    const res = await api.get("/admin/plot-statistics/options");
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

      const res = await api.get("/admin/plot-statistics", {
        params: buildQueryParams(filters),
      });

      setStatistics(res.data);
    } catch (error) {
      console.error("Lỗi tải thống kê admin:", error);
      toast.error(error.response?.data?.message || "Không thể tải thống kê");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        await fetchOptions();
        setBootstrapped(true);
      } catch (error) {
        console.error("Lỗi tải bộ lọc thống kê:", error);
        toast.error(error.response?.data?.message || "Không thể tải bộ lọc thống kê");
        setLoading(false);
      }
    };

    bootstrap();
  }, [toast]);

  useEffect(() => {
    if (!bootstrapped) return;
    fetchStatistics(appliedFilters);
  }, [appliedFilters, bootstrapped]);

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
  const selectedActivity = statistics?.selectedActivity || {};
  const selectedTaskLabel = selectedActivity.activityLabel || "Tất cả công việc";
  const matchedSeasonText =
    summary.matchedSeasonCount > 0
      ? `${summary.matchedSeasonCount} lịch mùa vụ`
      : "Chưa có lịch mùa vụ phù hợp";

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
    const nextFilters = buildDefaultFilters();
    setCurrentPage(1);
    setFilterForm(nextFilters);
    setAppliedFilters(nextFilters);
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

  const handleWarning = async (row) => {
    const confirmed = await confirm({
      title: "Gửi cảnh báo sau này?",
      message: `Thửa "${row.plotName}" của ${row.farmerName} đang chưa thực hiện "${selectedTaskLabel}". Mình đã gắn sẵn nút này để bước tiếp theo có thể nối thêm gửi email.`,
      confirmText: "Đã hiểu",
      tone: "primary",
    });

    if (!confirmed) return;

    if (!row.warningAvailable) {
      toast.warning("Nông dân này chưa có email để gửi cảnh báo sau này.");
      return;
    }

    toast.info(
      `Đã đánh dấu thửa "${row.plotName}" cho tính năng gửi cảnh báo qua email ở bước tiếp theo.`
    );
  };

  if (loading && !statistics) {
    return <LoadingScreen fullScreen={true} message="Đang tải thống kê admin..." />;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm lg:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                <Filter size={14} />
                Bộ lọc thống kê
              </div>
              <h2 className="mt-3 text-2xl font-bold text-gray-900">Lọc dữ liệu cần xem</h2>
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
          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Đang hiển thị
            </p>
            <p className="mt-3 text-xl font-bold text-gray-900">{summary.visibleCount} thửa</p>
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Công việc đang theo dõi
            </p>
            <p className="mt-3 text-xl font-bold text-gray-900">{selectedTaskLabel}</p>
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Phạm vi mùa vụ
            </p>
            <p className="mt-3 text-xl font-bold text-gray-900">{matchedSeasonText}</p>
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Nông dân cần nhắc
            </p>
            <p className="mt-3 text-3xl font-bold text-amber-600">{summary.pendingCount}</p>
          </div>
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
                <table className="w-full min-w-[1200px]">
                  <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                    <tr>
                      <th className="px-5 py-4">Thửa ruộng</th>
                      <th className="px-5 py-4">Cánh đồng</th>
                      <th className="px-5 py-4">Mùa vụ</th>
                      <th className="px-5 py-4">Công việc</th>
                      <th className="px-5 py-4">Ngày thực hiện</th>
                      <th className="px-5 py-4">Nông dân</th>
                      <th className="px-5 py-4">Trạng thái</th>
                      <th className="px-5 py-4 text-right">Cảnh báo</th>
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
                            {row.taskDetailName ? row.taskName : "Công việc tổng"}
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
                          <p className="font-semibold text-gray-900">{row.farmerName}</p>
                          <p className="mt-1 text-sm text-gray-500">{row.farmerEmail || "--"}</p>
                          <p className="mt-1 text-sm text-gray-400">{row.farmerPhone || "--"}</p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(row.status)}`}
                          >
                            {getStatusText(row.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleWarning(row)}
                              disabled={row.status === "done"}
                              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
                                row.status === "done"
                                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                  : "bg-amber-500 text-white shadow-md shadow-amber-200 hover:bg-amber-600"
                              }`}
                            >
                              <BellRing size={15} />
                              {row.status === "done" ? "Đã xong" : "Cảnh báo"}
                            </button>
                          </div>
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

export default AdminOverview;
