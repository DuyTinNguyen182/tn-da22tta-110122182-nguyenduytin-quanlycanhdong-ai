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

  if (activeSeasonDetail) {
    return activeSeasonDetail;
  }

  return await SeasonDetail.findOne({})
    .populate("season", "name")
    .sort({ startDate: -1, createdAt: -1 })
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

  const userObjectId = toObjectId(userId);
  const seasonDetail = await resolveSeasonDetail(querySeasonDetailId);
  if (!seasonDetail) {
    return EMPTY_DASHBOARD;
  }

  // 1. Lấy TẤT CẢ assignment của Mùa vụ này (để tính trung bình HTX)
  const allAssignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonDetail._id,
    status: "active",
  })
    .select("_id plot")
    .lean();
  const allAssignmentIds = allAssignments.map((a) => a._id);
  const allPlotIds = [...new Set(allAssignments.map((a) => String(a.plot)))];

  // 2. Lấy assignment CỦA RIÊNG NÔNG DÂN NÀY
  const userAssignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonDetail._id,
    user: userId,
    status: "active",
  })
    .select("_id plot")
    .lean();
  const userAssignmentIds = userAssignments.map((a) => a._id);
  const userPlotIds = [...new Set(userAssignments.map((a) => String(a.plot)))];

  // 3. Thực hiện các câu query song song
  const [
    userAreaResult,
    userCostResult,
    allAreaResult,
    allCostResult,
    costByCategory,
    costByStage,
    cropProgress,
    unprocessedDiseases,
    recentFarmingLogs,
  ] = await Promise.all([
    // Diện tích của nông dân
    userPlotIds.length
      ? Plot.aggregate([
          {
            $match: {
              _id: {
                $in: userPlotIds.map((id) => toObjectId(id)),
              },
            },
          },
          { $group: { _id: null, totalArea: { $sum: "$area" } } },
        ])
      : Promise.resolve([{ totalArea: 0 }]),
    // Chi phí của nông dân
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
    // Diện tích của CẢ HTX
    allPlotIds.length
      ? Plot.aggregate([
          {
            $match: {
              _id: {
                $in: allPlotIds.map((id) => toObjectId(id)),
              },
            },
          },
          { $group: { _id: null, totalArea: { $sum: "$area" } } },
        ])
      : Promise.resolve([{ totalArea: 0 }]),
    // Chi phí của CẢ HTX
    allAssignmentIds.length
      ? FarmingLog.aggregate([
          { $match: { seasonPlotAssignments: { $in: allAssignmentIds } } },
          { $group: { _id: null, totalCost: { $sum: "$cost" } } },
        ])
      : Promise.resolve([{ totalCost: 0 }]),

    // Biểu đồ: Chi phí theo danh mục (Của riêng user)
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

    // Biểu đồ: Chi phí theo giai đoạn (Của riêng user)
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

    // Tiến độ canh tác (Của riêng user)
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

    // Cảnh báo bệnh (Của riêng user, chưa xử lý)
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

    // Log gần nhất (Của riêng user)
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

  // Xử lý số liệu so sánh KPI
  const userTotalArea = userAreaResult[0]?.totalArea || 0;
  const userTotalCost = userCostResult[0]?.totalCost || 0;
  const userCostPer1000 =
    userTotalArea > 0 ? (userTotalCost / userTotalArea) * 1000 : 0;

  const allTotalArea = allAreaResult[0]?.totalArea || 0;
  const allTotalCost = allCostResult[0]?.totalCost || 0;
  const allCostPer1000 =
    allTotalArea > 0 ? (allTotalCost / allTotalArea) * 1000 : 0;

  let comparisonText = "Chưa có dữ liệu so sánh";
  let comparisonType = "neutral";

  if (userCostPer1000 > 0 && allCostPer1000 > 0) {
    const diffPercent =
      ((userCostPer1000 - allCostPer1000) / allCostPer1000) * 100;
    if (diffPercent < -5) {
      comparisonText = `Tiết kiệm hơn ${Math.abs(diffPercent).toFixed(1)}% so với TB Hợp tác xã`;
      comparisonType = "good"; // Xanh lá
    } else if (diffPercent > 5) {
      comparisonText = `Cao hơn ${diffPercent.toFixed(1)}% so với TB Hợp tác xã`;
      comparisonType = "bad"; // Đỏ
    } else {
      comparisonText = `Tương đương mức trung bình của Hợp tác xã`;
      comparisonType = "neutral"; // Xám
    }
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
const getDailyRecommendations = async (farmerId) => {
  try {
    const now = new Date();

    // 1. Tìm mùa vụ đang diễn ra
    const activeSeasonDetail = await SeasonDetail.findOne({
      startDate: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
    }).lean();

    if (!activeSeasonDetail) return [];

    // 2. Lấy phân công canh tác của Nông dân này
    const assignments = await SeasonPlotAssignment.find({
      seasonDetail: activeSeasonDetail._id,
      user: farmerId,
      status: "active",
    })
      .populate("plot", "name")
      .lean();

    if (!assignments.length) return [];

    // 3. Lấy dữ liệu cấu hình Task từ DB
    const sowingTask = await Task.findOne({
      "recommendation.isSowingTask": true,
    }).lean();
    const allPrepTasks = await Task.find({
      "recommendation.isSuggested": true,
      "recommendation.startDay": { $lt: 0 },
    }).lean();

    let recommendations = [];

    // ---------------------------------------------------------
    // [LÕI NÂNG CẤP]: HÀM KIỂM TRA ĐIỀU KIỆN TIÊN QUYẾT
    // ---------------------------------------------------------
    const checkPrerequisites = (task, completedTaskIdsSet) => {
      if (!task.prerequisites || task.prerequisites.length === 0) return true; // Không yêu cầu gì -> Pass
      // Kiểm tra xem MỌI công việc tiên quyết đều đã được nông dân làm (nằm trong set)
      return task.prerequisites.every((prereqId) =>
        completedTaskIdsSet.has(String(prereqId)),
      );
    };

    // 4. CHẠY THUẬT TOÁN GỢI Ý CHO TỪNG THỬA RUỘNG
    for (const assignment of assignments) {
      const plotName = assignment.plot?.name || "Thửa chưa rõ";
      const plotId = assignment.plot?._id;

      // [QUAN TRỌNG]: Lấy TẤT CẢ nhật ký đã ghi của thửa này để làm đối chứng
      const completedLogs = await FarmingLog.find({
        seasonPlotAssignments: assignment._id,
      })
        .select("task date createdAt")
        .lean();
      const completedTaskIds = new Set(
        completedLogs.map((log) => String(log.task)),
      );

      // Tìm nhật ký gieo sạ
      let sowingLog = null;
      if (sowingTask && completedTaskIds.has(String(sowingTask._id))) {
        sowingLog = completedLogs.find(
          (log) => String(log.task) === String(sowingTask._id),
        );
      }

      if (sowingLog) {
        // --- GIAI ĐOẠN 2: ĐÃ GIEO SẠ (Đếm tuổi lúa) ---
        const logDate = new Date(sowingLog.date || sowingLog.createdAt);
        const daysSinceSowing = Math.floor(
          (now - logDate) / (1000 * 60 * 60 * 24),
        );

        const dueTasks = await Task.find({
          "recommendation.isSuggested": true,
          "recommendation.isSowingTask": false,
          "recommendation.startDay": { $gte: 0, $lte: daysSinceSowing },
          "recommendation.endDay": { $gte: daysSinceSowing },
        }).lean();

        for (const task of dueTasks) {
          const isDone = completedTaskIds.has(String(task._id));

          if (!isDone) {
            // Kể cả chăm sóc sau sạ cũng áp dụng luật tuần tự
            const isReady = checkPrerequisites(task, completedTaskIds);

            if (isReady) {
              recommendations.push({
                plotId,
                plotName,
                taskId: task._id,
                taskName: task.name,
                type: "CARE",
                message: `Lúa đang ${daysSinceSowing} ngày tuổi. Đã đến lịch ${task.name}.`,
                urgency:
                  daysSinceSowing === task.recommendation.endDay
                    ? "HIGH"
                    : "NORMAL",
              });
            }
          }
        }
      } else {
        // --- GIAI ĐOẠN 1: CHƯA GIEO SẠ (Checklist Chuẩn bị có tuần tự) ---
        if (now >= new Date(activeSeasonDetail.startDate)) {
          let pendingPrepCount = 0;

          for (const task of allPrepTasks) {
            const isDone = completedTaskIds.has(String(task._id));

            if (!isDone) {
              pendingPrepCount++;
              // CHỈ GỢI Ý CÔNG VIỆC NÀY NẾU NÔNG DÂN ĐÃ LÀM XONG VIỆC TRƯỚC ĐÓ
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
            // SẠ LÚA LÀ BƯỚC CUỐI CÙNG: Chỉ hiện Sạ lúa khi đã xử lý giống và làm đất xong!
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

    return recommendations;
  } catch (error) {
    throw new Error(`Lỗi khi tạo gợi ý: ${error.message}`);
  }
};

module.exports = { getFarmerDashboardData, getDailyRecommendations };
