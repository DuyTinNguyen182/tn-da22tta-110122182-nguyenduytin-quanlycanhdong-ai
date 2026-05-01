import React, { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Briefcase,
  CalendarDays,
  Filter,
  ListChecks,
  Map as MapIcon,
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

const getFarmerGroupKey = (row) =>
  String(row?.recipientKey || row?.farmerId || row?.farmerEmail || "")
    .trim()
    .toLowerCase();

const buildWarningSessionKey = (recipientKey, filters) =>
  JSON.stringify({
    recipientKey: String(recipientKey || "").trim().toLowerCase(),
    fieldId: filters?.fieldId || "",
    seasonId: filters?.seasonId || "",
    year: filters?.year || "",
    taskId: filters?.taskId || "",
    taskDetailId: filters?.taskDetailId || "",
  });

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

const formatCurrentSeasonBanner = (currentSeason) => {
  if (!currentSeason?.seasonName || !currentSeason?.startDate) {
    return {
      content: "Không có mùa vụ nào đang canh tác.",
      className: "bg-amber-50 text-amber-900",
    };
  }

  const start = new Date(currentSeason.startDate);
  const now = new Date();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));

  return {
    content: (
      <>
        Mùa vụ hiện tại:{" "}
        <span className="font-bold">
          {currentSeason.seasonName} {start.getFullYear()}
        </span>
        . Ngày bắt đầu:{" "}
        <span className="font-semibold">{start.toLocaleDateString("vi-VN")}</span>. Mùa vụ đã bắt
        đầu được <span className="font-semibold">{diffDays >= 0 ? diffDays : 0}</span> ngày.
      </>
    ),
    className: "bg-emerald-50 text-emerald-900",
  };
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
  const [currentSeason, setCurrentSeason] = useState(null);
  const [currentSeasonLoaded, setCurrentSeasonLoaded] = useState(false);
  const [defaultSeasonApplied, setDefaultSeasonApplied] = useState(false);
  const [sendingRecipientKey, setSendingRecipientKey] = useState("");
  const [sendingAllWarnings, setSendingAllWarnings] = useState(false);
  const [sentWarningKeys, setSentWarningKeys] = useState(() => new Set());

  useEffect(() => {
    api
      .get("/admin/current-season")
      .then((res) => setCurrentSeason(res.data))
      .catch(() => setCurrentSeason(null))
      .finally(() => setCurrentSeasonLoaded(true));
  }, []);

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
    if (!bootstrapped || !defaultSeasonApplied) return;
    fetchStatistics(appliedFilters);
  }, [appliedFilters, bootstrapped, defaultSeasonApplied]);

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
    pendingFarmerCount: 0,
    pendingFarmerWithEmailCount: 0,
  };
  const selectedActivity = statistics?.selectedActivity || {};
  const selectedTaskLabel = selectedActivity.activityLabel || "Tất cả công việc";
  const matchedSeasonText =
    summary.matchedSeasonCount > 0
      ? `${summary.matchedSeasonCount} lịch mùa vụ`
      : "Chưa có lịch mùa vụ phù hợp";

  const pendingFarmerGroups = useMemo(() => {
    const groups = new Map();

    rows
      .filter((row) => row.status === "pending")
      .forEach((row) => {
        const groupKey = getFarmerGroupKey(row);
        if (!groupKey) return;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            recipientKey: groupKey,
            farmerId: row.farmerId || "",
            farmerName: row.farmerName || "Nông dân",
            farmerEmail: row.farmerEmail || "",
            farmerPhone: row.farmerPhone || "",
            rows: [],
          });
        }

        groups.get(groupKey).rows.push(row);
      });

    return groups;
  }, [rows]);

  const warnableFarmerGroups = useMemo(
    () => Array.from(pendingFarmerGroups.values()).filter((item) => item.farmerEmail),
    [pendingFarmerGroups]
  );

  const warnedFarmerCountInSession = warnableFarmerGroups.filter((group) =>
    sentWarningKeys.has(buildWarningSessionKey(group.recipientKey, appliedFilters))
  ).length;

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
    const nextFilters = resolveInitialFilters;
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

  const ensureTaskSelected = () => {
    if (!appliedFilters.taskId) {
      toast.warning("Vui lòng chọn công việc trước khi gửi cảnh báo.");
      return false;
    }

    return true;
  };

  const markRecipientAsSent = (recipientKey) => {
    const sessionKey = buildWarningSessionKey(recipientKey, appliedFilters);
    setSentWarningKeys((prev) => {
      const next = new Set(prev);
      next.add(sessionKey);
      return next;
    });
  };

  const handleWarning = async (row) => {
    if (!ensureTaskSelected()) return;

    const group = pendingFarmerGroups.get(getFarmerGroupKey(row));

    if (!group) {
      toast.warning("Nông dân này hiện không còn việc tồn đọng phù hợp để cảnh báo.");
      return;
    }

    if (!group.farmerEmail) {
      toast.warning("Nông dân này chưa có email để gửi cảnh báo.");
      return;
    }

    const isAlreadySentInSession = sentWarningKeys.has(
      buildWarningSessionKey(group.recipientKey, appliedFilters)
    );

    const confirmed = await confirm({
      title: isAlreadySentInSession ? "Gửi lại cảnh báo cho nông dân này?" : "Gửi cảnh báo cho nông dân này?",
      message: `${group.farmerName} đang có ${group.rows.length} thửa chưa thực hiện "${selectedTaskLabel}".`,
      confirmText: isAlreadySentInSession ? "Gửi lại email" : "Gửi email",
      cancelText: "Hủy",
      tone: "primary",
    });

    if (!confirmed) return;

    try {
      setSendingRecipientKey(group.recipientKey);

      const res = await api.post("/admin/plot-statistics/warnings", {
        filters: appliedFilters,
        recipientKey: group.recipientKey,
      });

      markRecipientAsSent(group.recipientKey);

      const recipient = res.data?.recipients?.[0];
      toast.success(
        recipient
          ? `Đã gửi email cảnh báo cho ${recipient.farmerName} (${recipient.pendingPlotCount} thửa).`
          : `Đã gửi email cảnh báo cho ${group.farmerName}.`
      );
    } catch (error) {
      console.error("Lỗi gửi cảnh báo cho nông dân:", error);
      toast.error(error.response?.data?.message || "Không thể gửi email cảnh báo");
    } finally {
      setSendingRecipientKey("");
    }
  };

  const handleWarningAll = async () => {
    if (!ensureTaskSelected()) return;

    if (warnableFarmerGroups.length === 0) {
      toast.warning("Không có nông dân nào đủ điều kiện nhận cảnh báo trong bộ lọc hiện tại.");
      return;
    }

    const totalPendingPlots = warnableFarmerGroups.reduce(
      (total, group) => total + group.rows.length,
      0
    );

    const hasSentAnyInSession = warnableFarmerGroups.some((group) =>
      sentWarningKeys.has(buildWarningSessionKey(group.recipientKey, appliedFilters))
    );

    const confirmed = await confirm({
      title: hasSentAnyInSession ? "Gửi lại cảnh báo cho tất cả?" : "Gửi cảnh báo cho tất cả?",
      message: `Hệ thống sẽ gửi ${warnableFarmerGroups.length} email cho ${warnableFarmerGroups.length} nông dân và gộp ${totalPendingPlots} thửa chưa làm theo đúng người nhận.`,
      confirmText: hasSentAnyInSession ? "Gửi lại tất cả" : "Gửi tất cả",
      cancelText: "Hủy",
      tone: "primary",
    });

    if (!confirmed) return;

    try {
      setSendingAllWarnings(true);

      const res = await api.post("/admin/plot-statistics/warnings", {
        filters: appliedFilters,
        sendAll: true,
      });

      setSentWarningKeys((prev) => {
        const next = new Set(prev);
        warnableFarmerGroups.forEach((group) => {
          next.add(buildWarningSessionKey(group.recipientKey, appliedFilters));
        });
        return next;
      });

      toast.success(
        `Đã gửi ${res.data?.sentFarmerCount || 0} email cảnh báo cho ${
          res.data?.sentFarmerCount || 0
        } nông dân.`
      );
    } catch (error) {
      console.error("Lỗi gửi cảnh báo hàng loạt:", error);
      toast.error(error.response?.data?.message || "Không thể gửi cảnh báo hàng loạt");
    } finally {
      setSendingAllWarnings(false);
    }
  };

  if (loading && !statistics) {
    return <LoadingScreen fullScreen={true} message="Đang tải thống kê admin..." />;
  }

  const seasonBanner = formatCurrentSeasonBanner(currentSeason);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6 lg:p-6">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3">
        <div
          className={`mb-0 rounded-xl px-6 py-4 text-base font-medium shadow-sm ${seasonBanner.className}`}
        >
          {seasonBanner.content}
        </div>

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

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6 2xl:grid-cols-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                Cánh đồng
              </p>
              <CustomDropdown
                value={filterForm.fieldId}
                onChange={(value) => setFilterForm((prev) => ({ ...prev, fieldId: value }))}
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
            <p className="mt-3 text-3xl font-bold text-amber-600">
              {summary.pendingFarmerCount}
            </p>
            {/* <p className="mt-2 text-sm text-gray-500">
              Đã gửi trong phiên này: {warnedFarmerCountInSession}/{summary.pendingFarmerCount || 0}
            </p> */}
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
              <button
                type="button"
                onClick={handleWarningAll}
                disabled={
                  sendingAllWarnings ||
                  warnableFarmerGroups.length === 0 ||
                  loading ||
                  !appliedFilters.taskId
                }
                className="ml-1 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 font-semibold text-white shadow-md shadow-amber-200 transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
              >
                <BellRing size={15} />
                {sendingAllWarnings ? "Đang gửi..." : "Cảnh báo tất cả"}
              </button>
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
                    {paginatedRows.map((row) => {
                      const farmerGroup = pendingFarmerGroups.get(getFarmerGroupKey(row));
                      const isPending = row.status === "pending";
                      const isSendingRow =
                        sendingRecipientKey &&
                        sendingRecipientKey === getFarmerGroupKey(row);
                      const canWarn =
                        isPending && Boolean(farmerGroup?.farmerEmail) && Boolean(appliedFilters.taskId);
                      const isSentInSession = sentWarningKeys.has(
                        buildWarningSessionKey(getFarmerGroupKey(row), appliedFilters)
                      );

                      return (
                        <tr key={row.assignmentId} className="border-t border-gray-100 align-top">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-900">{row.plotName}</p>
                            <p className="mt-1 text-sm text-gray-500">
                              Diện tích: {Number(row.plotArea || 0).toLocaleString("vi-VN")} m2
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="inline-flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                              <MapIcon size={14} />
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
                            <p className="font-semibold text-gray-900">{row.farmerName}</p>
                            <p className="mt-1 text-sm text-gray-500">{row.farmerEmail || "--"}</p>
                            <p className="mt-1 text-sm text-gray-400">{row.farmerPhone || "--"}</p>
                            {/* {isSentInSession ? (
                              <p className="mt-2 text-xs font-medium text-sky-700">
                                Đã gửi trong phiên hiện tại.
                              </p>
                            ) : null} */}
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
                                disabled={!canWarn || sendingAllWarnings || Boolean(sendingRecipientKey)}
                                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
                                  !canWarn || sendingAllWarnings || Boolean(sendingRecipientKey)
                                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                    : isSentInSession
                                      ? "bg-sky-600 text-white shadow-md shadow-sky-200 hover:bg-sky-700"
                                      : "bg-amber-500 text-white shadow-md shadow-amber-200 hover:bg-amber-600"
                                }`}
                              >
                                <BellRing size={15} />
                                {!isPending
                                  ? "Đã xong"
                                  : isSendingRow
                                    ? "Đang gửi..."
                                    : isSentInSession
                                      ? "Đã gửi"
                                      : "Cảnh báo"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
