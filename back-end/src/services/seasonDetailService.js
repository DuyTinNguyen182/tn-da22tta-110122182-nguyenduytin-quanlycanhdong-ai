const SeasonDetail = require("../models/seasonDetailModel");
const DiaryLog = require("../models/diaryLogModel");
const DiseaseLog = require("../models/diseaseLogModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const {
  getSeasonMap,
  resolveSeasonId,
  getSeasonNameById,
} = require("./seasonService");

/**
 * Decorate a season detail document with the season catalog name.
 */
const decorateSeasonDetail = (seasonDoc, catalogMap) => {
  const detail = seasonDoc.toObject ? seasonDoc.toObject() : { ...seasonDoc };
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

  return {
    ...detail,
    seasonId: seasonRefId,
    season: seasonMeta,
    seasonName,
    name: seasonName,
  };
};

/**
 * Get all season details (admin view).
 */
const getAllSeasonDetails = async () => {
  const [seasonDocs, catalogMap] = await Promise.all([
    SeasonDetail.find()
      .populate("season", "name")
      .sort({ startDate: -1, createdAt: -1 }),
    getSeasonMap(),
  ]);

  return seasonDocs.map((doc) => decorateSeasonDetail(doc, catalogMap));
};

/**
 * Get a single season detail by id.
 */
const getSeasonDetailById = async (id) => {
  const seasonDoc = await SeasonDetail.findById(id).populate("season", "name");
  if (!seasonDoc) {
    throw new Error("Không tìm thấy chi tiết mùa vụ");
  }

  const catalogMap = await getSeasonMap();
  return decorateSeasonDetail(seasonDoc, catalogMap);
};

/**
 * Get the currently active season detail (for farmer usage later).
 * Returns null if no active season detail exists.
 */
const getActiveSeasonDetail = async () => {
  const now = new Date();
  const seasonDoc = await SeasonDetail.findOne({
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }]
  }).populate("season", "name");

  if (!seasonDoc) {
    return null;
  }

  const catalogMap = await getSeasonMap();
  return decorateSeasonDetail(seasonDoc, catalogMap);
};

/**
 * Create a new season detail (admin only).
 */
const createSeasonDetail = async (data) => {
  const { startDate, endDate } = data;

  const seasonId = await resolveSeasonId(data);
  const catalogMap = await getSeasonMap();
  const resolvedName = catalogMap.get(seasonId)?.name || "Không xác định";

  const now = new Date();
  const isActive = startDate && new Date(startDate) <= now && (!endDate || new Date(endDate) >= now);

  if (isActive) {
    const existingActive = await SeasonDetail.findOne({
      startDate: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $gte: now } }]
    });
    if (existingActive) {
      throw new Error(
        "Đang có một mùa vụ đang hoạt động. Vui lòng kết thúc mùa vụ hiện tại trước khi bắt đầu mùa vụ mới."
      );
    }
  }

  // Check duplicate: same season + same startDate
  if (startDate) {
    const exists = await SeasonDetail.findOne({
      season: seasonId,
      startDate: new Date(startDate),
    });
    if (exists) {
      throw new Error(
        `Mùa vụ "${resolvedName}" với ngày bắt đầu này đã tồn tại.`
      );
    }
  }

  const seasonDetail = await SeasonDetail.create({
    season: seasonId,
    startDate: startDate || null,
    endDate: endDate || null,
  });

  const seasonDoc = await SeasonDetail.findById(seasonDetail._id).populate(
    "season",
    "name"
  );

  return decorateSeasonDetail(seasonDoc, catalogMap);
};

/**
 * Update season detail (admin only).
 */
const updateSeasonDetail = async (id, data) => {
  const existing = await SeasonDetail.findById(id);
  if (!existing) {
    throw new Error("Không tìm thấy chi tiết mùa vụ");
  }

  const updateData = {};

  // Resolve season id if provided
  if (data.seasonName || data.seasonId || data.seasonCode) {
    const newSeasonId = await resolveSeasonId({
      seasonId: data.seasonId,
      seasonCode: data.seasonCode,
      seasonName: data.seasonName,
    });
    updateData.season = newSeasonId;
  }

  if (data.startDate !== undefined) {
    updateData.startDate = data.startDate;
  }

  if (data.endDate !== undefined) {
    updateData.endDate = data.endDate;
  }

  const now = new Date();
  const finalStartDate = updateData.startDate !== undefined ? updateData.startDate : existing.startDate;
  const finalEndDate = updateData.endDate !== undefined ? updateData.endDate : existing.endDate;
  const isActive = finalStartDate && new Date(finalStartDate) <= now && (!finalEndDate || new Date(finalEndDate) >= now);

  if (isActive) {
    const existingActive = await SeasonDetail.findOne({
      startDate: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
      _id: { $ne: id },
    });
    if (existingActive) {
      throw new Error(
        "Đang có một mùa vụ đang hoạt động. Bạn không thể cập nhật lịch trình đè lên mùa vụ này."
      );
    }
  }

  // Check duplicate if season or startDate changed
  const newSeasonId = updateData.season || existing.season;
  const newStartDate = updateData.startDate !== undefined
    ? updateData.startDate
    : existing.startDate;

  if (newStartDate) {
    const duplicate = await SeasonDetail.findOne({
      season: newSeasonId,
      startDate: new Date(newStartDate),
      _id: { $ne: id },
    });

    if (duplicate) {
      const resolvedName = await getSeasonNameById(newSeasonId);
      throw new Error(
        `Mùa vụ "${resolvedName}" với ngày bắt đầu này đã tồn tại.`
      );
    }
  }

  const updatedDoc = await SeasonDetail.findByIdAndUpdate(id, updateData, {
    new: true,
  }).populate("season", "name");

  const catalogMap = await getSeasonMap();
  return updatedDoc ? decorateSeasonDetail(updatedDoc, catalogMap) : null;
};

/**
 * Finish (complete) a season detail (admin only).
 */
const finishSeasonDetail = async (id) => {
  const existing = await SeasonDetail.findById(id);
  if (!existing) {
    throw new Error("Không tìm thấy chi tiết mùa vụ");
  }

  // Check if it's already completed by endDate logic
  const now = new Date();
  if (existing.endDate && existing.endDate < now) {
    throw new Error("Mùa vụ này đã được kết thúc trước đó");
  }

  const updatedDoc = await SeasonDetail.findByIdAndUpdate(
    id,
    { endDate: now },
    { new: true }
  ).populate("season", "name");

  const catalogMap = await getSeasonMap();
  return updatedDoc ? decorateSeasonDetail(updatedDoc, catalogMap) : null;
};

/**
 * Delete a season detail and cascade delete related records (admin only).
 */
const deleteSeasonDetail = async (id) => {
  const season = await SeasonDetail.findById(id);
  if (!season) {
    throw new Error("Không tìm thấy chi tiết mùa vụ");
  }

  await Promise.all([
    DiaryLog.deleteMany({ season: id }),
    DiseaseLog.deleteMany({ season: id }),
    SeasonPlotAssignment.deleteMany({ seasonDetail: id }),
  ]);

  await SeasonDetail.deleteOne({ _id: id });
  return season;
};

const Plot = require("../models/plotModel");

/**
 * Get season details for a specific farmer.
 * Auto-assigns active plots to the currently active global season.
 */
const getFarmerSeasonDetails = async (userId, fieldId) => {
  if (!fieldId) throw new Error("Yêu cầu chọn cánh đồng");

  // Get all global season details
  const seasonDocs = await SeasonDetail.find()
    .populate("season", "name")
    .sort({ startDate: -1, createdAt: -1 });

  const catalogMap = await getSeasonMap();
  const plots = await Plot.find({ user: userId, field: fieldId }).lean();

  const results = [];

  for (const doc of seasonDocs) {
    const seasonDecorated = decorateSeasonDetail(doc, catalogMap);
    
    // Status is provided by the virtual of seasonDetailModel (if toObject uses virtuals) 
    // Wait, let's calculate status explicitly to be safe:
    const now = new Date();
    let seasonStatus = "planned";
    if (doc.endDate && doc.endDate < now) seasonStatus = "completed";
    else if (doc.startDate && doc.startDate <= now && (!doc.endDate || doc.endDate >= now)) seasonStatus = "active";
    
    seasonDecorated.status = seasonStatus;

    let assignments = await SeasonPlotAssignment.find({
      seasonDetail: doc._id,
      user: userId,
      field: fieldId,
    }).populate("plot", "name area status addressDetail").lean();

    // Lazy creation of assignments for active season
    if (assignments.length === 0 && seasonStatus === "active") {
      const activePlots = plots.filter((p) => p.status === "active");
      if (activePlots.length > 0) {
        const payload = activePlots.map((p) => ({
          seasonDetail: doc._id,
          field: fieldId,
          plot: p._id,
          user: userId,
          status: "active",
        }));
        await SeasonPlotAssignment.insertMany(payload);

        assignments = await SeasonPlotAssignment.find({
          seasonDetail: doc._id,
          user: userId,
          field: fieldId,
        }).populate("plot", "name area status addressDetail").lean();
      }
    }

    // Skip historical/planned seasons if the farmer isn't participating at all
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
