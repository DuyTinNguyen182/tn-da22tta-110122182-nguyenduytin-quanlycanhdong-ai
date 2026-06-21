const DiaryLog = require("../models/farmingLogModel");
const Field = require("../models/fieldModel");
const Season = require("../models/seasonModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const Stage = require("../models/stageModel");
const Task = require("../models/taskModel");
const {
  buildPlotWarningEmailTemplate,
} = require("../templates/plotWarningEmailTemplate");
const announcementService = require("./announcementService");
const { sendMail } = require("./mailService");

const MIN_YEAR = 2023;

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
  stageId: query.stageId || "",
  taskId: query.taskId || "",
  status: normalizeStatus(query.status),
});

const getSeasonYear = (seasonDetail) => {
  if (typeof seasonDetail?.year === "number") {
    return seasonDetail.year;
  }

  const sourceDate =
    seasonDetail?.startDate ||
    seasonDetail?.endDate ||
    seasonDetail?.createdAt ||
    null;

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
  const task = log.task || null;
  const stage = task?.stage || null;

  return {
    taskId: task?._id ? String(task._id) : task ? String(task) : "",
    taskName: task?.name || "",
    stageId: stage?._id ? String(stage._id) : stage ? String(stage) : "",
    stageName: stage?.name || "",
    activityLabel: task?.name || stage?.name || "Chưa xác định",
  };
};

const buildSeasonDetailQuery = (filters) => {
  const query = {};

  if (filters.seasonId) {
    query.season = filters.seasonId;
  }

  if (filters.year) {
    query.$or = [
      { year: filters.year },
      {
        $and: [
          { $or: [{ year: { $exists: false } }, { year: null }] },
          {
            startDate: {
              $gte: new Date(filters.year, 0, 1),
              $lt: new Date(filters.year + 1, 0, 1),
            },
          },
        ],
      },
    ];
  }

  return query;
};

const buildLogTaskQuery = async (filters) => {
  if (filters.taskId) {
    return { task: filters.taskId };
  }

  if (!filters.stageId) {
    return {};
  }

  const taskIds = await Task.find({ stage: filters.stageId }).distinct("_id");

  if (taskIds.length === 0) {
    return { task: { $in: [] } };
  }

  return { task: { $in: taskIds } };
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

const getFarmerGroupKey = (row) =>
  String(row?.farmerId || row?.farmerEmail || "")
    .trim()
    .toLowerCase();

const buildPlotWarningAnnouncement = ({
  farmerName,
  rows,
  selectedActivity,
  adminName,
}) => {
  const activityLabel =
    selectedActivity?.activityLabel ||
    rows[0]?.activityLabel ||
    "công việc được giao";
  const introLine = `Mùa vụ ${selectedActivity?.seasonLabel || rows[0]?.seasonLabel || "không xác định"}: Hệ thống ghi nhận bạn chưa thực hiện "${activityLabel}" cho ${rows.length} thửa ruộng sau:`;
  const plotLines = rows.map(
    (row, index) =>
      `${index + 1}. ${row.plotName} | ${row.fieldName} | Diện tích: ${Number(
        row.plotArea || 0,
      ).toLocaleString("vi-VN")} m2`,
  );

  return {
    title: `[Cảnh báo] Nhắc thực hiện ${activityLabel}`,
    content: [
      `Xin chào ${farmerName},`,
      "",
      introLine,
      ...plotLines,
      "",
      "Vui lòng sắp xếp thực hiện sớm để đảm bảo tiến độ mùa vụ.",
      adminName ? `Người nhắc: ${adminName}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
};

const getSelectedActivityMeta = async (filters) => {
  const [selectedTask, selectedTaskDetail] = await Promise.all([
    filters.taskId
      ? Task.findById(filters.taskId).populate("stage", "name order").lean()
      : null,
    filters.stageId ? Stage.findById(filters.stageId).lean() : null,
  ]);

  if (filters.taskId && !selectedTask) {
    throw new Error("Không tìm thấy công việc đã chọn");
  }

  if (filters.stageId && !selectedTaskDetail) {
    throw new Error("Không tìm thấy giai đoạn đã chọn");
  }

  if (
    selectedTask &&
    selectedTaskDetail &&
    String(selectedTask.stage?._id || selectedTask.stage) !==
      String(selectedTaskDetail._id)
  ) {
    throw new Error("Công việc không thuộc giai đoạn đã chọn");
  }

  const stageName = selectedTaskDetail?.name || selectedTask?.stage?.name || "";
  const taskName = selectedTask?.name || "";
  const activityLabel =
    stageName && taskName
      ? `${stageName} - ${taskName}`
      : taskName || stageName || "";

  return {
    stageId: selectedTaskDetail?._id ? String(selectedTaskDetail._id) : "",
    stageName,
    taskId: selectedTask?._id ? String(selectedTask._id) : "",
    taskName,
    activityLabel,
  };
};

const buildPlotStatisticsDataset = async (rawFilters, currentUser) => {
  if (!isAdminUser(currentUser)) {
    throw new Error("Chỉ admin mới được xem thống kê theo thửa ruộng");
  }

  const filters = normalizeFilters(rawFilters);
  const selectedActivity = await getSelectedActivityMeta(filters);

  const seasonDetails = await SeasonDetail.find(buildSeasonDetailQuery(filters))
    .populate("season", "name")
    .sort({ year: -1, startDate: -1, createdAt: -1 })
    .lean();

  const seasonDetailIds = seasonDetails.map((item) => item._id);

  if (seasonDetailIds.length === 0) {
    return {
      filters,
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
      select: "season year startDate endDate createdAt",
      populate: { path: "season", select: "name" },
    })
    .lean();

  const assignmentIds = assignments.map((item) => item._id);

  if (assignmentIds.length === 0) {
    return {
      filters,
      selectedActivity,
      rows: [],
    };
  }

  const logs = await DiaryLog.find({
    seasonPlotAssignments: { $in: assignmentIds },
    ...(await buildLogTaskQuery(filters)),
  })
    .select("task date createdAt seasonPlotAssignments")
    .populate({
      path: "task",
      select: "name stage",
      populate: { path: "stage", select: "name" },
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
  const fallbackStageName = selectedActivity.stageName || "";
  const fallbackActivityLabel =
    selectedActivity.activityLabel || "Chưa thực hiện";

  const rows = assignments.map((assignment) => {
    const matchedLog =
      latestLogByAssignmentId.get(String(assignment._id)) || null;
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
      seasonId: seasonDetail?.season?._id
        ? String(seasonDetail.season._id)
        : "",
      seasonName: seasonDetail?.season?.name || "Không xác định",
      seasonLabel,
      year,
      farmerId: assignment.user?._id ? String(assignment.user._id) : "",
      farmerName: assignment.user?.fullName || "Không xác định",
      farmerEmail: assignment.user?.email || "",
      farmerPhone: assignment.user?.phone || "",
      taskId: matchedLog?.taskId || selectedActivity.taskId || "",
      taskName: matchedLog?.taskName || fallbackTaskName,
      stageId: matchedLog?.stageId || selectedActivity.stageId || "",
      stageName: matchedLog?.stageName || fallbackStageName,
      activityLabel: matchedLog?.activityLabel || fallbackActivityLabel,
      performedAt: matchedLog?.performedAt || null,
      status: matchedLog ? "done" : "pending",
      statusLabel: matchedLog ? "Đã làm" : "Chưa làm",
      warningAvailable:
        !matchedLog && Boolean(assignment.user?._id || assignment.user?.email),
      recipientKey: getFarmerGroupKey({
        farmerId: assignment.user?._id ? String(assignment.user._id) : "",
        farmerEmail: assignment.user?.email || "",
      }),
    };
  });

  return {
    filters,
    selectedActivity,
    rows: sortRows(rows, "all"),
    seasonDetails,
  };
};

const buildStatisticsSummary = (rows, filters = {}) => {
  const doneCount = rows.filter((item) => item.status === "done").length;
  const pendingRows = rows.filter((item) => item.status === "pending");
  const filteredRows =
    filters.status === "all"
      ? rows
      : rows.filter((item) => item.status === filters.status);

  const pendingFarmerKeySet = new Set(
    pendingRows.map((row) => getFarmerGroupKey(row)).filter(Boolean),
  );
  const pendingFarmerWithEmailKeySet = new Set(
    pendingRows
      .filter((row) => row.farmerEmail)
      .map((row) => getFarmerGroupKey(row))
      .filter(Boolean),
  );

  return {
    filteredRows: sortRows([...filteredRows], filters.status),
    summary: {
      totalPlotCount: rows.length,
      doneCount,
      pendingCount: pendingRows.length,
      visibleCount: filteredRows.length,
      completionRate: rows.length
        ? Number(((doneCount / rows.length) * 100).toFixed(1))
        : 0,
      matchedSeasonCount: new Set(rows.map((item) => item.seasonDetailId)).size,
      pendingFarmerCount: pendingFarmerKeySet.size,
      pendingFarmerWithEmailCount: pendingFarmerWithEmailKeySet.size,
    },
  };
};

const groupPendingRowsByFarmer = (rows) => {
  const groups = new Map();

  rows
    .filter((row) => row.status === "pending")
    .forEach((row) => {
      const groupKey = getFarmerGroupKey(row);
      if (!groupKey || (!row.farmerId && !row.farmerEmail)) {
        return;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          groupKey,
          farmerId: row.farmerId || "",
          farmerName: row.farmerName || "Nông dân",
          farmerEmail: row.farmerEmail,
          farmerPhone: row.farmerPhone || "",
          rows: [],
        });
      }

      groups.get(groupKey).rows.push(row);
    });

  return groups;
};

const getAdminPlotTaskStatistics = async (rawFilters, currentUser) => {
  const dataset = await buildPlotStatisticsDataset(rawFilters, currentUser);
  const { filteredRows, summary } = buildStatisticsSummary(
    dataset.rows,
    dataset.filters,
  );

  // Tính toán cờ isCompletedSeason
  const now = new Date();
  let isCompletedSeason = false;

  if (dataset.seasonDetails && dataset.seasonDetails.length > 0) {
    // Nếu tất cả các chi tiết mùa vụ đang lọc đều có endDate và endDate < hiện tại -> đã kết thúc
    isCompletedSeason = dataset.seasonDetails.every(
      (s) => s.endDate && new Date(s.endDate) < now,
    );
  }

  // Bổ sung cờ này vào summary để Frontend (OverviewFarmerTable) bắt điều kiện chặn cảnh báo
  summary.isCompletedSeason = isCompletedSeason;

  return {
    filters: dataset.filters,
    summary,
    selectedActivity: dataset.selectedActivity,
    rows: filteredRows,
  };
};

const sendPlotTaskWarnings = async (payload = {}, currentUser) => {
  if (!isAdminUser(currentUser)) {
    throw new Error("Chỉ admin mới được gửi cảnh báo");
  }

  const sendAll = payload.sendAll === true;
  const recipientKey = String(payload.recipientKey || "")
    .trim()
    .toLowerCase();

  if (!sendAll && !recipientKey) {
    throw new Error("Vui lòng chọn nông dân cần gửi cảnh báo");
  }

  const dataset = await buildPlotStatisticsDataset(
    payload.filters || {},
    currentUser,
  );

  if (!dataset.selectedActivity.taskId) {
    throw new Error("Vui lòng chọn công việc trước khi gửi cảnh báo");
  }

  const groupedRecipients = groupPendingRowsByFarmer(dataset.rows);

  if (groupedRecipients.size === 0) {
    throw new Error("Không có nông dân nào đủ điều kiện nhận cảnh báo");
  }

  const targets = sendAll
    ? Array.from(groupedRecipients.values())
    : [groupedRecipients.get(recipientKey)].filter(Boolean);

  if (targets.length === 0) {
    throw new Error("Không tìm thấy nông dân phù hợp để gửi cảnh báo");
  }

  const recipients = [];

  for (const target of targets) {
    const announcementContent = buildPlotWarningAnnouncement({
      farmerName: target.farmerName,
      rows: target.rows,
      selectedActivity: dataset.selectedActivity,
      adminName: currentUser?.fullName || "",
    });

    let emailSent = false;
    let emailErrorMessage = "";

    if (target.farmerEmail) {
      try {
        const emailContent = buildPlotWarningEmailTemplate({
          farmerName: target.farmerName,
          rows: target.rows,
          selectedActivity: dataset.selectedActivity,
          adminName: currentUser?.fullName || "",
        });

        await sendMail({
          to: target.farmerEmail,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
        });

        emailSent = true;
      } catch (error) {
        emailErrorMessage = error.message || "Không thể gửi email";
      }
    }

    const createdAnnouncement = target.farmerId
      ? await announcementService.createSystemAnnouncement({
          type: "warning",
          title: announcementContent.title,
          content: announcementContent.content,
          isVisible: true,
          source: "plot-task-warning",
          audience: {
            scope: "users",
            userIds: [target.farmerId],
          },
          deliveryChannels: emailSent ? ["web", "email"] : ["web"],
        })
      : null;

    recipients.push({
      recipientKey: target.groupKey,
      farmerId: target.farmerId,
      farmerName: target.farmerName,
      farmerEmail: target.farmerEmail,
      pendingPlotCount: target.rows.length,
      plotNames: target.rows.map((row) => row.plotName),
      webSent: Boolean(createdAnnouncement),
      emailSent,
      emailErrorMessage,
    });
  }

  return {
    sendAll,
    activityLabel:
      dataset.selectedActivity.activityLabel ||
      dataset.rows[0]?.activityLabel ||
      "Công việc",
    sentFarmerCount: recipients.length,
    sentPlotCount: recipients.reduce(
      (total, item) => total + item.pendingPlotCount,
      0,
    ),
    webFarmerCount: recipients.filter((item) => item.webSent).length,
    emailedFarmerCount: recipients.filter((item) => item.emailSent).length,
    emailFailedFarmerCount: recipients.filter(
      (item) => item.farmerEmail && !item.emailSent,
    ).length,
    recipients,
  };
};

const getAdminPlotStatisticsOptions = async () => {
  const [fields, seasons, stages, tasks, seasonYears] = await Promise.all([
    Field.find().sort({ name: 1 }).select("_id name").lean(),
    Season.find({ isVisible: { $ne: false } })
      .sort({ name: 1 })
      .select("_id name")
      .lean(),
    Stage.find().sort({ order: 1, name: 1 }).select("_id name order").lean(),
    Task.find()
      .sort({ stage: 1, order: 1, name: 1 })
      .populate("stage", "name order")
      .lean(),
    SeasonDetail.find().select("year startDate endDate createdAt").lean(),
  ]);

  const availableYears = seasonYears
    .map((item) => getSeasonYear(item))
    .filter((year) => typeof year === "number" && !Number.isNaN(year));
  const maxYear = Math.max(
    new Date().getFullYear(),
    ...availableYears,
    MIN_YEAR,
  );

  return {
    fields: fields.map((item) => ({
      _id: String(item._id),
      name: item.name || "",
    })),
    seasons: seasons.map((item) => ({
      _id: String(item._id),
      name: item.name || "",
    })),
    stages: stages.map((item) => ({
      _id: String(item._id),
      name: item.name || "",
      order: item.order ?? 0,
    })),
    tasks: tasks.map((item) => ({
      _id: String(item._id),
      name: item.name || "",
      stageId: item.stage?._id
        ? String(item.stage._id)
        : item.stage
          ? String(item.stage)
          : "",
      stageName: item.stage?.name || "",
      order: item.order ?? 0,
    })),
    statuses: [
      { value: "all", label: "Tất cả" },
      { value: "done", label: "Đã làm" },
      { value: "pending", label: "Chưa làm" },
    ],
    years: Array.from(
      { length: maxYear - MIN_YEAR + 1 },
      (_, index) => MIN_YEAR + index,
    ),
  };
};

module.exports = {
  getAdminPlotTaskStatistics,
  getAdminPlotStatisticsOptions,
  sendPlotTaskWarnings,
};
