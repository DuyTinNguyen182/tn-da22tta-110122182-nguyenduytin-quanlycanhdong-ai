const mongoose = require("mongoose");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const Plot = require("../models/plotModel");
const FarmingLog = require("../models/farmingLogModel");
const DiseaseLog = require("../models/diseaseLogModel");
const Task = require("../models/taskModel");

const toObjectId = (id) => new mongoose.Types.ObjectId(id);
const EMPTY_DASHBOARD = {
  seasonDetailId: "",
  currentSeasonName: "",
  kpis: {
    totalArea: 0,
    totalCost: 0,
    totalActivePlots: 0,
    costPer1000m2: 0,
    comparison: { text: "", type: "neutral" },
  },
  charts: {
    costByCategory: [],
    costByStage: [],
    cropProgress: [],
  },
  alerts: {
    unprocessedDiseases: [],
  },
  liveFeeds: {
    recentFarmingLogs: [],
  },
};

const resolveSeasonDetail = async (querySeasonDetailId) => {
  if (querySeasonDetailId) {
    const seasonDetail = await SeasonDetail.findById(querySeasonDetailId)
      .populate("season", "name")
      .lean();
    if (!seasonDetail) throw new Error("Không tìm thấy mùa vụ được chọn");
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

  return activeSeasonDetail || null;
};

// Hàm lấy thông tin vụ trước
const getPreviousSeasonDetail = async (currentSeasonDetail) => {
  if (!currentSeasonDetail) return null;
  return await SeasonDetail.findOne({
    startDate: { $lt: currentSeasonDetail.startDate },
  })
    .sort({ startDate: -1 })
    .lean();
};

const buildSeasonLabel = (seasonDetail) => {
  const seasonName = seasonDetail?.season?.name || "Mùa vụ";
  return seasonDetail?.year ? `${seasonName} ${seasonDetail.year}` : seasonName;
};

const getFarmerDashboardData = async (userId, querySeasonDetailId = "") => {
  if (!userId) {
    return EMPTY_DASHBOARD;
  }

  const seasonDetail = await resolveSeasonDetail(querySeasonDetailId);

  if (!seasonDetail) {
    return {
      ...EMPTY_DASHBOARD,
      currentSeasonName: "Chưa có mùa vụ hoạt động",
    };
  }

  const userObjectId = toObjectId(userId);

  // 1. Lấy assignment CỦA RIÊNG NÔNG DÂN NÀY (Vụ hiện tại)
  const userAssignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonDetail._id,
    user: userId,
    status: "active",
  })
    .select("_id plot")
    .lean();
  const userAssignmentIds = userAssignments.map((a) => a._id);
  const userPlotIds = [...new Set(userAssignments.map((a) => String(a.plot)))];

  // 2. Lấy dữ liệu VỤ TRƯỚC của Nông dân này
  const prevSeasonDetail = await getPreviousSeasonDetail(seasonDetail);
  let prevUserAssignmentIds = [];
  let prevUserPlotIds = [];

  if (prevSeasonDetail) {
    const prevAssignments = await SeasonPlotAssignment.find({
      seasonDetail: prevSeasonDetail._id,
      user: userId,
      status: "active",
    })
      .select("_id plot")
      .lean();
    prevUserAssignmentIds = prevAssignments.map((a) => a._id);
    prevUserPlotIds = [...new Set(prevAssignments.map((a) => String(a.plot)))];
  }

  // 3. Thực hiện các câu query song song
  const [
    userAreaResult,
    userCostResult,
    prevAreaResult,
    prevCostResult,
    costByCategory,
    costByStage,
    cropProgress,
    unprocessedDiseases,
    recentFarmingLogs,
  ] = await Promise.all([
    // Diện tích vụ hiện tại
    userPlotIds.length
      ? Plot.aggregate([
          { $match: { _id: { $in: userPlotIds.map((id) => toObjectId(id)) } } },
          { $group: { _id: null, totalArea: { $sum: "$area" } } },
        ])
      : Promise.resolve([{ totalArea: 0 }]),
    // Chi phí vụ hiện tại
    userAssignmentIds.length
      ? FarmingLog.aggregate([
          {
            $match: {
              seasonPlotAssignments: { $in: userAssignmentIds },
              user: userObjectId,
            },
          },
          { $group: { _id: null, totalCost: { $sum: "$cost" } } },
        ])
      : Promise.resolve([{ totalCost: 0 }]),

    // Diện tích vụ trước
    prevUserPlotIds.length
      ? Plot.aggregate([
          {
            $match: {
              _id: { $in: prevUserPlotIds.map((id) => toObjectId(id)) },
            },
          },
          { $group: { _id: null, totalArea: { $sum: "$area" } } },
        ])
      : Promise.resolve([{ totalArea: 0 }]),
    // Chi phí vụ trước
    prevUserAssignmentIds.length
      ? FarmingLog.aggregate([
          {
            $match: {
              seasonPlotAssignments: { $in: prevUserAssignmentIds },
              user: userObjectId,
            },
          },
          { $group: { _id: null, totalCost: { $sum: "$cost" } } },
        ])
      : Promise.resolve([{ totalCost: 0 }]),

    // Biểu đồ: Chi phí theo danh mục
    userAssignmentIds.length
      ? FarmingLog.aggregate([
          {
            $match: {
              seasonPlotAssignments: { $in: userAssignmentIds },
              user: userObjectId,
            },
          },
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
          { $sort: { totalCost: -1 } },
        ])
      : Promise.resolve([]),

    // Biểu đồ: Chi phí theo giai đoạn
    userAssignmentIds.length
      ? FarmingLog.aggregate([
          {
            $match: {
              seasonPlotAssignments: { $in: userAssignmentIds },
              user: userObjectId,
            },
          },
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
                stageName: { $ifNull: ["$stage.name", "Khác"] },
                stageOrder: { $ifNull: ["$stage.order", 9999] },
              },
              totalCost: { $sum: { $ifNull: ["$cost", 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              stageName: "$_id.stageName",
              stageOrder: "$_id.stageOrder",
              totalCost: 1,
            },
          },
          { $sort: { stageOrder: 1 } },
        ])
      : Promise.resolve([]),

    // Tiến độ canh tác
    userAssignmentIds.length
      ? SeasonPlotAssignment.aggregate([
          { $match: { _id: { $in: userAssignmentIds }, user: userObjectId } },
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
                stageName: { $ifNull: ["$stageData.name", "Chưa bắt đầu"] },
                stageOrder: { $ifNull: ["$stageData.order", 0] },
              },
              totalArea: { $sum: "$plotData.area" },
            },
          },
          { $sort: { "_id.stageOrder": 1 } },
          { $project: { _id: 0, stageName: "$_id.stageName", totalArea: 1 } },
        ])
      : Promise.resolve([]),

    // Cảnh báo bệnh chưa xử lý
    userAssignmentIds.length
      ? DiseaseLog.find({
          seasonPlotAssignments: { $in: userAssignmentIds },
          user: userId,
          status: "unprocessed",
        })
          .populate("seasonPlotAssignments")
          .sort({ detectedAt: -1 })
          .lean()
      : Promise.resolve([]),

    // Log gần nhất
    userAssignmentIds.length
      ? FarmingLog.find({
          seasonPlotAssignments: { $in: userAssignmentIds },
          user: userId,
        })
          .populate("task", "name")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      : Promise.resolve([]),
  ]);

  // Xử lý số liệu so sánh KPI với vụ trước
  const userTotalArea = userAreaResult[0]?.totalArea || 0;
  const userTotalCost = userCostResult[0]?.totalCost || 0;
  const userCostPer1000 =
    userTotalArea > 0 ? (userTotalCost / userTotalArea) * 1000 : 0;

  const prevTotalArea = prevAreaResult[0]?.totalArea || 0;
  const prevTotalCost = prevCostResult[0]?.totalCost || 0;
  const prevCostPer1000 =
    prevTotalArea > 0 ? (prevTotalCost / prevTotalArea) * 1000 : 0;

  let comparisonText = "Chưa có dữ liệu vụ trước";
  let comparisonType = "neutral";

  if (prevCostPer1000 > 0) {
    const diffPercent =
      ((userCostPer1000 - prevCostPer1000) / prevCostPer1000) * 100;

    if (diffPercent < -5) {
      comparisonText = `Tiết kiệm hơn ${Math.abs(diffPercent).toFixed(1)}% so với vụ trước`;
      comparisonType = "good";
    } else if (diffPercent > 5) {
      comparisonText = `Cao hơn ${diffPercent.toFixed(1)}% so với vụ trước`;
      comparisonType = "bad";
    } else {
      comparisonText = `Đang bám sát mức chi tiêu của vụ trước`;
      comparisonType = "neutral";
    }
  } else if (userCostPer1000 > 0) {
    comparisonText = "Vụ đầu tiên ghi nhận chi phí trên hệ thống";
  }

  return {
    seasonDetailId: String(seasonDetail._id),
    currentSeasonName: buildSeasonLabel(seasonDetail),
    kpis: {
      totalActivePlots: userAssignmentIds.length,
      totalArea: userTotalArea,
      totalCost: userTotalCost,
      costPer1000m2: userCostPer1000,
      comparison: { text: comparisonText, type: comparisonType },
    },
    charts: { costByCategory, costByStage, cropProgress },
    alerts: { unprocessedDiseases },
    liveFeeds: { recentFarmingLogs },
  };
};

const getDailyRecommendations = async (farmerId, querySeasonDetailId = "") => {
  try {
    const now = new Date();

    const seasonDetail = await resolveSeasonDetail(querySeasonDetailId);

    // Nếu hệ thống hoàn toàn không có mùa vụ nào
    if (!seasonDetail) {
      return { hasActiveSeason: false, isSeasonEnded: false, data: [] };
    }

    // 2. Xác định xem mùa vụ được chọn đã kết thúc hay chưa
    const isSeasonEnded = seasonDetail.endDate
      ? new Date(seasonDetail.endDate) < now
      : false;

    // 3. NẾU ĐÃ KẾT THÚC: Trả về cờ isSeasonEnded = true và ngừng tính toán (bảo vệ tài nguyên server)
    if (isSeasonEnded) {
      return { hasActiveSeason: true, isSeasonEnded: true, data: [] };
    }

    // 4. Nếu chưa kết thúc, tìm kiếm các assignment của farmer trong mùa vụ đó
    const assignments = await SeasonPlotAssignment.find({
      seasonDetail: seasonDetail._id,
      user: farmerId,
      status: "active",
    })
      .populate("plot", "name")
      .lean();

    if (!assignments.length)
      return { hasActiveSeason: true, isSeasonEnded: false, data: [] };

    const sowingTask = await Task.findOne({
      "recommendation.isSowingTask": true,
    }).lean();

    const allPrepTasks = await Task.find({
      "recommendation.isSuggested": true,
      "recommendation.startDay": { $lt: 0 },
    }).lean();

    let recommendations = [];

    const checkPrerequisites = (task, completedTaskIdsSet) => {
      if (!task.prerequisites || task.prerequisites.length === 0) return true;
      return task.prerequisites.every((prereqId) =>
        completedTaskIdsSet.has(String(prereqId)),
      );
    };

    for (const assignment of assignments) {
      const plotName = assignment.plot?.name || "Thửa chưa rõ";
      const plotId = assignment.plot?._id;

      const completedLogs = await FarmingLog.find({
        seasonPlotAssignments: assignment._id,
      })
        .select("task date createdAt")
        .lean();

      const completedTaskIds = new Set(
        completedLogs.map((log) => String(log.task)),
      );

      let sowingLog = null;
      if (sowingTask && completedTaskIds.has(String(sowingTask._id))) {
        sowingLog = completedLogs.find(
          (log) => String(log.task) === String(sowingTask._id),
        );
      }

      if (sowingLog) {
        const logDate = new Date(sowingLog.date || sowingLog.createdAt);
        const daysSinceSowing = Math.floor(
          (now - logDate) / (1000 * 60 * 60 * 24),
        );

        const dueTasks = await Task.find({
          "recommendation.isSuggested": true,
          "recommendation.isSowingTask": false,
          "recommendation.startDay": { $gte: 0, $lte: daysSinceSowing },
          // "recommendation.endDay": { $gte: daysSinceSowing },
        }).lean();

        for (const task of dueTasks) {
          const isDone = completedTaskIds.has(String(task._id));

          if (!isDone) {
            const isReady = checkPrerequisites(task, completedTaskIds);

            const isOverdue = daysSinceSowing > task.recommendation.endDay;

            recommendations.push({
              plotId,
              plotName,
              taskId: task._id,
              taskName: task.name,
              type: "CARE",
              message: isOverdue
                ? `Lúa đang ${daysSinceSowing} ngày tuổi. Đã quá hạn lịch ${task.name}.`
                : `Lúa đang ${daysSinceSowing} ngày tuổi. Đã đến lịch ${task.name}.`,
              urgency: isOverdue
                ? "OVERDUE"
                : daysSinceSowing === task.recommendation.endDay
                  ? "HIGH"
                  : "NORMAL",
              isOverdue: isOverdue,
              isReady: isReady,
            });
          }
        }
      } else {
        if (now >= new Date(seasonDetail.startDate)) {
          let pendingPrepCount = 0;

          for (const task of allPrepTasks) {
            const isDone = completedTaskIds.has(String(task._id));

            if (!isDone) {
              pendingPrepCount++;
              const isReady = checkPrerequisites(task, completedTaskIds);
              if (isReady) {
                recommendations.push({
                  plotId,
                  plotName,
                  taskId: task._id,
                  taskName: task.name,
                  type: "PREP",
                  message: "Công việc chuẩn bị đồng ruộng đến hạn.",
                  urgency: "NORMAL",
                });
              }
            }
          }

          if (sowingTask && !completedTaskIds.has(String(sowingTask._id))) {
            const isSowingReady = checkPrerequisites(
              sowingTask,
              completedTaskIds,
            );
            if (isSowingReady) {
              recommendations.push({
                plotId,
                plotName,
                taskId: sowingTask._id,
                taskName: sowingTask.name,
                type: "SOWING",
                message:
                  pendingPrepCount > 0
                    ? "Hoàn tất các việc chuẩn bị để sẵn sàng gieo sạ."
                    : "Đồng ruộng đã sẵn sàng, hãy tiến hành gieo sạ theo lịch!",
                urgency: pendingPrepCount > 0 ? "NORMAL" : "HIGH",
              });
            }
          }
        }
      }
    }

    return {
      hasActiveSeason: true,
      isSeasonEnded: false,
      data: recommendations,
    };
  } catch (error) {
    throw new Error(`Lỗi khi tạo gợi ý: ${error.message}`);
  }
};

module.exports = { getFarmerDashboardData, getDailyRecommendations };
