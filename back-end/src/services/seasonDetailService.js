const Field = require("../models/fieldModel");
const Plot = require("../models/plotModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const DiaryLog = require("../models/diaryLogModel");
const DiseaseLog = require("../models/diseaseLogModel");
const {
  getSeasonMap,
  resolveSeasonId,
  getSeasonNameById,
} = require("./seasonService");

const buildSeasonQuery = (fieldId, userId) => ({ field: fieldId, user: userId });

const ensureFieldExists = async (fieldId) => {
  const field = await Field.findById(fieldId);
  if (!field) {
    throw new Error("Không tìm thấy cánh đồng");
  }

  return field;
};

const ensureActiveSeasonAvailablePlots = async (fieldId, userId) => {
  const activePlotCount = await Plot.countDocuments({
    field: fieldId,
    user: userId,
    status: "active",
  });

  if (!activePlotCount) {
    throw new Error(
      "Bạn cần có ít nhất 1 thửa ruộng đang active trong cánh đồng này trước khi bắt đầu vụ mới."
    );
  }

  return activePlotCount;
};

const hasActiveSeasonDetails = async (fieldId, userId) => {
  const activeSeason = await SeasonDetail.findOne({
    field: fieldId,
    user: userId,
    status: "active",
  });
  return !!activeSeason;
};

const seasonDetailExists = async (seasonId, year, fieldId, userId) => {
  const existing = await SeasonDetail.findOne({
    season: seasonId,
    year,
    field: fieldId,
    user: userId,
  });
  return !!existing;
};

const normalizePlotIds = (plotIds = []) => {
  const nextIds = Array.isArray(plotIds) ? plotIds : [];
  return Array.from(new Set(nextIds.filter(Boolean).map((item) => String(item))));
};

const buildLegacyPlotIds = async (seasonDoc) => {
  const seasonId = String(seasonDoc._id);
  const logPlotIds = await DiaryLog.distinct("plot", {
    season: seasonId,
    plot: { $ne: null },
  });

  if (logPlotIds.length > 0) {
    return logPlotIds.map((item) => String(item));
  }

  if (seasonDoc.status === "active") {
    const plots = await Plot.find({
      field: seasonDoc.field,
      user: seasonDoc.user,
      status: "active",
    })
      .select("_id")
      .lean();

    return plots.map((item) => String(item._id));
  }

  return [];
};

const ensureSeasonAssignments = async (seasonDoc) => {
  const existingAssignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonDoc._id,
  }).lean();

  if (existingAssignments.length > 0) {
    return existingAssignments;
  }

  const legacyPlotIds = await buildLegacyPlotIds(seasonDoc);
  if (legacyPlotIds.length === 0) {
    return [];
  }

  await SeasonPlotAssignment.insertMany(
    legacyPlotIds.map((plotId) => ({
      seasonDetail: seasonDoc._id,
      field: seasonDoc.field,
      plot: plotId,
      user: seasonDoc.user,
      status: "active",
    }))
  );

  return await SeasonPlotAssignment.find({ seasonDetail: seasonDoc._id }).lean();
};

const getAssignmentsWithPlots = async (seasonDetailId) => {
  return await SeasonPlotAssignment.find({ seasonDetail: seasonDetailId })
    .populate("plot", "name area status addressDetail")
    .sort({ createdAt: 1 })
    .lean();
};

const syncSeasonAssignments = async ({ seasonDoc, plotIds, userId }) => {
  const normalizedIds = normalizePlotIds(plotIds);
  const existingAssignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonDoc._id,
  }).lean();
  const existingMap = new Map(existingAssignments.map((item) => [String(item.plot), item]));

  let candidateIds = normalizedIds;
  if (candidateIds.length === 0) {
    if (existingAssignments.length > 0) {
      candidateIds = existingAssignments
        .filter((item) => item.status === "active")
        .map((item) => String(item.plot));
    } else {
      const activePlots = await Plot.find({
        field: seasonDoc.field,
        user: userId,
        status: "active",
      })
        .select("_id")
        .lean();
      candidateIds = activePlots.map((item) => String(item._id));
    }
  }

  if (candidateIds.length === 0) {
    throw new Error("Cần chọn ít nhất 1 thửa tham gia vụ mùa.");
  }

  const plots = await Plot.find({
    _id: { $in: candidateIds },
    field: seasonDoc.field,
    user: userId,
  })
    .select("_id status")
    .lean();

  if (plots.length !== candidateIds.length) {
    throw new Error("Có thửa ruộng không hợp lệ hoặc không thuộc cánh đồng này.");
  }

  const existingIds = new Set(existingAssignments.map((item) => String(item.plot)));
  const logsByPlot = await DiaryLog.distinct("plot", {
    season: seasonDoc._id,
    plot: { $ne: null },
  });
  const protectedPlotIds = new Set(logsByPlot.map((item) => String(item)));

  candidateIds.forEach((plotId) => {
    const plot = plots.find((item) => String(item._id) === plotId);
    if (plot?.status !== "active" && !existingIds.has(plotId)) {
      throw new Error("Chi co the them cac thua dang active vao vu mua.");
    }
  });

  const operations = [];

  candidateIds.forEach((plotId) => {
    if (!existingIds.has(plotId)) {
      operations.push({
        insertOne: {
          document: {
            seasonDetail: seasonDoc._id,
            field: seasonDoc.field,
            plot: plotId,
            user: userId,
            status: "active",
          },
        },
      });
    } else if (existingMap.get(plotId)?.status !== "active") {
      operations.push({
        updateOne: {
          filter: { seasonDetail: seasonDoc._id, plot: plotId },
          update: { $set: { status: "active", updatedAt: new Date() } },
        },
      });
    }
  });

  existingAssignments.forEach((assignment) => {
    const plotId = String(assignment.plot);
    if (candidateIds.includes(plotId)) {
      return;
    }

    if (protectedPlotIds.has(plotId) || assignment.status === "active") {
      operations.push({
        updateOne: {
          filter: { seasonDetail: seasonDoc._id, plot: plotId },
          update: { $set: { status: "inactive", updatedAt: new Date() } },
        },
      });
    }
  });

  if (operations.length > 0) {
    await SeasonPlotAssignment.bulkWrite(operations);
  }
};

const decorateSeasonDetail = async (seasonDoc, catalogMap) => {
  const season = seasonDoc.toObject ? seasonDoc.toObject() : { ...seasonDoc };
  const seasonRefId =
    season?.season && typeof season.season === "object" && season.season._id
      ? String(season.season._id)
      : season?.season
        ? String(season.season)
        : null;
  const seasonMeta = seasonRefId ? catalogMap.get(seasonRefId) || season.season || null : null;
  const seasonName = seasonMeta?.name || "Không xác định";

  await ensureSeasonAssignments(seasonDoc);
  const assignments = await getAssignmentsWithPlots(seasonDoc._id);
  const activeAssignments = assignments.filter((item) => item.status === "active");
  const loggableAssignments = activeAssignments.filter((item) => item.plot?.status === "active");

  return {
    ...season,
    seasonId: seasonRefId,
    season: seasonMeta,
    seasonName,
    name: `${seasonName} ${season.year}`,
    assignments,
    assignedPlotIds: activeAssignments.map((item) => String(item.plot?._id || item.plot)),
    assignedPlots: activeAssignments.map((item) => item.plot).filter(Boolean),
    loggablePlotIds: loggableAssignments.map((item) => String(item.plot?._id || item.plot)),
    loggablePlots: loggableAssignments.map((item) => item.plot).filter(Boolean),
    totalPlotCount: assignments.length,
    activePlotCount: activeAssignments.length,
    loggablePlotCount: loggableAssignments.length,
  };
};

const getSeasonDetailsByField = async (fieldId, userId) => {
  await ensureFieldExists(fieldId);

  const [seasonDocs, catalogMap] = await Promise.all([
    SeasonDetail.find(buildSeasonQuery(fieldId, userId))
      .populate("season", "name")
      .populate("field", "name address")
      .populate("user", "fullName email")
      .sort({ status: -1, createdAt: -1 }),
    getSeasonMap(),
  ]);

  return await Promise.all(seasonDocs.map((doc) => decorateSeasonDetail(doc, catalogMap)));
};

const getAllSeasonDetails = async () => {
  const [seasonDocs, catalogMap] = await Promise.all([
    SeasonDetail.find()
      .populate("season", "name")
      .populate("field", "name address")
      .populate("user", "fullName email")
      .sort({ createdAt: -1 }),
    getSeasonMap(),
  ]);

  return await Promise.all(seasonDocs.map((doc) => decorateSeasonDetail(doc, catalogMap)));
};

const createSeasonDetail = async (data, userId) => {
  const { year, fieldId, startDate, status = "active" } = data;

  await ensureFieldExists(fieldId);
  await ensureActiveSeasonAvailablePlots(fieldId, userId);

  const seasonId = await resolveSeasonId(data);
  const catalogMap = await getSeasonMap();
  const resolvedName = catalogMap.get(seasonId)?.name || "Không xác định";

  const hasActive = await hasActiveSeasonDetails(fieldId, userId);
  if (hasActive && status === "active") {
    throw new Error(
      "Cánh đồng này đang có vụ canh tác chưa kết thúc. Vui lòng kết thúc vụ hiện tại trước khi bắt đầu vụ mới."
    );
  }

  const exists = await seasonDetailExists(seasonId, year, fieldId, userId);
  if (exists) {
    throw new Error(`Vụ ${resolvedName} ${year} đã tồn tại cho cánh đồng này.`);
  }

  const season = await SeasonDetail.create({
    season: seasonId,
    year,
    field: fieldId,
    startDate: startDate || new Date(),
    user: userId,
    status,
  });

  await syncSeasonAssignments({
    seasonDoc: season,
    plotIds: data.plotIds,
    userId,
  });

  const seasonDoc = await SeasonDetail.findById(season._id)
    .populate("season", "name")
    .populate("field", "name address")
    .populate("user", "fullName email");

  return await decorateSeasonDetail(seasonDoc, catalogMap);
};

const finishSeasonDetail = async (id, userId) => {
  const [updatedDoc, catalogMap] = await Promise.all([
    SeasonDetail.findOneAndUpdate(
      { _id: id, user: userId },
      { status: "completed", endDate: new Date() },
      { new: true }
    )
      .populate("season", "name")
      .populate("field", "name address")
      .populate("user", "fullName email"),
    getSeasonMap(),
  ]);

  return updatedDoc ? await decorateSeasonDetail(updatedDoc, catalogMap) : null;
};

const updateSeasonDetail = async (id, data, userId) => {
  const season = await SeasonDetail.findOne({ _id: id, user: userId });
  if (!season) {
    throw new Error("Không tìm thấy mùa vụ");
  }

  if (season.status !== "active") {
    throw new Error("Chỉ có thể chỉnh sửa vụ đang active");
  }

  await ensureFieldExists(season.field);
  await ensureActiveSeasonAvailablePlots(season.field, userId);

  const updateData = { ...data };
  if (updateData.seasonName && !updateData.seasonId && !updateData.seasonCode) {
    updateData.seasonId = await resolveSeasonId({ seasonName: updateData.seasonName });
  }

  if (updateData.seasonId || updateData.seasonCode) {
    updateData.seasonId = await resolveSeasonId({
      seasonId: updateData.seasonId,
      seasonCode: updateData.seasonCode,
    });
  }

  if (
    (updateData.seasonId && String(updateData.seasonId) !== String(season.season)) ||
    (updateData.year && updateData.year !== season.year)
  ) {
    const newSeasonId = updateData.seasonId || season.season;
    const newYear = updateData.year || season.year;

    const exists = await SeasonDetail.findOne({
      season: newSeasonId,
      year: newYear,
      field: season.field,
      user: userId,
      _id: { $ne: id },
    });

    if (exists) {
      const resolvedName = await getSeasonNameById(newSeasonId);
      throw new Error(`Vụ ${resolvedName} ${newYear} đã tồn tại cho cánh đồng này.`);
    }
  }

  if (updateData.seasonId) {
    updateData.season = updateData.seasonId;
  }

  const plotIds = updateData.plotIds;
  delete updateData.plotIds;
  delete updateData.seasonCode;
  delete updateData.seasonId;
  delete updateData.seasonName;

  const updatedDoc = await SeasonDetail.findByIdAndUpdate(id, updateData, { new: true })
    .populate("season", "name")
    .populate("field", "name address")
    .populate("user", "fullName email");

  await syncSeasonAssignments({
    seasonDoc: updatedDoc,
    plotIds,
    userId,
  });

  const catalogMap = await getSeasonMap();
  return updatedDoc ? await decorateSeasonDetail(updatedDoc, catalogMap) : null;
};

const deleteSeasonDetail = async (id, userId) => {
  const season = await SeasonDetail.findOneAndDelete({ _id: id, user: userId });
  if (season) {
    await Promise.all([
      DiaryLog.deleteMany({ season: id }),
      DiseaseLog.deleteMany({ season: id }),
      SeasonPlotAssignment.deleteMany({ seasonDetail: id }),
    ]);
  }
  return season;
};

module.exports = {
  getAllSeasonDetails,
  getSeasonDetailsByField,
  createSeasonDetail,
  finishSeasonDetail,
  deleteSeasonDetail,
  hasActiveSeasonDetails,
  seasonDetailExists,
  updateSeasonDetail,
};
