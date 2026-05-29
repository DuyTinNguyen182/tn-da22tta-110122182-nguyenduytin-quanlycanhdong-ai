const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const Plot = require("../models/plotModel");
const FarmingLog = require("../models/farmingLogModel");
const DiseaseLog = require("../models/diseaseLogModel");
const User = require("../models/userModel");

const resolveSeasonDetail = async (querySeasonDetailId) => {
  if (querySeasonDetailId) {
    const seasonDetail = await SeasonDetail.findById(querySeasonDetailId)
      .populate("season", "name")
      .lean();

    if (!seasonDetail) {
      throw new Error("Không tìm thấy mùa vụ được chọn");
    }

    return seasonDetail;
  }

  const now = new Date();
  const activeSeasonDetail = await SeasonDetail.findOne({
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  })
    .populate("season", "name")
    .sort({ startDate: -1, createdAt: -1 })
    .lean();

  // Không có thì null
  return activeSeasonDetail || null;
};

const buildSeasonLabel = (seasonDetail) => {
  const seasonName = seasonDetail?.season?.name || "Mùa vụ";
  return seasonDetail?.year ? `${seasonName} ${seasonDetail.year}` : seasonName;
};

const getPreviousSeasonDetail = async (currentSeasonDetail) => {
  if (!currentSeasonDetail) return null;
  return await SeasonDetail.findOne({
    startDate: { $lt: currentSeasonDetail.startDate },
  })
    .sort({ startDate: -1 })
    .lean();
};

const getDashboardData = async (querySeasonDetailId = "") => {
  const seasonDetail = await resolveSeasonDetail(querySeasonDetailId);

  // ĐÃ SỬA: Xử lý an toàn khi không có mùa vụ hoạt động
  if (!seasonDetail) {
    const totalFarmers = await User.countDocuments({ role: "farmer" });
    return {
      seasonDetailId: "",
      currentSeasonName: "Chưa có mùa vụ hoạt động",
      kpis: {
        totalFarmers,
        totalArea: 0,
        totalCost: 0,
        totalActivePlots: 0,
        trends: {
          areaTrend: null,
          costTrend: null,
        },
      },
      charts: {
        costByCategory: [],
        costByStage: [],
        cropProgress: [],
        cumulativeCosts: [],
        topFarmers: [],
      },
      liveFeeds: {
        recentFarmingLogs: [],
        recentDiseaseLogs: [],
      },
    };
  }

  const prevSeasonDetail = await getPreviousSeasonDetail(seasonDetail);

  const assignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonDetail._id,
    status: "active",
  })
    .select("_id plot")
    .lean();

  const assignmentIds = assignments.map((item) => item._id);
  const plotIdMap = new Map();

  assignments.forEach((item) => {
    if (item.plot) {
      plotIdMap.set(String(item.plot), item.plot);
    }
  });

  const plotIds = Array.from(plotIdMap.values());

  let prevAssignmentIds = [];
  let prevPlotIds = [];
  if (prevSeasonDetail) {
    const prevAssignments = await SeasonPlotAssignment.find({
      seasonDetail: prevSeasonDetail._id,
      status: "active",
    })
      .select("_id plot")
      .lean();
    prevAssignmentIds = prevAssignments.map((item) => item._id);
    const prevPlotIdMap = new Map();
    prevAssignments.forEach((item) => {
      if (item.plot) prevPlotIdMap.set(String(item.plot), item.plot);
    });
    prevPlotIds = Array.from(prevPlotIdMap.values());
  }

  const [
    totalFarmers,
    totalAreaResult,
    totalCostResult,
    totalActivePlots,
    costByCategory,
    costByStage,
    recentFarmingLogs,
    recentDiseaseLogs,
    cropProgress,
    rawDailyCosts,
    topFarmers,
    prevAreaResult,
    prevCostResult,
  ] = await Promise.all([
    User.countDocuments({ role: "farmer" }),
    plotIds.length
      ? Plot.aggregate([
          { $match: { _id: { $in: plotIds } } },
          { $group: { _id: null, totalArea: { $sum: "$area" } } },
        ])
      : Promise.resolve([]),
    assignmentIds.length
      ? FarmingLog.aggregate([
          { $match: { seasonPlotAssignments: { $in: assignmentIds } } },
          { $group: { _id: null, totalCost: { $sum: "$cost" } } },
        ])
      : Promise.resolve([]),
    assignmentIds.length,

    // Cost by Category
    assignmentIds.length
      ? FarmingLog.aggregate([
          { $match: { seasonPlotAssignments: { $in: assignmentIds } } },
          {
            $lookup: {
              from: "tasks",
              localField: "task",
              foreignField: "_id",
              as: "task",
            },
          },
          { $unwind: { path: "$task", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { category: { $ifNull: ["$task.category", "OTHER"] } },
              totalCost: { $sum: { $ifNull: ["$cost", 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              category: "$_id.category",
              categoryName: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$_id.category", "FERTILIZER"] },
                      then: "Phân bón",
                    },
                    {
                      case: { $eq: ["$_id.category", "PESTICIDE"] },
                      then: "Thuốc BVTV",
                    },
                    {
                      case: { $eq: ["$_id.category", "LABOR"] },
                      then: "Nhân công",
                    },
                    {
                      case: { $eq: ["$_id.category", "SEED"] },
                      then: "Lúa giống",
                    },
                    {
                      case: { $eq: ["$_id.category", "WATER"] },
                      then: "Bơm nước",
                    },
                  ],
                  default: "Khác",
                },
              },
              totalCost: 1,
            },
          },
          { $sort: { totalCost: -1, categoryName: 1 } },
        ])
      : Promise.resolve([]),

    // Cost by Stage
    assignmentIds.length
      ? FarmingLog.aggregate([
          { $match: { seasonPlotAssignments: { $in: assignmentIds } } },
          {
            $lookup: {
              from: "tasks",
              localField: "task",
              foreignField: "_id",
              as: "task",
            },
          },
          { $unwind: { path: "$task", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "stages",
              localField: "task.stage",
              foreignField: "_id",
              as: "stage",
            },
          },
          { $unwind: { path: "$stage", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: {
                stageId: "$stage._id",
                stageName: { $ifNull: ["$stage.name", "Chưa xác định"] },
                stageOrder: { $ifNull: ["$stage.order", 9999] },
              },
              totalCost: { $sum: { $ifNull: ["$cost", 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              stageId: "$_id.stageId",
              stageName: "$_id.stageName",
              stageOrder: "$_id.stageOrder",
              totalCost: 1,
            },
          },
          { $sort: { stageOrder: 1, stageName: 1 } },
        ])
      : Promise.resolve([]),

    // Recent Farming Logs
    assignmentIds.length
      ? FarmingLog.find({ seasonPlotAssignments: { $in: assignmentIds } })
          .populate("task", "name")
          .populate("user", "fullName")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      : Promise.resolve([]),

    // Recent Disease Logs
    assignmentIds.length
      ? DiseaseLog.find({
          status: "unprocessed",
          seasonPlotAssignments: { $in: assignmentIds },
        })
          .populate("user", "fullName")
          .sort({ detectedAt: -1, createdAt: -1 })
          .limit(5)
          .lean()
      : Promise.resolve([]),

    // Crop Progress
    assignmentIds.length
      ? SeasonPlotAssignment.aggregate([
          { $match: { _id: { $in: assignmentIds } } },
          {
            $lookup: {
              from: "plots",
              localField: "plot",
              foreignField: "_id",
              as: "plotData",
            },
          },
          { $unwind: "$plotData" },
          {
            $lookup: {
              from: "farming_logs",
              let: { assignmentId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: [
                        "$$assignmentId",
                        { $ifNull: ["$seasonPlotAssignments", []] },
                      ],
                    },
                  },
                },
                { $sort: { date: -1, createdAt: -1 } },
                { $limit: 1 },
              ],
              as: "latestLog",
            },
          },
          { $unwind: { path: "$latestLog", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "tasks",
              localField: "latestLog.task",
              foreignField: "_id",
              as: "taskData",
            },
          },
          { $unwind: { path: "$taskData", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "stages",
              localField: "taskData.stage",
              foreignField: "_id",
              as: "stageData",
            },
          },
          { $unwind: { path: "$stageData", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: {
                stageId: "$stageData._id",
                stageName: {
                  $ifNull: ["$stageData.name", "Chưa bắt đầu"],
                },
                stageOrder: { $ifNull: ["$stageData.order", 0] },
              },
              totalArea: { $sum: "$plotData.area" },
            },
          },
          { $sort: { "_id.stageOrder": 1 } },
          { $project: { _id: 0, stageName: "$_id.stageName", totalArea: 1 } },
        ])
      : Promise.resolve([]),

    // Biến động chi phí phát sinh (Lấy theo ngày định dạng YYYY-MM-DD để dễ sort)
    assignmentIds.length
      ? FarmingLog.aggregate([
          { $match: { seasonPlotAssignments: { $in: assignmentIds } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              dailyCost: { $sum: { $ifNull: ["$cost", 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ])
      : Promise.resolve([]),

    // Top nông dân có chi phí/1000m2 cao nhất
    assignmentIds.length
      ? FarmingLog.aggregate([
          { $match: { seasonPlotAssignments: { $in: assignmentIds } } },
          { $unwind: "$seasonPlotAssignments" },
          { $match: { seasonPlotAssignments: { $in: assignmentIds } } },
          {
            $group: {
              _id: "$seasonPlotAssignments",
              totalCost: { $sum: { $ifNull: ["$cost", 0] } },
            },
          },
          {
            $lookup: {
              from: "season_plot_assignments",
              localField: "_id",
              foreignField: "_id",
              as: "assignmentData",
            },
          },
          { $unwind: "$assignmentData" },
          {
            $lookup: {
              from: "plots",
              localField: "assignmentData.plot",
              foreignField: "_id",
              as: "plotData",
            },
          },
          { $unwind: "$plotData" },
          {
            $lookup: {
              from: "users",
              localField: "assignmentData.user",
              foreignField: "_id",
              as: "userData",
            },
          },
          { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              farmerName: { $ifNull: ["$userData.fullName", "Chưa xác định"] },
              plotName: "$plotData.name",
              area: "$plotData.area",
              totalCost: 1,
              // Tính costPer1000m2: (totalCost / area) * 1000
              costPer1000m2: {
                $cond: [
                  { $gt: ["$plotData.area", 0] },
                  {
                    $multiply: [
                      { $divide: ["$totalCost", "$plotData.area"] },
                      1000,
                    ],
                  },
                  0,
                ],
              },
            },
          },
          { $sort: { costPer1000m2: -1 } },
          { $limit: 5 },
        ])
      : Promise.resolve([]),

    prevPlotIds.length
      ? Plot.aggregate([
          { $match: { _id: { $in: prevPlotIds } } },
          { $group: { _id: null, totalArea: { $sum: "$area" } } },
        ])
      : Promise.resolve([]),

    prevAssignmentIds.length
      ? FarmingLog.aggregate([
          { $match: { seasonPlotAssignments: { $in: prevAssignmentIds } } },
          { $group: { _id: null, totalCost: { $sum: "$cost" } } },
        ])
      : Promise.resolve([]),
  ]);

  // Tính toán Chi phí Lũy kế (Cumulative Cost) từ mảng daily cost
  let cumulativeTotal = 0;
  const cumulativeCosts = rawDailyCosts.map((log) => {
    cumulativeTotal += log.dailyCost;
    // Chuyển format YYYY-MM-DD sang DD/MM cho UI đẹp
    const [y, m, d] = log._id.split("-");
    return {
      _id: `${d}/${m}`,
      dailyCost: log.dailyCost,
      cumulativeCost: cumulativeTotal,
    };
  });

  const currentArea = totalAreaResult[0]?.totalArea || 0;
  const currentCost = totalCostResult[0]?.totalCost || 0;
  const prevArea = prevAreaResult[0]?.totalArea || 0;
  const prevCost = prevCostResult[0]?.totalCost || 0;

  const calculateTrend = (current, previous, higherIsPositive = true) => {
    if (!previous) return null;
    const diff = current - previous;
    const percentage = Math.abs((diff / previous) * 100).toFixed(1);
    const isIncrease = diff >= 0;
    return {
      value: parseFloat(percentage),
      isIncrease,
      isPositive: higherIsPositive ? isIncrease : !isIncrease,
    };
  };

  return {
    seasonDetailId: String(seasonDetail._id),
    currentSeasonName: buildSeasonLabel(seasonDetail),
    kpis: {
      totalFarmers,
      totalArea: currentArea,
      totalCost: currentCost,
      totalActivePlots,
      trends: {
        areaTrend: calculateTrend(currentArea, prevArea, true),
        costTrend: calculateTrend(currentCost, prevCost, false),
      },
    },
    charts: {
      costByCategory,
      costByStage,
      cropProgress,
      cumulativeCosts,
      topFarmers,
    },
    liveFeeds: {
      recentFarmingLogs,
      recentDiseaseLogs,
    },
  };
};

module.exports = {
  getDashboardData,
};
