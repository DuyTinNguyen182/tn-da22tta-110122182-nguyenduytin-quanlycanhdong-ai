export const PAGE_SIZE = 10;

export const TIME_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "previous_week", label: "Tuần trước" },
  { value: "today", label: "Hôm nay" },
];

export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả xử lý" },
  { value: "unprocessed", label: "Chưa xử lý", dot: "bg-amber-400" },
  { value: "processed", label: "Đã xử lý", dot: "bg-emerald-500" },
];

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--";

export const formatSeasonLabel = (season) => {
  if (!season) return "";
  const baseName =
    season.seasonName || season.season?.name || season.name || "Mùa vụ";
  const year =
    season.year ||
    (season.startDate ? new Date(season.startDate).getFullYear() : "");
  return year ? `${baseName} ${year}` : baseName;
};

export const getDefaultSeasonId = (seasonDetails = []) =>
  seasonDetails.find((season) => season.status === "active")?._id ||
  seasonDetails[0]?._id ||
  "";

export const getSeasonStatusMeta = (status) => {
  if (status === "active") {
    return {
      label: "Đang hoạt động",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (status === "completed") {
    return {
      label: "Đã kết thúc",
      className: "border-gray-200 bg-gray-50 text-gray-700",
    };
  }

  return {
    label: "Chưa bắt đầu",
    className: "border-sky-200 bg-sky-50 text-sky-800",
  };
};

export const getPlotSummary = (log) => {
  const plotNames = Array.isArray(log?.plots)
    ? log.plots.map((plot) => plot?.name).filter(Boolean)
    : [];

  if (plotNames.length === 0) {
    return log?.scope === "all_plots" ? "Toàn bộ thửa tham gia vụ" : "--";
  }

  return plotNames.join(", ");
};

export const getCompactPlotSummary = (log) => {
  const plotNames = Array.isArray(log?.plots)
    ? log.plots.map((plot) => plot?.name).filter(Boolean)
    : [];

  if (plotNames.length === 0) {
    return log?.scope === "all_plots" ? "Toàn bộ thửa tham gia vụ" : "--";
  }

  if (plotNames.length >= 2) {
    return `${plotNames[0]}, ...`;
  }

  return plotNames[0];
};

export const isSeasonCompletedForLog = (log, selectedSeason) =>
  log?.seasonStatus === "completed" || selectedSeason?.status === "completed";

export const getStatusMeta = (status) => {
  if (status === "processed") {
    return {
      label: "Đã xử lý",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  return {
    label: "Chưa xử lý",
    className: "bg-amber-100 text-amber-700",
  };
};

export const getWarningMeta = (log) => {
  if (log?.warningSent) {
    return {
      label: "Đã gửi cảnh báo",
      className: "bg-sky-100 text-sky-700",
    };
  }

  return {
    label: "Chưa gửi cảnh báo",
    className: "bg-gray-100 text-gray-600",
  };
};

export const isInToday = (value) => {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

export const isInPreviousWeek = (value) => {
  const date = new Date(value);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfRange = new Date(startOfToday);
  startOfRange.setDate(startOfRange.getDate() - 7);

  return date >= startOfRange && date < startOfToday;
};

export const filterLogsByTimeRange = (logs, timeRange) => {
  const sortedLogs = [...logs].sort(
    (left, right) =>
      new Date(right.detectedAt || right.createdAt || 0) -
      new Date(left.detectedAt || left.createdAt || 0),
  );

  if (timeRange === "today") {
    return sortedLogs.filter((log) => isInToday(log.detectedAt || log.createdAt));
  }

  if (timeRange === "previous_week") {
    return sortedLogs.filter((log) =>
      isInPreviousWeek(log.detectedAt || log.createdAt),
    );
  }

  return sortedLogs;
};

export const buildWarningFormFromPreview = (previewForm) => ({
  title: previewForm?.title || "",
  content: previewForm?.content || "",
});
