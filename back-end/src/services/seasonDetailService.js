const SeasonDetail = require("../models/seasonDetailModel");
const DiaryLog = require("../models/diaryLogModel");
const DiseaseLog = require("../models/diseaseLogModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const Plot = require("../models/plotModel");
const { getSeasonMap, resolveSeasonId, getSeasonNameById } = require("./seasonService");

const decorateSeasonDetail = (seasonDoc, catalogMap) => {
  const detail = seasonDoc.toObject ? seasonDoc.toObject({ virtuals: true }) : { ...seasonDoc };
  const seasonRefId =
    detail.season && typeof detail.season === "object" && detail.season._id
      ? String(detail.season._id)
      : detail.season
        ? String(detail.season)
        : null;

  const seasonMeta = seasonRefId ? catalogMap.get(seasonRefId) || detail.season || null : null;
  const seasonName = seasonMeta?.name || "Khong xac dinh";

  return {
    ...detail,
    seasonId: seasonRefId,
    season: seasonMeta,
    seasonName,
    name: seasonName,
  };
};

const getAllSeasonDetails = async () => {
  const [seasonDocs, catalogMap] = await Promise.all([
    SeasonDetail.find().populate("season", "name").sort({ startDate: -1, createdAt: -1 }),
    getSeasonMap(),
  ]);

  return seasonDocs.map((doc) => decorateSeasonDetail(doc, catalogMap));
};

const getSeasonDetailById = async (id) => {
  const seasonDoc = await SeasonDetail.findById(id).populate("season", "name");
  if (!seasonDoc) {
    throw new Error("Khong tim thay chi tiet mua vu");
  }

  const catalogMap = await getSeasonMap();
  return decorateSeasonDetail(seasonDoc, catalogMap);
};

const getActiveSeasonDetail = async () => {
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
    throw new Error("Dang co mot mua vu dang hoat dong. Hay ket thuc mua vu hien tai truoc.");
  }
};

const createSeasonDetail = async (data) => {
  const { startDate, endDate } = data;
  const seasonId = await resolveSeasonId(data);
  const catalogMap = await getSeasonMap();
  const resolvedName = catalogMap.get(seasonId)?.name || "Khong xac dinh";

  const now = new Date();
  const isActive = startDate && new Date(startDate) <= now && (!endDate || new Date(endDate) >= now);
  if (isActive) {
    await ensureNoOverlappingActiveSeason();
  }

  if (startDate) {
    const exists = await SeasonDetail.findOne({
      season: seasonId,
      startDate: new Date(startDate),
    });
    if (exists) {
      throw new Error(`Mua vu "${resolvedName}" voi ngay bat dau nay da ton tai.`);
    }
  }

  const seasonDetail = await SeasonDetail.create({
    season: seasonId,
    startDate: startDate || null,
    endDate: endDate || null,
  });

  const seasonDoc = await SeasonDetail.findById(seasonDetail._id).populate("season", "name");
  return decorateSeasonDetail(seasonDoc, catalogMap);
};

const updateSeasonDetail = async (id, data) => {
  const existing = await SeasonDetail.findById(id);
  if (!existing) {
    throw new Error("Khong tim thay chi tiet mua vu");
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

  const now = new Date();
  const finalStartDate =
    updateData.startDate !== undefined ? updateData.startDate : existing.startDate;
  const finalEndDate = updateData.endDate !== undefined ? updateData.endDate : existing.endDate;
  const isActive =
    finalStartDate &&
    new Date(finalStartDate) <= now &&
    (!finalEndDate || new Date(finalEndDate) >= now);

  if (isActive) {
    await ensureNoOverlappingActiveSeason(id);
  }

  const newSeasonId = updateData.season || existing.season;
  const newStartDate =
    updateData.startDate !== undefined ? updateData.startDate : existing.startDate;

  if (newStartDate) {
    const duplicate = await SeasonDetail.findOne({
      season: newSeasonId,
      startDate: new Date(newStartDate),
      _id: { $ne: id },
    });

    if (duplicate) {
      const resolvedName = await getSeasonNameById(newSeasonId);
      throw new Error(`Mua vu "${resolvedName}" voi ngay bat dau nay da ton tai.`);
    }
  }

  const updatedDoc = await SeasonDetail.findByIdAndUpdate(id, updateData, {
    new: true,
  }).populate("season", "name");

  const catalogMap = await getSeasonMap();
  return updatedDoc ? decorateSeasonDetail(updatedDoc, catalogMap) : null;
};

const finishSeasonDetail = async (id) => {
  const existing = await SeasonDetail.findById(id);
  if (!existing) {
    throw new Error("Khong tim thay chi tiet mua vu");
  }

  const now = new Date();
  if (existing.endDate && existing.endDate < now) {
    throw new Error("Mua vu nay da duoc ket thuc truoc do");
  }

  const updatedDoc = await SeasonDetail.findByIdAndUpdate(
    id,
    { endDate: now },
    { new: true }
  ).populate("season", "name");

  const catalogMap = await getSeasonMap();
  return updatedDoc ? decorateSeasonDetail(updatedDoc, catalogMap) : null;
};

const deleteSeasonDetail = async (id) => {
  const season = await SeasonDetail.findById(id);
  if (!season) {
    throw new Error("Khong tim thay chi tiet mua vu");
  }

  const assignments = await SeasonPlotAssignment.find({ seasonDetail: id }).select("_id").lean();
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
  if (!fieldId) {
    throw new Error("Yeu cau chon canh dong");
  }

  const seasonDocs = await SeasonDetail.find()
    .populate("season", "name")
    .sort({ startDate: -1, createdAt: -1 });

  const catalogMap = await getSeasonMap();
  const plots = await Plot.find({ user: userId, field: fieldId }).lean();
  const results = [];

  for (const doc of seasonDocs) {
    const seasonDecorated = decorateSeasonDetail(doc, catalogMap);
    const now = new Date();
    let seasonStatus = "planned";
    if (doc.endDate && doc.endDate < now) {
      seasonStatus = "completed";
    } else if (doc.startDate && doc.startDate <= now && (!doc.endDate || doc.endDate >= now)) {
      seasonStatus = "active";
    }

    seasonDecorated.status = seasonStatus;

    let assignments = await SeasonPlotAssignment.find({
      seasonDetail: doc._id,
      user: userId,
      field: fieldId,
    })
      .populate("plot", "name area status")
      .lean();

    if (assignments.length === 0 && seasonStatus === "active") {
      const activePlots = plots.filter((plot) => plot.status === "active");
      if (activePlots.length > 0) {
        const payload = activePlots.map((plot) => ({
          seasonDetail: doc._id,
          field: fieldId,
          plot: plot._id,
          user: userId,
          status: "active",
        }));

        await SeasonPlotAssignment.insertMany(payload);
        assignments = await SeasonPlotAssignment.find({
          seasonDetail: doc._id,
          user: userId,
          field: fieldId,
        })
          .populate("plot", "name area status")
          .lean();
      }
    }

    if (assignments.length === 0 && seasonStatus !== "active") {
      continue;
    }

    const activeAssignments = assignments.filter((item) => item.status === "active");
    const loggableAssignments = activeAssignments.filter((item) => item.plot?.status === "active");

    Object.assign(seasonDecorated, {
      assignments,
      assignedPlotIds: activeAssignments.map((item) => String(item.plot?._id || item.plot)),
      assignedPlots: activeAssignments.map((item) => item.plot).filter(Boolean),
      loggablePlotIds: loggableAssignments.map((item) => String(item.plot?._id || item.plot)),
      loggablePlots: loggableAssignments.map((item) => item.plot).filter(Boolean),
      totalPlotCount: assignments.length,
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
