const DiseaseLog = require("../models/diseaseLogModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");

const isAdminUser = (user) => (user?.role || "").toLowerCase() === "admin";

const normalizePlotIds = (plotIds = []) => {
  const values = Array.isArray(plotIds)
    ? plotIds
    : plotIds === undefined || plotIds === null || plotIds === ""
      ? []
      : [plotIds];

  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && item._id) return String(item._id);
          return String(item);
        })
    )
  ).sort();
};

const normalizeConfidence = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStatus = (value, fallback = "unprocessed") =>
  ["unprocessed", "processed"].includes(value) ? value : fallback;

const normalizeSource = (value, fallback = "ai_scan") =>
  ["ai_scan", "manual"].includes(value) ? value : fallback;

const formatComparableDate = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

const normalizeExistingAssignments = (log = {}) =>
  (log.seasonPlotAssignments || []).map((a) => (a?._id ? String(a._id) : String(a)));

const applyProcessingFields = (target, data, actorId) => {
  const nextStatus = normalizeStatus(data.status, target.status || "unprocessed");

  target.status = nextStatus;
  target.processingNote =
    data.processingNote !== undefined
      ? (data.processingNote || "").trim()
      : (target.processingNote || "").trim();

  if (nextStatus === "processed") {
    target.processedAt = data.processedAt || target.processedAt || new Date();
    target.processedBy = actorId;
  } else {
    target.processedAt = null;
    target.processedBy = null;
  }
};

const hasHistoricalContentChanges = (data, existingLog) => {
  // Season change is trickier now because season is implied by assignments,
  // but let's assume season doesn't change implicitly without assignments changing.
  
  const nextDiseaseName = (
    data.diseaseName ||
    data.disease ||
    existingLog.diseaseName ||
    ""
  ).trim();
  if (nextDiseaseName !== (existingLog.diseaseName || "").trim()) {
    return true;
  }

  const nextDescription =
    data.description !== undefined
      ? (data.description || "").trim()
      : (existingLog.description || "").trim();
  if (nextDescription !== (existingLog.description || "").trim()) {
    return true;
  }

  const nextDetectedAt = formatComparableDate(
    data.detectedAt || data.date || existingLog.detectedAt
  );
  if (nextDetectedAt !== formatComparableDate(existingLog.detectedAt)) {
    return true;
  }

  const currentScope = existingLog.scope === "selected_plots" ? "selected_plots" : "all_plots";
  const nextScope =
    data.scope !== undefined
      ? data.scope === "selected_plots"
        ? "selected_plots"
        : "all_plots"
      : currentScope;
  if (nextScope !== currentScope) {
    return true;
  }

  // checking plot changes isn't perfect here but roughly:
  const currentImageName = (existingLog.imageName || "").trim();
  const nextImageName =
    data.imageName !== undefined ? (data.imageName || "").trim() : currentImageName;

  const currentImageUrl = (existingLog.imageUrl || "").trim();
  const nextImageUrl =
    data.imageUrl !== undefined ? (data.imageUrl || "").trim() : currentImageUrl;

  return nextImageName !== currentImageName || nextImageUrl !== currentImageUrl;
};

const mapDiseaseLogOutput = (logDoc) => {
  // Pass { virtuals: true } so Mongoose propagates it to all nested populated docs
  // (e.g. seasonDetail inside seasonPlotAssignments will include its 'status' virtual)
  const log = logDoc.toObject ? logDoc.toObject({ virtuals: true }) : { ...logDoc };

  const hasAssignments = Array.isArray(log.seasonPlotAssignments) && log.seasonPlotAssignments.length > 0;
  const resolvedPlots = hasAssignments 
    ? log.seasonPlotAssignments.map(a => a.plot).filter(Boolean)
    : log.plotSnapshot 
      ? log.plotSnapshot.map(s => ({ _id: s.plotId, name: s.name, area: s.area, status: s.status }))
      : [];

  // Extract field and season from the first valid assignment
  const firstAssignment = hasAssignments ? log.seasonPlotAssignments[0] : null;
  const seasonDetail = firstAssignment?.seasonDetail || null;
  const fieldObj = firstAssignment?.field || null;

  const fieldId = fieldObj?._id || null;
  const fieldName = fieldObj?.name || null;
  const seasonId = seasonDetail?._id || null;
  const seasonBaseName = seasonDetail?.season?.name || seasonDetail?.seasonName || null;
  const seasonYear = seasonDetail?.startDate ? new Date(seasonDetail.startDate).getFullYear() : null;
  const seasonLabel = seasonBaseName
    ? seasonYear ? `${seasonBaseName} ${seasonYear}` : seasonBaseName
    : null;

  // 'status' virtual is now included directly via toObject({ virtuals: true })
  // Fallback: compute from dates if virtual is still missing (shouldn't happen)
  const seasonStatus = seasonDetail?.status ?? (() => {
    if (!seasonDetail) return null;
    const now = new Date();
    const start = seasonDetail.startDate ? new Date(seasonDetail.startDate) : null;
    const end = seasonDetail.endDate ? new Date(seasonDetail.endDate) : null;
    if (end && end < now) return "completed";
    if (start && start <= now && (!end || end >= now)) return "active";
    return start ? "planned" : "active";
  })();

  return {
    ...log,
    diseaseName: log.diseaseName || "Khong xac dinh",
    seasonPlotAssignments: undefined,
    plots: resolvedPlots,
    plotCount: resolvedPlots.length,
    userName: log.user?.fullName || undefined,
    fieldId,
    fieldName,
    seasonId,
    seasonLabel,
    seasonStatus,
  };
};

const populateDiseaseLogQuery = (query) =>
  query
    .populate({
      path: "seasonPlotAssignments",
      populate: [
        { path: "plot", select: "name area status" },
        {
          path: "seasonDetail",
          select: "startDate endDate seasonName",
          populate: { path: "season", select: "name" },
        },
        { path: "field", select: "name" },
      ],
    })
    .populate("user", "fullName email")
    .populate("processedBy", "fullName email");

const getSeasonForUser = async (seasonId, _userId) => {
  // Use non-lean to preserve virtuals (e.g. status), then convert
  const seasonDoc = await SeasonDetail.findById(seasonId).populate("season", "name");

  if (!seasonDoc) {
    throw new Error("Khong tim thay mua vu");
  }

  // Convert to plain object but manually carry virtual status
  const season = seasonDoc.toObject({ virtuals: true });
  return season;
};

const ensureActiveSeasonForMutation = (season, action) => {
  // Use virtual status (already computed by toObject({virtuals:true})) or fall back to date check
  const statusFromVirtual = season.status;
  const isActive = statusFromVirtual
    ? statusFromVirtual === "active"
    : (() => {
        const now = new Date();
        return season.startDate
          ? new Date(season.startDate) <= now && (!season.endDate || new Date(season.endDate) >= now)
          : true; // no startDate → treat as always-active (admin-created without dates)
      })();

  if (!isActive) {
    throw new Error(`Chi co the ${action} nhat ky benh cho vu dang canh tac`);
  }
};

const getParticipantPlotsForSeason = async (seasonId, userId) => {
  const assignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonId,
    user: userId,
    status: "active",
  })
    .populate("plot", "name area status field user")
    .lean();

  const activeAssignments = assignments.filter((item) => item.plot && item.plot.status === "active");
  if (activeAssignments.length === 0) {
    throw new Error("Mua vu nay chua co thua nao tham gia hoac active");
  }

  return activeAssignments;
};

const resolveAffectedPlots = async ({ seasonId, userId, scope, plotIds }) => {
  const participantAssignments = await getParticipantPlotsForSeason(seasonId, userId);
  const assignmentByPlotId = new Map(participantAssignments.map((a) => [String(a.plot._id), a]));

  if (scope === "selected_plots") {
    const selectedPlotIds = normalizePlotIds(plotIds);
    if (selectedPlotIds.length === 0) {
      throw new Error("Can chon it nhat 1 thua de luu nhat ky benh");
    }

    const invalidPlotId = selectedPlotIds.find((plotId) => !assignmentByPlotId.has(plotId));
    if (invalidPlotId) {
      throw new Error("Co thua ruong khong hop le hoac khong thuoc mua vu dang chon");
    }

    return selectedPlotIds.map((plotId) => assignmentByPlotId.get(plotId));
  }

  return participantAssignments;
};

const buildDiseaseLogPayload = async (
  data,
  userId,
  existingLog = null,
  { requireActiveSeason = false } = {},
  imageUrl = ""
) => {
  // If editing an existing log, get its season from assignments
  let seasonId = data.seasonId || data.season;
  if (!seasonId && existingLog && existingLog.seasonPlotAssignments?.[0]?.seasonDetail) {
    seasonId = String(existingLog.seasonPlotAssignments[0].seasonDetail);
  }
  // Fallback to legacy season field if it somehow exists
  if (!seasonId && existingLog?.season) {
    seasonId = String(existingLog.season);
  }

  if (!seasonId) {
    throw new Error("Thieu seasonId");
  }

  const season = await getSeasonForUser(seasonId, userId);
  if (requireActiveSeason) {
    ensureActiveSeasonForMutation(season, "luu");
  }

  const diseaseName = (data.diseaseName || data.disease || existingLog?.diseaseName || "").trim();
  if (!diseaseName) {
    throw new Error("Ten benh la bat buoc");
  }

  const scope = ["selected_plots", "single_plot"].includes(data.scope) ? "selected_plots" : "all_plots";
  
  let affectedAssignments = [];
  if (data.plotIds || data.scope) {
    affectedAssignments = await resolveAffectedPlots({
      seasonId: season._id,
      userId,
      scope,
      plotIds: data.plotIds,
    });
  } else if (existingLog) {
    // keeping same plots if no plot data provided
    affectedAssignments = await SeasonPlotAssignment.find({ _id: { $in: existingLog.seasonPlotAssignments } }).populate("plot").lean();
  }

  const status = normalizeStatus(data.status, existingLog?.status || "unprocessed");
  const nextPayload = {
    diseaseName,
    confidence:
      data.confidence !== undefined
        ? normalizeConfidence(data.confidence)
        : normalizeConfidence(existingLog?.confidence),
    description: (data.description || existingLog?.description || "").trim(),
    source: normalizeSource(data.source, normalizeSource(existingLog?.source, "ai_scan")),
    imageName: (data.imageName || existingLog?.imageName || "").trim(),
    detectedAt: data.detectedAt || data.date || existingLog?.detectedAt || new Date(),
    status,
    processingNote: (data.processingNote || existingLog?.processingNote || "").trim(),
    scope,
    seasonPlotAssignments: affectedAssignments.map((a) => a._id),
    plotSnapshot: affectedAssignments.map((a) => ({
      plotId: a.plot._id,
      name: a.plot.name || "",
      area: Number(a.plot.area || 0),
      status: a.plot.status || "",
    })),
    user: userId,
    // Lưu imageUrl nếu có (từ Cloudinary), giữ nguyên nếu không upload mới
    imageUrl: imageUrl || existingLog?.imageUrl || "",
  };

  if (status === "processed") {
    nextPayload.processedAt = data.processedAt || existingLog?.processedAt || new Date();
  } else {
    nextPayload.processedAt = null;
    nextPayload.processedBy = null;
  }

  return nextPayload;
};

const createDiseaseLog = async (data, userId, imageUrl = "") => {
  const payload = await buildDiseaseLogPayload(data, userId, null, {
    requireActiveSeason: true,
  }, imageUrl);

  if (payload.status === "processed") {
    payload.processedBy = userId;
  }

  const created = await DiseaseLog.create(payload);
  const populated = await populateDiseaseLogQuery(DiseaseLog.findById(created._id)).lean();
  return mapDiseaseLogOutput(populated);
};

const getDiseaseLogs = async (filters, currentUser) => {
  const query = {};

  if (!isAdminUser(currentUser)) {
    query.user = currentUser.id;
  } else if (filters.userId) {
    query.user = filters.userId;
  }

  if (filters.status && ["unprocessed", "processed"].includes(filters.status)) {
    query.status = filters.status;
  }
  
  if (filters.seasonId) {
    // 1. Get assignments for season
    const assignments = await SeasonPlotAssignment.find({ seasonDetail: filters.seasonId }).lean();
    const assignmentIds = assignments.map(a => a._id);
    
    // 2. add to query using $or to support legacy logs too
    query.$or = [
      { seasonPlotAssignments: { $in: assignmentIds } },
      { season: filters.seasonId }
    ];
  }

  const logs = await populateDiseaseLogQuery(
    DiseaseLog.find(query).sort({ detectedAt: -1, createdAt: -1 })
  );

  return logs.map(mapDiseaseLogOutput);
};

const updateDiseaseLog = async (id, data, currentUser) => {
  const query = isAdminUser(currentUser)
    ? { _id: id }
    : { _id: id, user: currentUser.id };

  const existing = await DiseaseLog.findOne(query).populate("seasonPlotAssignments").lean();
  if (!existing) {
    throw new Error("Khong tim thay nhat ky benh");
  }

  const ownerUserId = existing.user?.toString?.() || existing.user;
  
  const seasonId = existing.seasonPlotAssignments?.[0]?.seasonDetail || existing.season;
  const season = await getSeasonForUser(seasonId, ownerUserId);

  // Use virtual status (populated via toObject({ virtuals: true }) in getSeasonForUser)
  const isActive = season.status
    ? season.status === "active"
    : (() => {
        const now = new Date();
        return season.startDate
          ? new Date(season.startDate) <= now && (!season.endDate || new Date(season.endDate) >= now)
          : true;
      })();

  if (!isActive) {
    if (hasHistoricalContentChanges(data, existing)) {
      throw new Error(
        "Vu mua da ket thuc. Ban chi co the cap nhat trang thai xu ly va ghi chu."
      );
    }

    const updatedHistoricalLog = await DiseaseLog.findOne(query);
    applyProcessingFields(updatedHistoricalLog, data, currentUser.id);
    await updatedHistoricalLog.save();

    const populatedHistoricalLog = await populateDiseaseLogQuery(
      DiseaseLog.findById(updatedHistoricalLog._id)
    ).lean();

    return mapDiseaseLogOutput(populatedHistoricalLog);
  }

  const payload = await buildDiseaseLogPayload(data, ownerUserId, existing, {
    requireActiveSeason: true,
  });

  if (payload.status === "processed") {
    payload.processedBy = currentUser.id;
  }
  
  // Clean up legacy fields
  payload.season = undefined;
  payload.field = undefined;
  payload.plots = undefined;

  const updated = await populateDiseaseLogQuery(
    DiseaseLog.findOneAndUpdate(query, payload, { new: true })
  ).lean();

  return mapDiseaseLogOutput(updated);
};

const updateDiseaseLogStatus = async (id, data, currentUser) => {
  const query = isAdminUser(currentUser)
    ? { _id: id }
    : { _id: id, user: currentUser.id };

  const existing = await DiseaseLog.findOne(query);
  if (!existing) {
    throw new Error("Khong tim thay nhat ky benh");
  }

  const nextStatus = normalizeStatus(data.status, null);
  if (!nextStatus) {
    throw new Error("Trang thai xu ly khong hop le");
  }

  applyProcessingFields(existing, data, currentUser.id);
  await existing.save();

  const updated = await populateDiseaseLogQuery(DiseaseLog.findById(existing._id)).lean();
  return mapDiseaseLogOutput(updated);
};

const deleteDiseaseLog = async (id, currentUser) => {
  const query = isAdminUser(currentUser)
    ? { _id: id }
    : { _id: id, user: currentUser.id };

  const existing = await DiseaseLog.findOne(query).populate("seasonPlotAssignments").lean();
  if (!existing) {
    throw new Error("Khong tim thay nhat ky benh");
  }

  const ownerUserId = existing.user?.toString?.() || existing.user;
  const seasonId = existing.seasonPlotAssignments?.[0]?.seasonDetail || existing.season;
  const season = await getSeasonForUser(seasonId, ownerUserId);
  ensureActiveSeasonForMutation(season, "xoa");

  return await DiseaseLog.findOneAndDelete(query);
};

module.exports = {
  createDiseaseLog,
  getDiseaseLogs,
  updateDiseaseLog,
  updateDiseaseLogStatus,
  deleteDiseaseLog,
};
