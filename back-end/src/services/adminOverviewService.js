const Field = require("../models/fieldModel");
const Plot = require("../models/plotModel");
const Season = require("../models/seasonModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const DiaryLog = require("../models/diaryLogModel");
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

const normalizeFilters = (query = {}) => {
  const status = ["active", "completed", "planned"].includes(query.status)
    ? query.status
    : "all";

  return {
    seasonId: query.seasonId || "",
    year: toNumber(query.year, null),
    fieldId: query.fieldId || "",
    status,
    recentLimit: Math.min(Math.max(toNumber(query.recentLimit, 8), 1), 20),
  };
};

const buildSeasonDetailMatch = (filters) => {
  const match = {};

  if (filters.seasonId) {
    match.season = filters.seasonId;
  }

  if (filters.year) {
    match.year = filters.year;
  }

  if (filters.fieldId) {
    match.field = filters.fieldId;
  }

  if (filters.status !== "all") {
    match.status = filters.status;
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
              $cond: [{ $eq: ["$status", "active"] }, 1, 0],
            },
          },
          completedSeasonCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          plannedSeasonCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "planned"] }, 1, 0],
            },
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
  const [seasons, fields, years] = await Promise.all([
    Season.find().sort({ name: 1 }).lean(),
    Field.find().sort({ name: 1 }).select("_id name address").lean(),
    SeasonDetail.distinct("year"),
  ]);

  return {
    seasons: seasons.map((item) => ({
      _id: item._id,
      name: item.name,
      isVisible: item.isVisible !== false,
    })),
    fields,
    years: years
      .map((item) => Number(item))
      .filter(Boolean)
      .sort((a, b) => b - a),
    statuses: STATUS_OPTIONS,
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
    const lastActivityAt = logs[0]?.date || logs[0]?.createdAt || seasonDetail.updatedAt || null;

    return {
      _id: seasonDetail._id,
      seasonId: seasonDetail.season?._id || seasonDetail.season,
      seasonName: seasonDetail.season?.name || "Khong xac dinh",
      seasonLabel: `${seasonDetail.season?.name || "Khong xac dinh"} ${seasonDetail.year}`,
      year: seasonDetail.year,
      status: seasonDetail.status,
      startDate: seasonDetail.startDate,
      endDate: seasonDetail.endDate || null,
      field: {
        _id: seasonDetail.field?._id || seasonDetail.field,
        name: seasonDetail.field?.name || "Khong xac dinh",
        address: seasonDetail.field?.address || "",
      },
      farmer: {
        _id: seasonDetail.user?._id || seasonDetail.user,
        fullName: seasonDetail.user?.fullName || "Khong xac dinh",
        email: seasonDetail.user?.email || "",
      },
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
  const fieldMap = new Map();
  const farmerMap = new Map();

  seasonInstances.forEach((item) => {
    const seasonKey = `${item.seasonId}-${item.year}`;
    const fieldKey = String(item.field._id);
    const farmerKey = String(item.farmer._id);

    if (!seasonMap.has(seasonKey)) {
      seasonMap.set(seasonKey, {
        seasonId: item.seasonId,
        seasonName: item.seasonName,
        year: item.year,
        seasonLabel: item.seasonLabel,
        seasonInstanceCount: 0,
        activeSeasonCount: 0,
        completedSeasonCount: 0,
        plannedSeasonCount: 0,
        fieldIds: new Set(),
        farmerIds: new Set(),
        plotCount: 0,
        readyPlotCount: 0,
        assignedArea: 0,
        diaryLogCount: 0,
        totalCost: 0,
        lastActivityAt: null,
      });
    }

    if (!fieldMap.has(fieldKey)) {
      fieldMap.set(fieldKey, {
        fieldId: item.field._id,
        fieldName: item.field.name,
        address: item.field.address,
        seasonInstanceCount: 0,
        activeSeasonCount: 0,
        completedSeasonCount: 0,
        plannedSeasonCount: 0,
        farmerIds: new Set(),
        plotCount: 0,
        readyPlotCount: 0,
        assignedArea: 0,
        diaryLogCount: 0,
        totalCost: 0,
        lastActivityAt: null,
      });
    }

    if (!farmerMap.has(farmerKey)) {
      farmerMap.set(farmerKey, {
        farmerId: item.farmer._id,
        fullName: item.farmer.fullName,
        email: item.farmer.email,
        seasonInstanceCount: 0,
        activeSeasonCount: 0,
        completedSeasonCount: 0,
        plannedSeasonCount: 0,
        fieldIds: new Set(),
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
    seasonBucket.fieldIds.add(fieldKey);
    seasonBucket.farmerIds.add(farmerKey);
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

    const fieldBucket = fieldMap.get(fieldKey);
    fieldBucket.seasonInstanceCount += 1;
    fieldBucket.farmerIds.add(farmerKey);
    fieldBucket.plotCount += item.plotCount;
    fieldBucket.readyPlotCount += item.readyPlotCount;
    fieldBucket.assignedArea += item.assignedArea;
    fieldBucket.diaryLogCount += item.diaryLogCount;
    fieldBucket.totalCost += item.totalCost;
    if (item.status === "active") fieldBucket.activeSeasonCount += 1;
    if (item.status === "completed") fieldBucket.completedSeasonCount += 1;
    if (item.status === "planned") fieldBucket.plannedSeasonCount += 1;
    if (!fieldBucket.lastActivityAt || new Date(item.lastActivityAt || 0) > new Date(fieldBucket.lastActivityAt || 0)) {
      fieldBucket.lastActivityAt = item.lastActivityAt || fieldBucket.lastActivityAt;
    }

    const farmerBucket = farmerMap.get(farmerKey);
    farmerBucket.seasonInstanceCount += 1;
    farmerBucket.fieldIds.add(fieldKey);
    farmerBucket.plotCount += item.plotCount;
    farmerBucket.readyPlotCount += item.readyPlotCount;
    farmerBucket.assignedArea += item.assignedArea;
    farmerBucket.diaryLogCount += item.diaryLogCount;
    farmerBucket.totalCost += item.totalCost;
    if (item.status === "active") farmerBucket.activeSeasonCount += 1;
    if (item.status === "completed") farmerBucket.completedSeasonCount += 1;
    if (item.status === "planned") farmerBucket.plannedSeasonCount += 1;
    if (!farmerBucket.lastActivityAt || new Date(item.lastActivityAt || 0) > new Date(farmerBucket.lastActivityAt || 0)) {
      farmerBucket.lastActivityAt = item.lastActivityAt || farmerBucket.lastActivityAt;
    }
  });

  const seasonOverview = Array.from(seasonMap.values())
    .map((item) => ({
      ...item,
      fieldCount: item.fieldIds.size,
      farmerCount: item.farmerIds.size,
      fieldIds: undefined,
      farmerIds: undefined,
    }))
    .sort((a, b) => b.year - a.year || a.seasonName.localeCompare(b.seasonName));

  const fieldOverview = Array.from(fieldMap.values())
    .map((item) => ({
      ...item,
      farmerCount: item.farmerIds.size,
      farmerIds: undefined,
    }))
    .sort((a, b) => b.totalCost - a.totalCost || b.diaryLogCount - a.diaryLogCount);

  const farmerOverview = Array.from(farmerMap.values())
    .map((item) => ({
      ...item,
      fieldCount: item.fieldIds.size,
      fieldIds: undefined,
    }))
    .sort((a, b) => b.totalCost - a.totalCost || b.diaryLogCount - a.diaryLogCount);

  return { seasonOverview, fieldOverview, farmerOverview };
};

const buildRecentActivities = (logs, seasonDetailMap, recentLimit) => {
  return logs.slice(0, recentLimit).map((log) => {
    const seasonDetail = seasonDetailMap.get(String(log.season));

    return {
      _id: log._id,
      date: log.date,
      cost: Number(log.cost || 0),
      description: log.description || "",
      taskId: log.task?._id || log.task,
      taskName: log.task?.name || "Khong xac dinh",
      plotId: log.plot?._id || log.plot || null,
      plotName: log.plot?.name || "",
      seasonDetailId: seasonDetail?._id || log.season,
      seasonLabel: seasonDetail?.seasonLabel || "",
      fieldName: seasonDetail?.field?.name || "",
      farmerName: seasonDetail?.farmer?.fullName || "",
      status: seasonDetail?.status || "",
    };
  });
};

const buildTaskOverview = (logs) => {
  const taskMap = new Map();

  logs.forEach((log) => {
    const taskId = String(log.task?._id || log.task || "unknown");
    if (!taskMap.has(taskId)) {
      taskMap.set(taskId, {
        taskId,
        taskName: log.task?.name || "Khong xac dinh",
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
      .populate("field", "name address")
      .populate("user", "fullName email")
      .sort({ startDate: -1, createdAt: -1 })
      .lean(),
  ]);

  const seasonDetailIds = seasonDetails.map((item) => item._id);

  const [assignments, logs] = seasonDetailIds.length
    ? await Promise.all([
        SeasonPlotAssignment.find({
          seasonDetail: { $in: seasonDetailIds },
          status: "active",
        })
          .populate("plot", "name area status")
          .lean(),
        DiaryLog.find({ season: { $in: seasonDetailIds } })
          .populate("task", "name")
          .populate("plot", "name")
          .sort({ date: -1, createdAt: -1 })
          .lean(),
      ])
    : [[], []];

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
    const key = String(item.season);
    if (!logsBySeason.has(key)) {
      logsBySeason.set(key, []);
    }
    logsBySeason.get(key).push(item);
  });

  const seasonInstances = decorateSeasonInstances(seasonDetails, assignmentsBySeason, logsBySeason);
  const seasonDetailMap = new Map(seasonInstances.map((item) => [String(item._id), item]));

  const seasonalSummary = {
    seasonInstanceCount: seasonInstances.length,
    activeSeasonCount: seasonInstances.filter((item) => item.status === "active").length,
    completedSeasonCount: seasonInstances.filter((item) => item.status === "completed").length,
    plannedSeasonCount: seasonInstances.filter((item) => item.status === "planned").length,
    participatingFieldCount: new Set(seasonInstances.map((item) => String(item.field._id))).size,
    participatingFarmerCount: new Set(seasonInstances.map((item) => String(item.farmer._id))).size,
    assignedPlotCount: sumBy(seasonInstances, (item) => item.plotCount),
    readyPlotCount: sumBy(seasonInstances, (item) => item.readyPlotCount),
    inactiveAssignedPlotCount: sumBy(seasonInstances, (item) => item.inactiveAssignedPlotCount),
    assignedArea: sumBy(seasonInstances, (item) => item.assignedArea),
    diaryLogCount: sumBy(seasonInstances, (item) => item.diaryLogCount),
    totalCost: sumBy(seasonInstances, (item) => item.totalCost),
    seasonWithoutDiaryCount: seasonInstances.filter((item) => item.diaryLogCount === 0).length,
  };

  const { seasonOverview, fieldOverview, farmerOverview } = buildGroupedStats(seasonInstances);

  return {
    filters,
    options,
    summary: {
      system: systemStats,
      seasonal: seasonalSummary,
    },
    seasonOverview,
    fieldOverview,
    farmerOverview,
    taskOverview: buildTaskOverview(logs),
    seasonInstances,
    recentActivities: buildRecentActivities(logs, seasonDetailMap, filters.recentLimit),
  };
};

module.exports = {
  getAdminOverview,
};
