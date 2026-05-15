import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import { useFeedback } from "../../../hooks/useFeedback";
import OverviewFilterPanel from "./components/OverviewFilterPanel";
import OverviewSummaryCards from "./components/OverviewSummaryCards";
import OverviewFarmerTable from "./components/OverviewFarmerTable";
import {
  ROWS_PER_PAGE,
  buildDefaultFilters,
  buildQueryParams,
  buildWarningSessionKey,
  formatCurrentSeasonBanner,
  getFarmerGroupKey,
  getStatusClasses,
  getStatusText,
  summarizeLabels,
} from "./adminOverviewUtils.jsx";

const emptySummary = {
  totalPlotCount: 0,
  doneCount: 0,
  pendingCount: 0,
  visibleCount: 0,
  completionRate: 0,
  matchedSeasonCount: 0,
  pendingFarmerCount: 0,
  pendingFarmerWithEmailCount: 0,
};

const emptyOptions = {
  fields: [],
  seasons: [],
  tasks: [],
  statuses: [],
  years: [],
};

const AdminOverview = () => {
  const { toast, confirm } = useFeedback();
  const [options, setOptions] = useState(emptyOptions);
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
  const [expandedFarmerKeys, setExpandedFarmerKeys] = useState(() => new Set());

  useEffect(() => {
    api
      .get("/admin/current-season")
      .then((res) => setCurrentSeason(res.data))
      .catch(() => setCurrentSeason(null))
      .finally(() => setCurrentSeasonLoaded(true));
  }, []);

  const fetchOptions = useCallback(async () => {
    const res = await api.get("/admin/plot-statistics/options");
    setOptions(res.data || emptyOptions);
  }, []);

  const fetchStatistics = useCallback(
    async (filters, { silent = false } = {}) => {
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
    },
    [toast]
  );

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
  }, [fetchOptions, toast]);

  useEffect(() => {
    if (!bootstrapped || !defaultSeasonApplied) return;
    fetchStatistics(appliedFilters);
  }, [appliedFilters, bootstrapped, defaultSeasonApplied, fetchStatistics]);

  const resolveInitialFilters = useMemo(() => {
    if (!currentSeason?.seasonId) {
      return buildDefaultFilters();
    }

    const matchedSeason = options.seasons.find((item) => item._id === currentSeason.seasonId);
    if (!matchedSeason) {
      return buildDefaultFilters();
    }

    const seasonYear =
      currentSeason.year !== undefined && currentSeason.year !== null
        ? String(currentSeason.year)
        : currentSeason.startDate
          ? String(new Date(currentSeason.startDate).getFullYear())
          : undefined;

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

  const rows = useMemo(() => statistics?.rows || [], [statistics]);
  const summary = useMemo(() => statistics?.summary || emptySummary, [statistics]);
  const selectedActivity = statistics?.selectedActivity || {};
  const hasSelectedTask = Boolean(appliedFilters.taskId);
  const selectedTaskLabel = selectedActivity.activityLabel || "Tất cả công việc";
  const matchedSeasonText =
    summary.matchedSeasonCount > 0
      ? `${summary.matchedSeasonCount} lịch mùa vụ`
      : "Chưa có lịch mùa vụ phù hợp";

  const groupedFarmerRows = useMemo(() => {
    const groups = new Map();

    rows.forEach((row) => {
      const groupKey = getFarmerGroupKey(row) || `assignment-${row.assignmentId}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          recipientKey: groupKey,
          farmerId: row.farmerId || "",
          farmerName: row.farmerName || "Nông dân",
          farmerEmail: row.farmerEmail || "",
          farmerPhone: row.farmerPhone || "",
          rows: [],
          totalArea: 0,
          doneCount: 0,
          pendingCount: 0,
          fieldNames: [],
          seasonLabels: [],
        });
      }

      const group = groups.get(groupKey);
      group.rows.push(row);
      group.totalArea += Number(row.plotArea || 0);
      group.fieldNames.push(row.fieldName || "");
      group.seasonLabels.push(row.seasonLabel || "");

      if (row.status === "done") {
        group.doneCount += 1;
      } else {
        group.pendingCount += 1;
      }
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      totalPlotCount: group.rows.length,
      fieldSummary: summarizeLabels(group.fieldNames),
      seasonSummary: summarizeLabels(group.seasonLabels),
    }));
  }, [rows]);

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
    () => Array.from(pendingFarmerGroups.values()).filter((item) => item.recipientKey),
    [pendingFarmerGroups]
  );

  const totalPages = Math.max(1, Math.ceil(groupedFarmerRows.length / ROWS_PER_PAGE));
  const paginatedFarmerRows = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return groupedFarmerRows.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [groupedFarmerRows, currentPage]);

  useEffect(() => {
    setExpandedFarmerKeys((prev) => {
      const validKeys = new Set(groupedFarmerRows.map((item) => item.recipientKey));
      const next = new Set([...prev].filter((key) => validKeys.has(key)));
      return next.size === prev.size ? prev : next;
    });
  }, [groupedFarmerRows]);

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

  const toggleFarmerExpanded = (recipientKey) => {
    setExpandedFarmerKeys((prev) => {
      const next = new Set(prev);

      if (next.has(recipientKey)) {
        next.delete(recipientKey);
      } else {
        next.add(recipientKey);
      }

      return next;
    });
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

  const handleWarning = async (groupOrRow) => {
    if (!ensureTaskSelected()) return;

    const recipientKey = groupOrRow?.recipientKey || getFarmerGroupKey(groupOrRow);
    const group = pendingFarmerGroups.get(recipientKey);

    if (!group) {
      toast.warning("Nông dân này hiện không còn việc tồn đọng phù hợp để cảnh báo.");
      return;
    }

    const isAlreadySentInSession = sentWarningKeys.has(
      buildWarningSessionKey(group.recipientKey, appliedFilters)
    );

    const confirmed = await confirm({
      title: isAlreadySentInSession
        ? "Gửi lại cảnh báo cho nông dân này?"
        : "Gửi cảnh báo cho nông dân này?",
      message: `${group.farmerName} đang có ${group.rows.length} thửa chưa thực hiện "${selectedTaskLabel}".`,
      confirmText: isAlreadySentInSession ? "Gửi lại cảnh báo" : "Gửi cảnh báo",
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
      const hasWebDelivery = Boolean(recipient?.webSent);
      const hasEmailDelivery = Boolean(recipient?.emailSent);
      toast.success(
        recipient
          ? hasWebDelivery && hasEmailDelivery
            ? `Đã gửi cảnh báo cho ${recipient.farmerName} trên web và email (${recipient.pendingPlotCount} thửa).`
            : hasWebDelivery
              ? `Đã gửi cảnh báo cho ${recipient.farmerName} trên giao diện web (${recipient.pendingPlotCount} thửa).`
              : `Đã gửi cảnh báo cho ${recipient.farmerName}.`
          : `Đã gửi cảnh báo cho ${group.farmerName}.`
      );
    } catch (error) {
      console.error("Lỗi gửi cảnh báo cho nông dân:", error);
      toast.error(error.response?.data?.message || "Không thể gửi cảnh báo");
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
      message: `Hệ thống sẽ gửi cảnh báo lên giao diện web cho ${warnableFarmerGroups.length} nông dân và gộp ${totalPendingPlots} thửa chưa làm theo đúng người nhận.`,
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
        `Đã gửi cảnh báo web cho ${res.data?.webFarmerCount || 0} nông dân${
          res.data?.emailedFarmerCount
            ? ` và email cho ${res.data.emailedFarmerCount} nông dân`
            : ""
        }.`
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

        <OverviewFilterPanel
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onReset={handleResetFilters}
          onApply={handleApplyFilters}
          filterForm={filterForm}
          setFilterForm={setFilterForm}
          fieldOptions={fieldOptions}
          seasonOptions={seasonOptions}
          yearOptions={yearOptions}
          taskOptions={taskOptions}
          taskDetailOptions={taskDetailOptions}
          statusOptions={statusOptions}
          currentTask={currentTask}
          onTaskChange={handleTaskChange}
        />

        <OverviewSummaryCards
          summary={summary}
          selectedTaskLabel={selectedTaskLabel}
          matchedSeasonText={matchedSeasonText}
        />

        <OverviewFarmerTable
          loading={loading}
          hasSelectedTask={hasSelectedTask}
          warnableFarmerGroups={warnableFarmerGroups}
          sendingAllWarnings={sendingAllWarnings}
          onWarningAll={handleWarningAll}
          rows={rows}
          paginatedFarmerRows={paginatedFarmerRows}
          pendingFarmerGroups={pendingFarmerGroups}
          expandedFarmerKeys={expandedFarmerKeys}
          sendingRecipientKey={sendingRecipientKey}
          sentWarningKeys={sentWarningKeys}
          appliedFilters={appliedFilters}
          selectedTaskLabel={selectedTaskLabel}
          onToggleFarmer={toggleFarmerExpanded}
          onWarning={handleWarning}
          buildWarningSessionKey={buildWarningSessionKey}
          getStatusClasses={getStatusClasses}
          getStatusText={getStatusText}
          summary={summary}
          groupedFarmerRows={groupedFarmerRows}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default AdminOverview;
