const Field = require("../models/fieldModel");
const Plot = require("../models/plotModel");
const Season = require("../models/seasonModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const DiaryLog = require("../models/farmingLogModel");
const User = require("../models/userModel");

const isAdminUser = (user) => (user?.role || "").toLowerCase() === "admin";

const STATUS_OPTIONS = [
  { value: "all", label: "Tat ca" },
  { value: "active", label: "Dang canh tac" },
  { value: "completed", label: "Da ket thuc" },
  { value: "planned", label: "Du kien" },
];

const toNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getSeasonYear = (seasonDetail) => {
  if (typeof seasonDetail?.year === "number") {
    return seasonDetail.year;
  }

  const sourceDate =
    seasonDetail?.startDate || seasonDetail?.endDate || seasonDetail?.createdAt || null;

  return sourceDate ? new Date(sourceDate).getFullYear() : null;
};

const normalizeFilters = (query = {}) => {
  const status = ["active", "completed", "planned"].includes(query.status)
    ? query.status
    : "all";

  return {
    seasonId: query.seasonId || "",
    status,
    recentLimit: Math.min(Math.max(toNumber(query.recentLimit, 8), 1), 20),
  };
};

const buildSeasonDetailMatch = (filters) => {
  const match = {};

  if (filters.seasonId) {
    match.season = filters.seasonId;
  }

  if (filters.status !== "all") {
    const now = new Date();
    if (filters.status === "active") {
      match.startDate = { $lte: now };
      match.$or = [{ endDate: null }, { endDate: { $gte: now } }];
    } else if (filters.status === "completed") {
      match.endDate = { $lt: now };
    } else if (filters.status === "planned") {
      match.$or = [{ startDate: null }, { startDate: { $gt: now } }];
    }
  }

  return match;
};

const sumBy = (items, selector) =>
  items.reduce((sum, item) => sum + Number(selector(item) || 0), 0);

const buildSystemStats = async () => {
  const [fieldCount, farmerCount, plotStats, seasonStats] = await Promise.all([
    Field.countDocuments(),
    User.countDocuments({ role: { $regex: /^farmer$/i } }),
    Plot.aggregate([
      {
        $group: {
          _id: null,
          plotCount: { $sum: 1 },
          totalArea: { $sum: "$area" },
          activePlotCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "active"] }, 1, 0],
            },
          },
          inactivePlotCount: {
            $sum: {
              $cond: [{ $ne: ["$status", "active"] }, 1, 0],
            },
          },
        },
      },
    ]),
    SeasonDetail.aggregate([
      {
        $group: {
          _id: null,
          activeSeasonCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ["$startDate", new Date()] },
                    { $or: [{ $eq: ["$endDate", null] }, { $gte: ["$endDate", new Date()] }] }
                  ]
                },
                1, 0
              ]
            }
          },
          completedSeasonCount: {
            $sum: {
              $cond: [{ $lt: ["$endDate", new Date()] }, 1, 0]
            }
          },
          plannedSeasonCount: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ["$startDate", null] }, { $gt: ["$startDate", new Date()] }] },
                1, 0
              ]
            }
          },
        },
      },
    ]),
  ]);

  const plotTotals = plotStats[0] || {};
  const seasonTotals = seasonStats[0] || {};

  return {
    fieldCount,
    farmerCount,
    plotCount: plotTotals.plotCount || 0,
    activePlotCount: plotTotals.activePlotCount || 0,
    inactivePlotCount: plotTotals.inactivePlotCount || 0,
    totalArea: plotTotals.totalArea || 0,
    activeSeasonCount: seasonTotals.activeSeasonCount || 0,
    completedSeasonCount: seasonTotals.completedSeasonCount || 0,
    plannedSeasonCount: seasonTotals.plannedSeasonCount || 0,
  };
};

const getOverviewOptions = async () => {
  const [seasons, fields] = await Promise.all([
    Season.find().sort({ name: 1 }).lean(),
    Field.find().sort({ name: 1 }).select("_id name address").lean(),
  ]);

  return {
    seasons: seasons.map((item) => ({
      _id: item._id,
      name: item.name,
      isVisible: item.isVisible !== false,
    })),
    fields,
    statuses: STATUS_OPTIONS,
  };
};

const getCurrentSeasonInfo = async () => {
  const now = new Date();

  const currentSeasonDetails = await SeasonDetail.find({
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  })
    .populate("season", "name")
    .sort({ startDate: -1, createdAt: -1 })
    .lean();

  if (!currentSeasonDetails.length) {
    return null;
  }

  const currentSeason = currentSeasonDetails[0];

  return {
    seasonId: currentSeason.season?._id ? String(currentSeason.season._id) : "",
    seasonName: currentSeason.season?.name || "",
    year: getSeasonYear(currentSeason),
    startDate: currentSeason.startDate,
    endDate: currentSeason.endDate || null,
  };
};

const decorateSeasonInstances = (seasonDetails, assignmentsBySeason, logsBySeason) => {
  return seasonDetails.map((seasonDetail) => {
    const key = String(seasonDetail._id);
    const assignments = assignmentsBySeason.get(key) || [];
    const logs = logsBySeason.get(key) || [];
    const assignedArea = sumBy(assignments, (item) => item.plot?.area);
    const readyPlotCount = assignments.filter((item) => item.plot?.status === "active").length;
    const totalCost = sumBy(logs, (item) => item.cost);
    const lastActivityAt = logs[0]?.date || logs[0]?.createdAt || null;

    let computedStatus = "planned";
    const now = new Date();
    if (seasonDetail.endDate && new Date(seasonDetail.endDate) < now) {
      computedStatus = "completed";
    } else if (
      seasonDetail.startDate && 
      new Date(seasonDetail.startDate) <= now && 
      (!seasonDetail.endDate || new Date(seasonDetail.endDate) >= now)
    ) {
      computedStatus = "active";
    }

    return {
      _id: seasonDetail._id,
      seasonId: seasonDetail.season?._id || seasonDetail.season,
      seasonName: seasonDetail.season?.name || "Không xác định",
      year: getSeasonYear(seasonDetail),
      seasonLabel: seasonDetail.season?.name || "Không xác định",
      seasonInstanceLabel: getSeasonYear(seasonDetail)
        ? `${seasonDetail.season?.name || "Không xác định"} ${getSeasonYear(seasonDetail)}`
        : seasonDetail.season?.name || "Không xác định",
      status: computedStatus,
      startDate: seasonDetail.startDate,
      endDate: seasonDetail.endDate || null,
      plotCount: assignments.length,
      readyPlotCount,
      inactiveAssignedPlotCount: assignments.length - readyPlotCount,
      assignedArea,
      diaryLogCount: logs.length,
      totalCost,
      lastActivityAt,
    };
  });
};

const buildGroupedStats = (seasonInstances) => {
  const seasonMap = new Map();

  seasonInstances.forEach((item) => {
    const seasonKey = String(item.seasonId);

    if (!seasonMap.has(seasonKey)) {
      seasonMap.set(seasonKey, {
        seasonId: item.seasonId,
        seasonName: item.seasonName,
        seasonLabel: item.seasonLabel,
        seasonInstanceCount: 0,
        activeSeasonCount: 0,
        completedSeasonCount: 0,
        plannedSeasonCount: 0,
        plotCount: 0,
        readyPlotCount: 0,
        assignedArea: 0,
        diaryLogCount: 0,
        totalCost: 0,
        lastActivityAt: null,
      });
    }

    const seasonBucket = seasonMap.get(seasonKey);
    seasonBucket.seasonInstanceCount += 1;
    seasonBucket.plotCount += item.plotCount;
    seasonBucket.readyPlotCount += item.readyPlotCount;
    seasonBucket.assignedArea += item.assignedArea;
    seasonBucket.diaryLogCount += item.diaryLogCount;
    seasonBucket.totalCost += item.totalCost;
    if (item.status === "active") seasonBucket.activeSeasonCount += 1;
    if (item.status === "completed") seasonBucket.completedSeasonCount += 1;
    if (item.status === "planned") seasonBucket.plannedSeasonCount += 1;
    if (!seasonBucket.lastActivityAt || new Date(item.lastActivityAt || 0) > new Date(seasonBucket.lastActivityAt || 0)) {
      seasonBucket.lastActivityAt = item.lastActivityAt || seasonBucket.lastActivityAt;
    }
  });

  const seasonOverview = Array.from(seasonMap.values())
    .sort((a, b) => a.seasonName.localeCompare(b.seasonName));

  return { seasonOverview };
};

const getLogTaskInfo = (log) => {
  const taskDetail = log.taskDetail || null;
  const task = taskDetail?.task || log.task || null;

  return {
    taskId: task?._id || task || null,
    taskName: task?.name || "Không xác định",
    taskDetailId: taskDetail?._id || taskDetail || null,
    taskDetailName: taskDetail?.name || "",
    activityName: taskDetail?.name || task?.name || "Không xác định",
  };
};

const buildRecentActivities = (logs, seasonDetailMap, recentLimit) => {
  return logs.slice(0, recentLimit).map((log) => {
    const firstAssignment = log.seasonPlotAssignments?.[0] || null;
    const seasonDetailId = firstAssignment?.seasonDetail || null;
    const seasonDetail = seasonDetailId ? seasonDetailMap.get(String(seasonDetailId)) : null;
    const taskInfo = getLogTaskInfo(log);
    const plot = firstAssignment?.plot || null;

    return {
      _id: log._id,
      date: log.date,
      cost: Number(log.cost || 0),
      description: log.description || "",
      taskId: taskInfo.taskId,
      taskName: taskInfo.taskName,
      taskDetailId: taskInfo.taskDetailId,
      taskDetailName: taskInfo.taskDetailName,
      activityName: taskInfo.activityName,
      plotId: plot?._id || plot || null,
      plotName: plot?.name || "",
      seasonDetailId: seasonDetail?._id || seasonDetailId,
      seasonLabel: seasonDetail?.seasonInstanceLabel || seasonDetail?.seasonLabel || "",
      status: seasonDetail?.status || "",
    };
  });
};

const buildTaskOverview = (logs) => {
  const taskMap = new Map();

  logs.forEach((log) => {
    const taskInfo = getLogTaskInfo(log);
    const taskId = String(taskInfo.taskId || "unknown");
    if (!taskMap.has(taskId)) {
      taskMap.set(taskId, {
        taskId,
        taskName: taskInfo.taskName,
        diaryLogCount: 0,
        totalCost: 0,
      });
    }

    const bucket = taskMap.get(taskId);
    bucket.diaryLogCount += 1;
    bucket.totalCost += Number(log.cost || 0);
  });

  return Array.from(taskMap.values()).sort(
    (a, b) => b.diaryLogCount - a.diaryLogCount || b.totalCost - a.totalCost
  );
};

const getAdminOverview = async (rawFilters, currentUser) => {
  if (!isAdminUser(currentUser)) {
    throw new Error("Chi admin moi duoc xem thong ke tong quan");
  }

  const filters = normalizeFilters(rawFilters);
  const seasonDetailMatch = buildSeasonDetailMatch(filters);

  const [systemStats, options, seasonDetails] = await Promise.all([
    buildSystemStats(),
    getOverviewOptions(),
    SeasonDetail.find(seasonDetailMatch)
      .populate("season", "name")
      .sort({ startDate: -1, createdAt: -1 })
      .lean(),
  ]);

  const seasonDetailIds = seasonDetails.map((item) => item._id);

  const assignments = seasonDetailIds.length
    ? await SeasonPlotAssignment.find({
        seasonDetail: { $in: seasonDetailIds },
        status: "active",
      })
        .populate("plot", "name area status")
        .lean()
    : [];

  const assignmentIds = assignments.map((item) => item._id);

  const logs = assignmentIds.length
    ? await DiaryLog.find({ seasonPlotAssignments: { $in: assignmentIds } })
        .populate("task", "name")
        .populate({
          path: "taskDetail",
          select: "name task",
          populate: { path: "task", select: "name" },
        })
        .populate({
          path: "seasonPlotAssignments",
          select: "seasonDetail plot",
          populate: { path: "plot", select: "name" },
        })
        .sort({ date: -1, createdAt: -1 })
        .lean()
    : [];

  const assignmentsBySeason = new Map();
  assignments.forEach((item) => {
    const key = String(item.seasonDetail);
    if (!assignmentsBySeason.has(key)) {
      assignmentsBySeason.set(key, []);
    }
    assignmentsBySeason.get(key).push(item);
  });

  const logsBySeason = new Map();
  logs.forEach((item) => {
    const seasonIds = Array.from(
      new Set((item.seasonPlotAssignments || []).map((assignment) => String(assignment.seasonDetail)))
    );

    seasonIds.forEach((key) => {
      if (!logsBySeason.has(key)) {
        logsBySeason.set(key, []);
      }
      logsBySeason.get(key).push(item);
    });
  });

  const seasonInstances = decorateSeasonInstances(seasonDetails, assignmentsBySeason, logsBySeason);
  const seasonDetailMap = new Map(seasonInstances.map((item) => [String(item._id), item]));

  const seasonalSummary = {
    seasonInstanceCount: seasonInstances.length,
    activeSeasonCount: seasonInstances.filter((item) => item.status === "active").length,
    completedSeasonCount: seasonInstances.filter((item) => item.status === "completed").length,
    plannedSeasonCount: seasonInstances.filter((item) => item.status === "planned").length,
    assignedPlotCount: sumBy(seasonInstances, (item) => item.plotCount),
    readyPlotCount: sumBy(seasonInstances, (item) => item.readyPlotCount),
    inactiveAssignedPlotCount: sumBy(seasonInstances, (item) => item.inactiveAssignedPlotCount),
    assignedArea: sumBy(seasonInstances, (item) => item.assignedArea),
    diaryLogCount: sumBy(seasonInstances, (item) => item.diaryLogCount),
    totalCost: sumBy(seasonInstances, (item) => item.totalCost),
    seasonWithoutDiaryCount: seasonInstances.filter((item) => item.diaryLogCount === 0).length,
  };

  const { seasonOverview } = buildGroupedStats(seasonInstances);

  return {
    filters,
    options,
    summary: {
      system: systemStats,
      seasonal: seasonalSummary,
    },
    seasonOverview,
    taskOverview: buildTaskOverview(logs),
    seasonInstances,
    recentActivities: buildRecentActivities(logs, seasonDetailMap, filters.recentLimit),
  };
};

module.exports = {
  getAdminOverview,
  getCurrentSeasonInfo,
};
