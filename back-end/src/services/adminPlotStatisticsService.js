const DiaryLog = require("../models/diaryLogModel");
const Field = require("../models/fieldModel");
const Season = require("../models/seasonModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const Task = require("../models/taskModel");
const TaskDetail = require("../models/taskDetailModel");

const MIN_YEAR = 2020;

const isAdminUser = (user) => (user?.role || "").toLowerCase() === "admin";

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
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

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

const getSeasonYear = (seasonDetail) => {
  const sourceDate =
    seasonDetail?.startDate || seasonDetail?.endDate || seasonDetail?.createdAt || null;

  if (!sourceDate) {
    return null;
  }

  return new Date(sourceDate).getFullYear();
};

const buildSeasonLabel = (seasonDetail) => {
  const seasonName = seasonDetail?.season?.name || "Không xác định";
  const year = getSeasonYear(seasonDetail);
  return year ? `${seasonName} ${year}` : seasonName;
};

const getLogTaskInfo = (log) => {
  const taskDetail = log.taskDetail || null;
  const task = taskDetail?.task || log.task || null;

  return {
    taskId: task?._id ? String(task._id) : task ? String(task) : "",
    taskName: task?.name || "",
    taskDetailId: taskDetail?._id
      ? String(taskDetail._id)
      : taskDetail
        ? String(taskDetail)
        : "",
    taskDetailName: taskDetail?.name || "",
    activityLabel:
      taskDetail?.name && task?.name
        ? `${task.name} - ${taskDetail.name}`
        : taskDetail?.name || task?.name || "Chưa xác định",
  };
};

const buildSeasonDetailQuery = (filters) => {
  const query = {};

  if (filters.seasonId) {
    query.season = filters.seasonId;
  }

  if (filters.year) {
    query.startDate = {
      $gte: new Date(filters.year, 0, 1),
      $lt: new Date(filters.year + 1, 0, 1),
    };
  }

  return query;
};

const buildLogTaskQuery = async (filters) => {
  if (filters.taskDetailId) {
    return { taskDetail: filters.taskDetailId };
  }

  if (!filters.taskId) {
    return {};
  }

  const taskDetailIds = await TaskDetail.find({ task: filters.taskId }).distinct("_id");

  if (taskDetailIds.length === 0) {
    return { task: filters.taskId };
  }

  return {
    $or: [{ task: filters.taskId }, { taskDetail: { $in: taskDetailIds } }],
  };
};

const sortRows = (rows, statusFilter) => {
  rows.sort((left, right) => {
    if (statusFilter === "all" && left.status !== right.status) {
      return left.status === "pending" ? -1 : 1;
    }

    return (
      left.fieldName.localeCompare(right.fieldName, "vi") ||
      left.seasonLabel.localeCompare(right.seasonLabel, "vi") ||
      left.plotName.localeCompare(right.plotName, "vi") ||
      left.farmerName.localeCompare(right.farmerName, "vi")
    );
  });

  return rows;
};

const getSelectedActivityMeta = async (filters) => {
  const [selectedTask, selectedTaskDetail] = await Promise.all([
    filters.taskId ? Task.findById(filters.taskId).lean() : null,
    filters.taskDetailId
      ? TaskDetail.findById(filters.taskDetailId)
          .populate("task", "name")
          .lean()
      : null,
  ]);

  if (filters.taskId && !selectedTask) {
    throw new Error("Không tìm thấy công việc đã chọn");
  }

  if (filters.taskDetailId && !selectedTaskDetail) {
    throw new Error("Không tìm thấy chi tiết công việc đã chọn");
  }

  if (
    selectedTask &&
    selectedTaskDetail &&
    String(selectedTaskDetail.task?._id || selectedTaskDetail.task) !== String(selectedTask._id)
  ) {
    throw new Error("Chi tiết công việc không thuộc công việc đã chọn");
  }

  const taskName = selectedTaskDetail?.task?.name || selectedTask?.name || "";
  const taskDetailName = selectedTaskDetail?.name || "";
  const activityLabel =
    taskName && taskDetailName
      ? `${taskName} - ${taskDetailName}`
      : taskDetailName || taskName || "";

  return {
    taskId: selectedTask?._id
      ? String(selectedTask._id)
      : selectedTaskDetail?.task?._id
        ? String(selectedTaskDetail.task._id)
        : selectedTaskDetail?.task
          ? String(selectedTaskDetail.task)
          : "",
    taskName,
    taskDetailId: selectedTaskDetail?._id ? String(selectedTaskDetail._id) : "",
    taskDetailName,
    activityLabel,
  };
};

const getAdminPlotTaskStatistics = async (rawFilters, currentUser) => {
  if (!isAdminUser(currentUser)) {
    throw new Error("Chỉ admin mới được xem thống kê theo thửa ruộng");
  }

  const filters = normalizeFilters(rawFilters);
  const selectedActivity = await getSelectedActivityMeta(filters);

  const seasonDetails = await SeasonDetail.find(buildSeasonDetailQuery(filters))
    .populate("season", "name")
    .sort({ startDate: -1, createdAt: -1 })
    .lean();

  const seasonDetailIds = seasonDetails.map((item) => item._id);

  if (seasonDetailIds.length === 0) {
    return {
      filters,
      summary: {
        totalPlotCount: 0,
        doneCount: 0,
        pendingCount: 0,
        visibleCount: 0,
        completionRate: 0,
        matchedSeasonCount: 0,
      },
      selectedActivity,
      rows: [],
    };
  }

  const assignments = await SeasonPlotAssignment.find({
    seasonDetail: { $in: seasonDetailIds },
    status: "active",
    ...(filters.fieldId ? { field: filters.fieldId } : {}),
  })
    .populate("field", "name")
    .populate("plot", "name area status")
    .populate("user", "fullName email phone")
    .populate({
      path: "seasonDetail",
      select: "season startDate endDate createdAt",
      populate: { path: "season", select: "name" },
    })
    .lean();

  const assignmentIds = assignments.map((item) => item._id);

  if (assignmentIds.length === 0) {
    return {
      filters,
      summary: {
        totalPlotCount: 0,
        doneCount: 0,
        pendingCount: 0,
        visibleCount: 0,
        completionRate: 0,
        matchedSeasonCount: seasonDetails.length,
      },
      selectedActivity,
      rows: [],
    };
  }

  const logs = await DiaryLog.find({
    seasonPlotAssignments: { $in: assignmentIds },
    ...(await buildLogTaskQuery(filters)),
  })
    .select("task taskDetail date createdAt seasonPlotAssignments")
    .populate("task", "name")
    .populate({
      path: "taskDetail",
      select: "name task",
      populate: { path: "task", select: "name" },
    })
    .sort({ date: -1, createdAt: -1 })
    .lean();

  const assignmentIdSet = new Set(assignmentIds.map((item) => String(item)));
  const latestLogByAssignmentId = new Map();

  logs.forEach((log) => {
    const taskInfo = getLogTaskInfo(log);

    (log.seasonPlotAssignments || []).forEach((assignmentId) => {
      const key = String(assignmentId);

      if (!assignmentIdSet.has(key) || latestLogByAssignmentId.has(key)) {
        return;
      }

      latestLogByAssignmentId.set(key, {
        ...taskInfo,
        performedAt: log.date || log.createdAt || null,
      });
    });
  });

  const fallbackTaskName = selectedActivity.taskName || "Chưa chọn công việc";
  const fallbackTaskDetailName = selectedActivity.taskDetailName || "";
  const fallbackActivityLabel = selectedActivity.activityLabel || "Chưa thực hiện";

  const rows = assignments.map((assignment) => {
    const matchedLog = latestLogByAssignmentId.get(String(assignment._id)) || null;
    const seasonDetail = assignment.seasonDetail || null;
    const seasonLabel = buildSeasonLabel(seasonDetail);
    const year = getSeasonYear(seasonDetail);

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
      farmerId: assignment.user?._id ? String(assignment.user._id) : "",
      farmerName: assignment.user?.fullName || "Không xác định",
      farmerEmail: assignment.user?.email || "",
      farmerPhone: assignment.user?.phone || "",
      taskId: matchedLog?.taskId || selectedActivity.taskId || "",
      taskName: matchedLog?.taskName || fallbackTaskName,
      taskDetailId: matchedLog?.taskDetailId || selectedActivity.taskDetailId || "",
      taskDetailName: matchedLog?.taskDetailName || fallbackTaskDetailName,
      activityLabel: matchedLog?.activityLabel || fallbackActivityLabel,
      performedAt: matchedLog?.performedAt || null,
      status: matchedLog ? "done" : "pending",
      statusLabel: matchedLog ? "Đã làm" : "Chưa làm",
      warningAvailable: !matchedLog && Boolean(assignment.user?.email),
    };
  });

  const doneCount = rows.filter((item) => item.status === "done").length;
  const pendingCount = rows.length - doneCount;
  const filteredRows =
    filters.status === "all" ? rows : rows.filter((item) => item.status === filters.status);

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
    selectedActivity,
    rows: sortRows(filteredRows, filters.status),
  };
};

const getAdminPlotStatisticsOptions = async () => {
  const [fields, seasons, tasks] = await Promise.all([
    Field.find()
      .sort({ name: 1 })
      .select("_id name")
      .lean(),
    Season.find({ isVisible: { $ne: false } })
      .sort({ name: 1 })
      .select("_id name")
      .lean(),
    Task.find().sort({ name: 1 }).lean(),
  ]);

  const taskIds = tasks.map((item) => item._id);
  const taskDetails = taskIds.length
    ? await TaskDetail.find({ task: { $in: taskIds } }).sort({ name: 1 }).lean()
    : [];

  const taskDetailsByTaskId = new Map();
  taskDetails.forEach((detail) => {
    const key = String(detail.task);
    if (!taskDetailsByTaskId.has(key)) {
      taskDetailsByTaskId.set(key, []);
    }
    taskDetailsByTaskId.get(key).push({
      _id: String(detail._id),
      name: detail.name || "",
      taskId: key,
    });
  });

  return {
    fields: fields.map((item) => ({
      _id: String(item._id),
      name: item.name || "",
    })),
    seasons: seasons.map((item) => ({
      _id: String(item._id),
      name: item.name || "",
    })),
    tasks: tasks.map((item) => ({
      _id: String(item._id),
      name: item.name || "",
      taskDetails: taskDetailsByTaskId.get(String(item._id)) || [],
    })),
    statuses: [
      { value: "all", label: "Tất cả" },
      { value: "done", label: "Đã làm" },
      { value: "pending", label: "Chưa làm" },
    ],
    years: Array.from(
      { length: new Date().getFullYear() - MIN_YEAR + 1 },
      (_, index) => MIN_YEAR + index
    ),
  };
};

module.exports = {
  getAdminPlotTaskStatistics,
  getAdminPlotStatisticsOptions,
};
