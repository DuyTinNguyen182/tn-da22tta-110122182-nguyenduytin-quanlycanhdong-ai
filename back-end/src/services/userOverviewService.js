// Lấy mùa vụ hiện tại của nông dân (có assignment, đang active)
const getCurrentSeasonInfo = async (user) => {
  // Lấy tất cả assignment của user
  const userAssignments = await SeasonPlotAssignment.find({ user: user.id, status: "active" })
    .populate({
      path: "seasonDetail",
      populate: { path: "season", select: "name" },
      select: "season startDate endDate",
    })
    .lean();
  // Lọc ra các seasonDetail đang active
  const now = new Date();
  const activeSeasons = userAssignments
    .map(a => a.seasonDetail)
    .filter(sd => sd && sd.startDate && new Date(sd.startDate) <= now && (!sd.endDate || new Date(sd.endDate) >= now));
  if (!activeSeasons.length) return null;
  // Ưu tiên mùa vụ có startDate gần nhất nhưng <= hôm nay
  activeSeasons.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  const current = activeSeasons[0];
  return {
    seasonName: current.season?.name || "",
    startDate: current.startDate,
    endDate: current.endDate,
  };
};

const Field = require("../models/fieldModel");
const Plot = require("../models/plotModel");
const Season = require("../models/seasonModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const Task = require("../models/taskModel");
const TaskDetail = require("../models/taskDetailModel");
const DiaryLog = require("../models/diaryLogModel");

const MIN_YEAR = 2023;

const normalizeYear = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < MIN_YEAR) {
    throw new Error("Năm thống kê không hợp lệ");
  }
  return parsed;
};

const normalizeStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "done" || normalized === "pending") {
    return normalized;
  }
  return "all";
};

const normalizeFilters = (query = {}) => ({
  fieldId: query.fieldId || "",
  seasonId: query.seasonId || "",
  year: normalizeYear(query.year),
  taskId: query.taskId || "",
  taskDetailId: query.taskDetailId || "",
  status: normalizeStatus(query.status),
});


const getDashboardOptions = async (user) => {
  // Chỉ lấy cánh đồng mà nông dân có thửa
  const userPlots = await Plot.find({ user: user.id }).select("_id field").lean();
  const fieldIds = [...new Set(userPlots.map((p) => String(p.field)))];
  const fields = await Field.find({ _id: { $in: fieldIds } }).select("_id name").lean();
  const plots = userPlots.map((item) => ({ _id: String(item._id), name: item.name || "", fieldId: String(item.field) }));
  const seasons = await Season.find({ isVisible: { $ne: false } }).select("_id name").lean();
  const tasks = await Task.find().select("_id name").lean();
  const taskIds = tasks.map((item) => item._id);
  const taskDetails = taskIds.length ? await TaskDetail.find({ task: { $in: taskIds } }).lean() : [];
  const taskDetailsByTaskId = new Map();
  taskDetails.forEach((detail) => {
    const key = String(detail.task);
    if (!taskDetailsByTaskId.has(key)) taskDetailsByTaskId.set(key, []);
    taskDetailsByTaskId.get(key).push({ _id: String(detail._id), name: detail.name || "", taskId: key });
  });
  return {
    fields: fields.map((item) => ({ _id: String(item._id), name: item.name || "" })),
    plots,
    seasons: seasons.map((item) => ({ _id: String(item._id), name: item.name || "" })),
    tasks: tasks.map((item) => ({ _id: String(item._id), name: item.name || "", taskDetails: taskDetailsByTaskId.get(String(item._id)) || [] })),
    statuses: [
      { value: "all", label: "Tất cả" },
      { value: "done", label: "Đã làm" },
      { value: "pending", label: "Chưa làm" },
    ],
    years: Array.from({ length: new Date().getFullYear() - MIN_YEAR + 1 }, (_, index) => MIN_YEAR + index),
  };
};


const buildSeasonDetailQuery = (filters) => {
  const query = {};
  if (filters.seasonId) {
    query.season = filters.seasonId;
  }
  // Chỉ lọc theo năm nếu filters.year là số hợp lệ
  if (typeof filters.year === "number" && !isNaN(filters.year)) {
    query.startDate = {
      $gte: new Date(filters.year, 0, 1),
      $lt: new Date(filters.year + 1, 0, 1),
    };
  }
  return query;
};

const getDashboardStatistics = async (rawFilters, user) => {
  const filters = normalizeFilters(rawFilters);
  // Find all plots of this user
  const userPlots = await Plot.find({ user: user.id }).select("_id field").lean();
  const plotIds = userPlots.map((p) => p._id);
  if (!plotIds.length) {
    return {
      filters,
      summary: { totalPlotCount: 0, doneCount: 0, pendingCount: 0, visibleCount: 0, completionRate: 0, matchedSeasonCount: 0 },
      rows: [],
    };
  }
  // Lọc seasonDetail theo mùa vụ và năm (giống admin)
  const seasonDetails = await SeasonDetail.find(buildSeasonDetailQuery(filters))
    .populate("season", "name")
    .sort({ startDate: -1, createdAt: -1 })
    .lean();
  const seasonDetailIds = seasonDetails.map((item) => item._id);
  if (seasonDetailIds.length === 0) {
    return {
      filters,
      summary: { totalPlotCount: 0, doneCount: 0, pendingCount: 0, visibleCount: 0, completionRate: 0, matchedSeasonCount: 0 },
      rows: [],
    };
  }
  // Chỉ lấy assignment có seasonDetail thuộc năm đã lọc
  const assignmentQuery = {
    plot: { $in: plotIds },
    status: "active",
    seasonDetail: { $in: seasonDetailIds },
    ...(filters.fieldId ? { field: filters.fieldId } : {}),
  };
  const assignments = await SeasonPlotAssignment.find(assignmentQuery)
    .populate("field", "name")
    .populate("plot", "name area status")
    .populate({ path: "seasonDetail", select: "season startDate endDate createdAt", populate: { path: "season", select: "name" } })
    .lean();
  const assignmentIds = assignments.map((item) => item._id);
  if (!assignmentIds.length) {
    return {
      filters,
      summary: { totalPlotCount: 0, doneCount: 0, pendingCount: 0, visibleCount: 0, completionRate: 0, matchedSeasonCount: 0 },
      rows: [],
    };
  }
  // Find logs for these assignments
  const logs = await DiaryLog.find({ seasonPlotAssignments: { $in: assignmentIds }, ...(filters.taskDetailId ? { taskDetail: filters.taskDetailId } : filters.taskId ? { task: filters.taskId } : {}) })
    .select("task taskDetail date createdAt seasonPlotAssignments")
    .populate("task", "name")
    .populate({ path: "taskDetail", select: "name task", populate: { path: "task", select: "name" } })
    .sort({ date: -1, createdAt: -1 })
    .lean();
  const assignmentIdSet = new Set(assignmentIds.map((item) => String(item)));
  const latestLogByAssignmentId = new Map();
  logs.forEach((log) => {
    (log.seasonPlotAssignments || []).forEach((assignmentId) => {
      const key = String(assignmentId);
      if (!assignmentIdSet.has(key) || latestLogByAssignmentId.has(key)) return;
      latestLogByAssignmentId.set(key, {
        performedAt: log.date || log.createdAt || null,
        status: "done",
      });
    });
  });
  const rows = assignments.map((assignment) => {
    const seasonDetail = assignment.seasonDetail || null;
    const seasonLabel = seasonDetail?.season?.name || "Không xác định";
    const year = seasonDetail?.startDate ? new Date(seasonDetail.startDate).getFullYear() : null;
    const matchedLog = latestLogByAssignmentId.get(String(assignment._id)) || null;
    return {
      assignmentId: String(assignment._id),
      plotId: assignment.plot?._id ? String(assignment.plot._id) : "",
      plotName: assignment.plot?.name || "Không xác định",
      plotArea: Number(assignment.plot?.area || 0),
      fieldId: assignment.field?._id ? String(assignment.field._id) : "",
      fieldName: assignment.field?.name || "Không xác định",
      seasonDetailId: seasonDetail?._id ? String(seasonDetail._id) : "",
      seasonId: seasonDetail?.season?._id ? String(seasonDetail.season._id) : "",
      seasonName: seasonDetail?.season?.name || "Không xác định",
      seasonLabel,
      year,
      performedAt: matchedLog?.performedAt || null,
      status: matchedLog ? "done" : "pending",
      statusLabel: matchedLog ? "Đã làm" : "Chưa làm",
    };
  });
  const doneCount = rows.filter((item) => item.status === "done").length;
  const pendingCount = rows.length - doneCount;
  const filteredRows = filters.status === "all" ? rows : rows.filter((item) => item.status === filters.status);
  return {
    filters,
    summary: {
      totalPlotCount: rows.length,
      doneCount,
      pendingCount,
      visibleCount: filteredRows.length,
      completionRate: rows.length ? Number(((doneCount / rows.length) * 100).toFixed(1)) : 0,
      matchedSeasonCount: new Set(rows.map((item) => item.seasonDetailId)).size,
    },
    rows: filteredRows,
  };
};

module.exports = {
  getDashboardOptions,
  getDashboardStatistics,
  getCurrentSeasonInfo,
};
