const SeasonDetail = require("../models/seasonDetailModel");
const DiaryLog = require("../models/farmingLogModel");
const DiseaseLog = require("../models/diseaseLogModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const Plot = require("../models/plotModel");
const {
  getSeasonMap,
  resolveSeasonId,
  getSeasonNameById,
} = require("./seasonService");
const {
  autoAssignActivePlotsForCurrentSeason,
  autoAssignActivePlotsToSeason,
} = require("./seasonPlotAutoAssignmentService");

const inferSeasonYear = (value) => {
  const sourceDate =
    value?.startDate || value?.endDate || value?.createdAt || value || null;

  if (!sourceDate) {
    return null;
  }

  const parsedDate = new Date(sourceDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getFullYear();
};

const normalizeSeasonYear = (value, fallbackValue = null) => {
  if (value === undefined || value === null || value === "") {
    if (
      fallbackValue !== null &&
      fallbackValue !== undefined &&
      fallbackValue !== ""
    ) {
      return fallbackValue;
    }

    throw new Error("Năm mùa vụ là bắt buộc");
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 2000 || parsed > 2100) {
    throw new Error("Năm mùa vụ không hợp lệ");
  }

  return parsed;
};

const getResolvedSeasonYear = (seasonDetail) => {
  if (
    seasonDetail?.year !== undefined &&
    seasonDetail?.year !== null &&
    seasonDetail?.year !== ""
  ) {
    return normalizeSeasonYear(seasonDetail.year);
  }

  return inferSeasonYear(seasonDetail);
};

const buildSeasonYearRange = (year) => ({
  $gte: new Date(year, 0, 1),
  $lt: new Date(year + 1, 0, 1),
});

const buildSeasonYearDuplicateQuery = (seasonId, year, excludeId = null) => ({
  season: seasonId,
  ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  $or: [
    { year },
    {
      $and: [
        { $or: [{ year: { $exists: false } }, { year: null }] },
        { startDate: buildSeasonYearRange(year) },
      ],
    },
  ],
});

const decorateSeasonDetail = (seasonDoc, catalogMap) => {
  const detail = seasonDoc.toObject
    ? seasonDoc.toObject({ virtuals: true })
    : { ...seasonDoc };
  const seasonRefId =
    detail.season && typeof detail.season === "object" && detail.season._id
      ? String(detail.season._id)
      : detail.season
        ? String(detail.season)
        : null;

  const seasonMeta = seasonRefId
    ? catalogMap.get(seasonRefId) || detail.season || null
    : null;
  const seasonName = seasonMeta?.name || "Không xác định";
  const year = getResolvedSeasonYear(detail);

  return {
    ...detail,
    year,
    seasonId: seasonRefId,
    season: seasonMeta,
    seasonName,
    seasonLabel: year ? `${seasonName} ${year}` : seasonName,
    name: seasonName,
  };
};

const getAllSeasonDetails = async () => {
  const [seasonDocs, catalogMap] = await Promise.all([
    SeasonDetail.find()
      .populate("season", "name")
      .sort({ year: -1, startDate: -1, createdAt: -1 }),
    getSeasonMap(),
  ]);

  return seasonDocs.map((doc) => decorateSeasonDetail(doc, catalogMap));
};

const getSeasonDetailById = async (id) => {
  const seasonDoc = await SeasonDetail.findById(id).populate("season", "name");
  if (!seasonDoc) {
    throw new Error("Không tìm thấy chi tiết mùa vụ");
  }

  const catalogMap = await getSeasonMap();
  return decorateSeasonDetail(seasonDoc, catalogMap);
};

const getActiveSeasonDetail = async () => {
  await autoAssignActivePlotsForCurrentSeason();

  const now = new Date();
  const seasonDoc = await SeasonDetail.findOne({
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  }).populate("season", "name");

  if (!seasonDoc) {
    return null;
  }

  const catalogMap = await getSeasonMap();
  return decorateSeasonDetail(seasonDoc, catalogMap);
};

const ensureNoOverlappingActiveSeason = async (targetId = null) => {
  const now = new Date();
  const existingActive = await SeasonDetail.findOne({
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
    ...(targetId ? { _id: { $ne: targetId } } : {}),
  });

  if (existingActive) {
    throw new Error(
      "Đang có một mùa vụ đang hoạt động. Hãy kết thúc mùa vụ hiện tại trước.",
    );
  }
};

const createSeasonDetail = async (data) => {
  const { startDate, endDate } = data;
  const seasonId = await resolveSeasonId(data);
  const catalogMap = await getSeasonMap();
  const resolvedName = catalogMap.get(seasonId)?.name || "Không xác định";
  const year = normalizeSeasonYear(
    data.year,
    inferSeasonYear({ startDate, endDate }),
  );

  const now = new Date();
  const isActive =
    startDate &&
    new Date(startDate) <= now &&
    (!endDate || new Date(endDate) >= now);
  if (isActive) {
    await ensureNoOverlappingActiveSeason();
  }

  const exists = await SeasonDetail.findOne(
    buildSeasonYearDuplicateQuery(seasonId, year),
  );
  if (exists) {
    throw new Error(`Mùa vụ "${resolvedName}" của năm ${year} đã tồn tại.`);
  }

  const seasonDetail = await SeasonDetail.create({
    season: seasonId,
    year,
    startDate: startDate || null,
    endDate: endDate || null,
  });
  const autoAssignment = await autoAssignActivePlotsToSeason(seasonDetail);

  const seasonDoc = await SeasonDetail.findById(seasonDetail._id).populate(
    "season",
    "name",
  );
  return {
    ...decorateSeasonDetail(seasonDoc, catalogMap),
    autoAssignment,
  };
};

const updateSeasonDetail = async (id, data) => {
  const existing = await SeasonDetail.findById(id);
  if (!existing) {
    throw new Error("Không tìm thấy chi tiết mùa vụ");
  }

  const updateData = {};

  if (data.seasonName || data.seasonId || data.seasonCode) {
    updateData.season = await resolveSeasonId({
      seasonId: data.seasonId,
      seasonCode: data.seasonCode,
      seasonName: data.seasonName,
    });
  }

  if (data.startDate !== undefined) {
    updateData.startDate = data.startDate;
  }

  if (data.endDate !== undefined) {
    updateData.endDate = data.endDate;
  }

  const nextYear =
    data.year !== undefined
      ? normalizeSeasonYear(data.year)
      : normalizeSeasonYear(existing.year, inferSeasonYear(existing));
  updateData.year = nextYear;

  const now = new Date();
  const finalStartDate =
    updateData.startDate !== undefined
      ? updateData.startDate
      : existing.startDate;
  const finalEndDate =
    updateData.endDate !== undefined ? updateData.endDate : existing.endDate;
  const isActive =
    finalStartDate &&
    new Date(finalStartDate) <= now &&
    (!finalEndDate || new Date(finalEndDate) >= now);

  if (isActive) {
    await ensureNoOverlappingActiveSeason(id);
  }

  const newSeasonId = updateData.season || existing.season;
  const duplicate = await SeasonDetail.findOne(
    buildSeasonYearDuplicateQuery(newSeasonId, nextYear, id),
  );

  if (duplicate) {
    const resolvedName = await getSeasonNameById(newSeasonId);
    throw new Error(`Mùa vụ "${resolvedName}" của năm ${nextYear} đã tồn tại.`);
  }

  const updatedDoc = await SeasonDetail.findByIdAndUpdate(id, updateData, {
    new: true,
  }).populate("season", "name");
  const autoAssignment = await autoAssignActivePlotsToSeason(updatedDoc);

  const catalogMap = await getSeasonMap();
  return updatedDoc
    ? {
        ...decorateSeasonDetail(updatedDoc, catalogMap),
        autoAssignment,
      }
    : null;
};

const finishSeasonDetail = async (id) => {
  const existing = await SeasonDetail.findById(id);
  if (!existing) {
    throw new Error("Không tìm thấy chi tiết mùa vụ");
  }

  const now = new Date();
  if (existing.endDate && existing.endDate < now) {
    throw new Error("Mùa vụ này đã được kết thúc trước đó");
  }

  const updatedDoc = await SeasonDetail.findByIdAndUpdate(
    id,
    { endDate: now },
    { new: true },
  ).populate("season", "name");

  const catalogMap = await getSeasonMap();
  return updatedDoc ? decorateSeasonDetail(updatedDoc, catalogMap) : null;
};

const deleteSeasonDetail = async (id) => {
  const season = await SeasonDetail.findById(id);
  if (!season) {
    throw new Error("Không tìm thấy chi tiết mùa vụ");
  }

  const assignments = await SeasonPlotAssignment.find({ seasonDetail: id })
    .select("_id")
    .lean();
  const assignmentIds = assignments.map((item) => item._id);

  await Promise.all([
    assignmentIds.length
      ? DiaryLog.deleteMany({ seasonPlotAssignments: { $in: assignmentIds } })
      : Promise.resolve(),
    assignmentIds.length
      ? DiseaseLog.deleteMany({ seasonPlotAssignments: { $in: assignmentIds } })
      : Promise.resolve(),
    SeasonPlotAssignment.deleteMany({ seasonDetail: id }),
  ]);

  await SeasonDetail.deleteOne({ _id: id });
  return season;
};

const getFarmerSeasonDetails = async (userId, fieldId) => {
  await autoAssignActivePlotsForCurrentSeason();

  const seasonDocs = await SeasonDetail.find()
    .populate("season", "name")
    .sort({ year: -1, startDate: -1, createdAt: -1 });

  const catalogMap = await getSeasonMap();
  const plotQuery = {
    user: userId,
    ...(fieldId ? { field: fieldId } : {}),
  };
  const assignmentQuery = {
    user: userId,
    ...(fieldId ? { field: fieldId } : {}),
  };
  const plots = await Plot.find(plotQuery).lean();
  const activePlots = plots.filter((plot) => plot.status === "active");
  const results = [];

  for (const doc of seasonDocs) {
    const seasonDecorated = decorateSeasonDetail(doc, catalogMap);
    const now = new Date();
    let seasonStatus = "planned";
    if (doc.endDate && doc.endDate < now) {
      seasonStatus = "completed";
    } else if (
      doc.startDate &&
      doc.startDate <= now &&
      (!doc.endDate || doc.endDate >= now)
    ) {
      seasonStatus = "active";
    }

    seasonDecorated.status = seasonStatus;

    let assignments = await SeasonPlotAssignment.find({
      seasonDetail: doc._id,
      ...assignmentQuery,
    })
      .populate("plot", "name area status")
      .lean();

    // if (seasonStatus === "active" && activePlots.length > 0) {
    //   const assignedPlotIds = new Set(
    //     assignments.map((item) => String(item.plot?._id || item.plot)),
    //   );
    //   const missingPlots = activePlots.filter(
    //     (plot) => !assignedPlotIds.has(String(plot._id)),
    //   );

    //   if (missingPlots.length > 0) {
    //     const payload = missingPlots.map((plot) => ({
    //       seasonDetail: doc._id,
    //       field: plot.field,
    //       plot: plot._id,
    //       user: userId,
    //       status: "active",
    //     }));

    //     await SeasonPlotAssignment.insertMany(payload);
    //     assignments = await SeasonPlotAssignment.find({
    //       seasonDetail: doc._id,
    //       ...assignmentQuery,
    //     })
    //       .populate("plot", "name area status")
    //       .lean();
    //   }
    // }

    if (assignments.length === 0 && seasonStatus !== "active") {
      continue;
    }

    const activeAssignments = assignments.filter(
      (item) => item.status === "active",
    );
    const loggableAssignments = activeAssignments.filter(
      (item) => item.plot?.status === "active",
    );

    Object.assign(seasonDecorated, {
      assignments,
      assignedPlotIds: activeAssignments.map((item) =>
        String(item.plot?._id || item.plot),
      ),
      assignedPlots: activeAssignments.map((item) => item.plot).filter(Boolean),
      loggablePlotIds: loggableAssignments.map((item) =>
        String(item.plot?._id || item.plot),
      ),
      loggablePlots: loggableAssignments
        .map((item) => item.plot)
        .filter(Boolean),
      totalPlotCount: activeAssignments.length,
      historicalPlotCount: assignments.length,
      activePlotCount: activeAssignments.length,
      loggablePlotCount: loggableAssignments.length,
    });

    results.push(seasonDecorated);
  }

  return results;
};

module.exports = {
  getAllSeasonDetails,
  getSeasonDetailById,
  getActiveSeasonDetail,
  getFarmerSeasonDetails,
  createSeasonDetail,
  updateSeasonDetail,
  finishSeasonDetail,
  deleteSeasonDetail,
};
