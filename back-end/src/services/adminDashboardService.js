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

  if (!activeSeasonDetail) {
    throw new Error("Không tìm thấy mùa vụ đang hoạt động");
  }

  return activeSeasonDetail;
};

const buildSeasonLabel = (seasonDetail) => {
  const seasonName = seasonDetail?.season?.name || "Mùa vụ";
  return seasonDetail?.year ? `${seasonName} ${seasonDetail.year}` : seasonName;
};

const getDashboardData = async (querySeasonDetailId = "") => {
  const seasonDetail = await resolveSeasonDetail(querySeasonDetailId);

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

  const [
    totalFarmers,
    totalAreaResult,
    totalCostResult,
    totalActivePlots,
    costByCategory,
    costByStage,
    recentFarmingLogs,
    recentDiseaseLogs,
  ] = await Promise.all([
    User.countDocuments({ role: "farmer" }),
    plotIds.length
      ? Plot.aggregate([
          { $match: { _id: { $in: plotIds } } },
          {
            $group: {
              _id: null,
              totalArea: { $sum: "$area" },
            },
          },
        ])
      : Promise.resolve([]),
    assignmentIds.length
      ? FarmingLog.aggregate([
          { $match: { seasonPlotAssignments: { $in: assignmentIds } } },
          {
            $group: {
              _id: null,
              totalCost: { $sum: "$cost" },
            },
          },
        ])
      : Promise.resolve([]),
    assignmentIds.length,
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
          {
            $unwind: {
              path: "$task",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: {
                category: { $ifNull: ["$task.category", "OTHER"] },
              },
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
                    { case: { $eq: ["$_id.category", "FERTILIZER"] }, then: "Phân bón" },
                    { case: { $eq: ["$_id.category", "PESTICIDE"] }, then: "Thuốc BVTV" },
                    { case: { $eq: ["$_id.category", "LABOR"] }, then: "Nhân công" },
                    { case: { $eq: ["$_id.category", "SEED"] }, then: "Lúa giống" },
                    { case: { $eq: ["$_id.category", "WATER"] }, then: "Bơm nước" },
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
          {
            $unwind: {
              path: "$task",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "stages",
              localField: "task.stage",
              foreignField: "_id",
              as: "stage",
            },
          },
          {
            $unwind: {
              path: "$stage",
              preserveNullAndEmptyArrays: true,
            },
          },
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
    assignmentIds.length
      ? FarmingLog.find({
          seasonPlotAssignments: { $in: assignmentIds },
        })
          .populate("task", "name")
          .populate("user", "fullName")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      : Promise.resolve([]),
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
  ]);

  return {
    seasonDetailId: String(seasonDetail._id),
    currentSeasonName: buildSeasonLabel(seasonDetail),
    kpis: {
      totalFarmers,
      totalArea: totalAreaResult[0]?.totalArea || 0,
      totalCost: totalCostResult[0]?.totalCost || 0,
      totalActivePlots,
    },
    charts: {
      costByCategory,
      costByStage,
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
