const DiseaseLog = require("../models/diseaseLogModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");

const isAdminUser = (user) => (user?.role || "").toLowerCase() === "admin";

const normalizePlotIds = (plotIds = []) => {
  if (!Array.isArray(plotIds)) {
    return [];
  }

  return Array.from(new Set(plotIds.filter(Boolean).map((item) => String(item)))).sort();
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

const normalizeExistingPlotIds = (log = {}) =>
  normalizePlotIds(
    Array.isArray(log.plots)
      ? log.plots.map((plot) => (plot?._id ? String(plot._id) : String(plot)))
      : []
  );

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
  const currentSeasonId = String(existingLog.season || "");
  const nextSeasonId = String(data.seasonId || data.season || existingLog.season || "");
  if (nextSeasonId !== currentSeasonId) {
    return true;
  }

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

  const currentPlotIds =
    currentScope === "selected_plots" ? normalizeExistingPlotIds(existingLog) : [];
  const nextPlotIds =
    nextScope === "selected_plots"
      ? normalizePlotIds(data.plotIds !== undefined ? data.plotIds : currentPlotIds)
      : [];
  if (
    nextPlotIds.length !== currentPlotIds.length ||
    nextPlotIds.some((plotId, index) => plotId !== currentPlotIds[index])
  ) {
    return true;
  }

  const currentSource = normalizeSource(existingLog.source);
  const nextSource =
    data.source !== undefined ? normalizeSource(data.source, currentSource) : currentSource;
  if (nextSource !== currentSource) {
    return true;
  }

  const currentConfidence = normalizeConfidence(existingLog.confidence);
  const nextConfidence =
    data.confidence !== undefined
      ? normalizeConfidence(data.confidence)
      : currentConfidence;
  if ((nextConfidence ?? null) !== (currentConfidence ?? null)) {
    return true;
  }

  const currentImageName = (existingLog.imageName || "").trim();
  const nextImageName =
    data.imageName !== undefined ? (data.imageName || "").trim() : currentImageName;

  return nextImageName !== currentImageName;
};

const mapDiseaseLogOutput = (logDoc) => {
  const log = logDoc.toObject ? logDoc.toObject() : { ...logDoc };

  return {
    ...log,
    diseaseName: log.diseaseName || "Khong xac dinh",
    seasonLabel: log.season?.season?.name
      ? `${log.season.season.name} ${log.season.year}`
      : undefined,
    fieldName: log.field?.name || undefined,
    userName: log.user?.fullName || undefined,
    plotCount: Array.isArray(log.plots) ? log.plots.length : 0,
  };
};

const populateDiseaseLogQuery = (query) =>
  query
    .populate({
      path: "season",
      populate: [
        { path: "season", select: "name" },
        { path: "field", select: "name address" },
      ],
    })
    .populate("field", "name address")
    .populate("plots", "name area status")
    .populate("user", "fullName email")
    .populate("processedBy", "fullName email");

const getSeasonForUser = async (seasonId, userId) => {
  const season = await SeasonDetail.findOne({ _id: seasonId, user: userId })
    .populate("season", "name")
    .populate("field", "name address")
    .lean();

  if (!season) {
    throw new Error("Khong tim thay mua vu");
  }

  return season;
};

const ensureActiveSeasonForMutation = (season, action) => {
  if (season.status !== "active") {
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

  const plots = assignments.map((item) => item.plot).filter(Boolean);
  if (plots.length === 0) {
    throw new Error("Mua vu nay chua co thua nao tham gia");
  }

  return plots;
};

const resolveAffectedPlots = async ({ seasonId, userId, scope, plotIds }) => {
  const participantPlots = await getParticipantPlotsForSeason(seasonId, userId);
  const plotMap = new Map(participantPlots.map((plot) => [String(plot._id), plot]));

  if (scope === "selected_plots") {
    const selectedPlotIds = normalizePlotIds(plotIds);
    if (selectedPlotIds.length === 0) {
      throw new Error("Can chon it nhat 1 thua de luu nhat ky benh");
    }

    const invalidPlotId = selectedPlotIds.find((plotId) => !plotMap.has(plotId));
    if (invalidPlotId) {
      throw new Error("Co thua ruong khong hop le hoac khong thuoc mua vu dang chon");
    }

    return selectedPlotIds.map((plotId) => plotMap.get(plotId));
  }

  return participantPlots;
};

const buildDiseaseLogPayload = async (
  data,
  userId,
  existingLog = null,
  { requireActiveSeason = false } = {}
) => {
  const seasonId = data.seasonId || data.season || existingLog?.season;
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

  const scope = data.scope === "selected_plots" ? "selected_plots" : "all_plots";
  const affectedPlots = await resolveAffectedPlots({
    seasonId: season._id,
    userId,
    scope,
    plotIds: data.plotIds,
  });

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
    season: season._id,
    field: season.field?._id || season.field,
    plots: affectedPlots.map((plot) => plot._id),
    plotSnapshot: affectedPlots.map((plot) => ({
      plotId: plot._id,
      name: plot.name || "",
      area: Number(plot.area || 0),
      status: plot.status || "",
    })),
    user: userId,
  };

  if (status === "processed") {
    nextPayload.processedAt = data.processedAt || existingLog?.processedAt || new Date();
  } else {
    nextPayload.processedAt = null;
    nextPayload.processedBy = null;
  }

  return nextPayload;
};

const createDiseaseLog = async (data, userId) => {
  const payload = await buildDiseaseLogPayload(data, userId, null, {
    requireActiveSeason: true,
  });

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

  if (filters.seasonId) {
    query.season = filters.seasonId;
  }

  if (filters.fieldId) {
    query.field = filters.fieldId;
  }

  if (filters.status && ["unprocessed", "processed"].includes(filters.status)) {
    query.status = filters.status;
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

  const existing = await DiseaseLog.findOne(query).lean();
  if (!existing) {
    throw new Error("Khong tim thay nhat ky benh");
  }

  const ownerUserId = existing.user?.toString?.() || existing.user;
  const season = await getSeasonForUser(existing.season, ownerUserId);

  if (season.status !== "active") {
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

  const existing = await DiseaseLog.findOne(query).lean();
  if (!existing) {
    throw new Error("Khong tim thay nhat ky benh");
  }

  const ownerUserId = existing.user?.toString?.() || existing.user;
  const season = await getSeasonForUser(existing.season, ownerUserId);
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
