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
        diseaseTrends: [],
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
    rawDailyDiseases,
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

    // 6. Recent Farming Logs
    assignmentIds.length
      ? FarmingLog.find({ seasonPlotAssignments: { $in: assignmentIds } })
          .populate("task", "name")
          .populate("user", "fullName")
          .populate({
            path: "seasonPlotAssignments",
            select: "seasonDetail plot field user",
            populate: [
              { path: "plot", select: "name" },
              { path: "field", select: "name" },
              { path: "user", select: "fullName" },
            ],
          })
          .sort({ date: -1, createdAt: -1 })
          .limit(3)
          .lean()
      : Promise.resolve([]),

    Promise.resolve([]),

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

    // Tần suất phát hiện dịch bệnh theo ngày (Lấy chi tiết - Gộp chung log)
    assignmentIds.length
      ? DiseaseLog.aggregate([
          { $match: { seasonPlotAssignments: { $in: assignmentIds } } },
          {
            $lookup: {
              from: "season_plot_assignments",
              localField: "seasonPlotAssignments",
              foreignField: "_id",
              as: "assignments",
            },
          },
          {
            $lookup: {
              from: "plots",
              localField: "assignments.plot",
              foreignField: "_id",
              as: "plots", // Trả về mảng chứa toàn bộ data các thửa đất của log này
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userData",
            },
          },
          { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$detectedAt" },
              },
              diseaseCount: { $sum: 1 },
              details: {
                $push: {
                  diseaseName: {
                    $ifNull: ["$diseaseName", "Bệnh chưa xác định"],
                  },
                  farmerName: {
                    $ifNull: ["$userData.fullName", "Chưa xác định"],
                  },
                  plotNames: "$plots.name",
                  status: { $ifNull: ["$status", "unprocessed"] },
                },
              },
            },
          },
          { $sort: { _id: 1 } },
        ])
      : Promise.resolve([]),

    // Top thửa ruộng có chi phí/1000m2 cao nhất
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

  // Lập bản đồ dữ liệu
  const diseaseMap = new Map(rawDailyDiseases.map((item) => [item._id, item]));
  const diseaseTrends = [];

  let start = new Date(seasonDetail.startDate);

  // --- LOGIC CẮT BỎ KHOẢNG TRỐNG FLATLINE ĐẦU MÙA VỤ ---
  if (rawDailyDiseases.length > 0) {
    // Lấy ngày có ca bệnh đầu tiên (do rawDailyDiseases đã được $sort tăng dần)
    const firstDiseaseDate = new Date(rawDailyDiseases[0]._id);

    // Lùi lại 3 ngày để làm "khoảng đệm" (padding)
    firstDiseaseDate.setDate(firstDiseaseDate.getDate() - 3);

    // Nếu ngày bắt đầu có dịch (đã lùi 3 ngày) lớn hơn ngày bắt đầu mùa vụ,
    // thì dời mốc vẽ biểu đồ về ngày này để cắt bỏ đoạn flatline 0 vô nghĩa.
    if (firstDiseaseDate > start) {
      start = firstDiseaseDate;
    }
  }
  // ---------------------------------------------------------

  let end = new Date(); // Mặc định mốc kết thúc là ngày hôm nay

  // Cắt mốc tương lai
  if (seasonDetail.endDate) {
    const parsedEndDate = new Date(seasonDetail.endDate);
    if (parsedEndDate < end) {
      end = parsedEndDate;
    }
  }

  // Vòng lặp điền bù ngày trống
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const uiLabel = `${dd}/${mm}`;

    if (diseaseMap.has(dateKey)) {
      const dayData = diseaseMap.get(dateKey);
      diseaseTrends.push({
        _id: uiLabel,
        diseaseCount: dayData.diseaseCount,
        details: dayData.details,
      });
    } else {
      diseaseTrends.push({
        _id: uiLabel,
        diseaseCount: 0,
        details: [],
      });
    }
  }

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
      diseaseTrends,
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
