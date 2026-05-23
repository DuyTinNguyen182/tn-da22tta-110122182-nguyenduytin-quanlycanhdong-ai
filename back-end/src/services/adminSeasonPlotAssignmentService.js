const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const Plot = require("../models/plotModel");
const DiaryLog = require("../models/farmingLogModel");
const DiseaseLog = require("../models/diseaseLogModel");

const sortByRelationNames = (left, right) => {
  const leftFieldName = left?.field?.name || "";
  const rightFieldName = right?.field?.name || "";
  const fieldCompare = leftFieldName.localeCompare(rightFieldName, "vi");
  if (fieldCompare !== 0) return fieldCompare;

  const leftUserName = left?.user?.fullName || "";
  const rightUserName = right?.user?.fullName || "";
  const userCompare = leftUserName.localeCompare(rightUserName, "vi");
  if (userCompare !== 0) return userCompare;

  const leftPlotName = left?.plot?.name || left?.name || "";
  const rightPlotName = right?.plot?.name || right?.name || "";
  return leftPlotName.localeCompare(rightPlotName, "vi");
};

const buildSeasonDetailPayload = (seasonDoc) => {
  if (!seasonDoc) return null;

  const detail = seasonDoc.toObject
    ? seasonDoc.toObject({ virtuals: true })
    : { ...seasonDoc };
  const seasonRef =
    detail.season && typeof detail.season === "object" ? detail.season : null;
  const seasonName = seasonRef?.name || "Khong xac dinh";
  const year =
    detail.year ||
    (detail.startDate ? new Date(detail.startDate).getFullYear() : null);

  return {
    ...detail,
    seasonId: seasonRef?._id ? String(seasonRef._id) : String(detail.season || ""),
    seasonName,
    seasonLabel: year ? `${seasonName} ${year}` : seasonName,
    name: seasonName,
    status: "active",
  };
};

const getActiveSeasonDetailDoc = async () => {
  const now = new Date();

  return await SeasonDetail.findOne({
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  })
    .populate("season", "name")
    .sort({ startDate: -1, createdAt: -1 });
};

const buildLogCountMap = async (Model, assignmentIds) => {
  if (!assignmentIds.length) {
    return new Map();
  }

  const rows = await Model.aggregate([
    {
      $match: {
        seasonPlotAssignments: { $in: assignmentIds },
      },
    },
    { $unwind: "$seasonPlotAssignments" },
    {
      $match: {
        seasonPlotAssignments: { $in: assignmentIds },
      },
    },
    {
      $group: {
        _id: "$seasonPlotAssignments",
        count: { $sum: 1 },
      },
    },
  ]);

  return new Map(rows.map((item) => [String(item._id), item.count || 0]));
};

const normalizePlotIds = (plotIds) => {
  if (!Array.isArray(plotIds) || plotIds.length === 0) {
    throw new Error("Vui long chon it nhat mot thua ruong");
  }

  const normalized = Array.from(
    new Set(
      plotIds.map((item) => String(item || "").trim()).filter(Boolean),
    ),
  );

  if (!normalized.length) {
    throw new Error("Danh sach thua ruong khong hop le");
  }

  return normalized;
};

const getActiveSeasonPlotAssignments = async () => {
  const seasonDoc = await getActiveSeasonDetailDoc();

  if (!seasonDoc) {
    return {
      seasonDetail: null,
      summary: {
        assignedCount: 0,
        availableCount: 0,
        totalActivePlotCount: 0,
        fieldCount: 0,
        farmerCount: 0,
        totalAssignedArea: 0,
        totalAvailableArea: 0,
      },
      assignedPlots: [],
      availablePlots: [],
    };
  }

  const [assignmentDocs, activePlots] = await Promise.all([
    SeasonPlotAssignment.find({ seasonDetail: seasonDoc._id })
      .populate("plot", "name area status")
      .populate("field", "name address")
      .populate("user", "fullName email phone")
      .lean(),
    Plot.find({ status: "active" })
      .populate("field", "name address")
      .populate("user", "fullName email phone")
      .lean(),
  ]);

  const historicalAssignmentsByPlotId = new Map(
    assignmentDocs.map((item) => [String(item.plot?._id || item.plot), item]),
  );
  const activeAssignments = assignmentDocs
    .filter((item) => item.status === "active" && item.plot)
    .sort(sortByRelationNames);
  const assignmentIds = activeAssignments.map((item) => item._id);

  const [diaryLogCountMap, diseaseLogCountMap] = await Promise.all([
    buildLogCountMap(DiaryLog, assignmentIds),
    buildLogCountMap(DiseaseLog, assignmentIds),
  ]);

  const activeAssignedPlotIds = new Set(
    activeAssignments.map((item) => String(item.plot?._id || item.plot)),
  );

  const assignedPlots = activeAssignments.map((item) => {
    const assignmentId = String(item._id);
    const diaryLogCount = diaryLogCountMap.get(assignmentId) || 0;
    const diseaseLogCount = diseaseLogCountMap.get(assignmentId) || 0;

    return {
      assignmentId,
      assignmentStatus: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      diaryLogCount,
      diseaseLogCount,
      hasLogs: diaryLogCount > 0 || diseaseLogCount > 0,
      plot: item.plot,
      field: item.field,
      user: item.user,
    };
  });

  const availablePlots = activePlots
    .filter((plot) => !activeAssignedPlotIds.has(String(plot._id)))
    .map((plot) => ({
      plot,
      field: plot.field,
      user: plot.user,
      hadPreviousAssignment: historicalAssignmentsByPlotId.has(String(plot._id)),
    }))
    .sort(sortByRelationNames);

  return {
    seasonDetail: buildSeasonDetailPayload(seasonDoc),
    summary: {
      assignedCount: assignedPlots.length,
      availableCount: availablePlots.length,
      totalActivePlotCount: activePlots.length,
      fieldCount: new Set(
        assignedPlots.map((item) => String(item.field?._id || item.field || "")),
      ).size,
      farmerCount: new Set(
        assignedPlots.map((item) => String(item.user?._id || item.user || "")),
      ).size,
      totalAssignedArea: assignedPlots.reduce(
        (sum, item) => sum + Number(item.plot?.area || 0),
        0,
      ),
      totalAvailableArea: availablePlots.reduce(
        (sum, item) => sum + Number(item.plot?.area || 0),
        0,
      ),
    },
    assignedPlots,
    availablePlots,
  };
};

const assignPlotsToActiveSeason = async (plotIds) => {
  const seasonDoc = await getActiveSeasonDetailDoc();
  if (!seasonDoc) {
    throw new Error("Khong co mua vu nao dang hoat dong");
  }

  const normalizedPlotIds = normalizePlotIds(plotIds);
  const plotDocs = await Plot.find({ _id: { $in: normalizedPlotIds } }).lean();
  const plotById = new Map(plotDocs.map((item) => [String(item._id), item]));

  if (plotDocs.length !== normalizedPlotIds.length) {
    throw new Error("Mot hoac nhieu thua ruong khong ton tai");
  }

  const inactivePlots = plotDocs.filter((item) => item.status !== "active");
  if (inactivePlots.length > 0) {
    throw new Error("Chi co the them nhung thua ruong dang canh tac");
  }

  const existingAssignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonDoc._id,
    plot: { $in: normalizedPlotIds },
  }).lean();
  const existingAssignmentByPlotId = new Map(
    existingAssignments.map((item) => [String(item.plot), item]),
  );

  const operations = [];
  let createdCount = 0;
  let reactivatedCount = 0;
  let skippedCount = 0;

  normalizedPlotIds.forEach((plotId) => {
    const existingAssignment = existingAssignmentByPlotId.get(plotId);
    const plot = plotById.get(plotId);

    if (!plot) {
      return;
    }

    if (existingAssignment?.status === "active") {
      skippedCount += 1;
      return;
    }

    if (existingAssignment) {
      reactivatedCount += 1;
      operations.push({
        updateOne: {
          filter: { _id: existingAssignment._id },
          update: {
            $set: {
              status: "active",
              field: plot.field,
              user: plot.user,
            },
          },
        },
      });
      return;
    }

    createdCount += 1;
    operations.push({
      insertOne: {
        document: {
          seasonDetail: seasonDoc._id,
          field: plot.field,
          plot: plot._id,
          user: plot.user,
          status: "active",
        },
      },
    });
  });

  if (operations.length > 0) {
    await SeasonPlotAssignment.bulkWrite(operations, { ordered: false });
  }

  return {
    seasonDetail: buildSeasonDetailPayload(seasonDoc),
    createdCount,
    reactivatedCount,
    skippedCount,
  };
};

const removePlotFromActiveSeason = async (plotId) => {
  const seasonDoc = await getActiveSeasonDetailDoc();
  if (!seasonDoc) {
    throw new Error("Khong co mua vu nao dang hoat dong");
  }

  const assignment = await SeasonPlotAssignment.findOne({
    seasonDetail: seasonDoc._id,
    plot: plotId,
    status: "active",
  }).populate("plot", "name");

  if (!assignment) {
    throw new Error("Thua ruong nay khong nam trong mua vu dang hoat dong");
  }

  const assignmentIds = [assignment._id];
  const [diaryLogCountMap, diseaseLogCountMap] = await Promise.all([
    buildLogCountMap(DiaryLog, assignmentIds),
    buildLogCountMap(DiseaseLog, assignmentIds),
  ]);

  const assignmentId = String(assignment._id);
  const diaryLogCount = diaryLogCountMap.get(assignmentId) || 0;
  const diseaseLogCount = diseaseLogCountMap.get(assignmentId) || 0;
  const hasLogs = diaryLogCount > 0 || diseaseLogCount > 0;

  if (hasLogs) {
    assignment.status = "inactive";
    await assignment.save();

    return {
      action: "deactivated",
      plotName: assignment.plot?.name || "Khong xac dinh",
      diaryLogCount,
      diseaseLogCount,
    };
  }

  await assignment.deleteOne();

  return {
    action: "deleted",
    plotName: assignment.plot?.name || "Khong xac dinh",
    diaryLogCount,
    diseaseLogCount,
  };
};

module.exports = {
  getActiveSeasonPlotAssignments,
  assignPlotsToActiveSeason,
  removePlotFromActiveSeason,
};
