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

const getSeasonYear = (seasonDetail) => {
  if (typeof seasonDetail?.year === "number") {
    return seasonDetail.year;
  }

  const sourceDate =
    seasonDetail?.startDate || seasonDetail?.endDate || seasonDetail?.createdAt || null;

  return sourceDate ? new Date(sourceDate).getFullYear() : null;
};

const normalizeExistingAssignments = (log = {}) =>
  (log.seasonPlotAssignments || []).map((item) => (item?._id ? String(item._id) : String(item)));

const normalizeExistingPlots = (log = {}) =>
  (log.seasonPlotAssignments || [])
    .map((item) => item?.plot?._id || item?.plot)
    .filter(Boolean)
    .map((item) => String(item))
    .sort();

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
  const nextDiseaseName = (data.diseaseName || data.disease || existingLog.diseaseName || "").trim();
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
      ? data.scope === "selected_plots" || data.scope === "single_plot"
        ? "selected_plots"
        : "all_plots"
      : currentScope;
  if (nextScope !== currentScope) {
    return true;
  }

  const currentFieldId =
    existingLog.seasonPlotAssignments?.[0]?.field?._id || existingLog.seasonPlotAssignments?.[0]?.field || null;
  const nextFieldId = data.fieldId || data.field || currentFieldId || null;
  if (String(nextFieldId || "") !== String(currentFieldId || "")) {
    return true;
  }

  if (data.plotIds !== undefined) {
    const currentPlotIds = normalizeExistingPlots(existingLog);
    const nextPlotIds = normalizePlotIds(data.plotIds);
    if (currentPlotIds.join(",") !== nextPlotIds.join(",")) {
      return true;
    }
  }

  const currentImageName = (existingLog.imageName || "").trim();
  const nextImageName =
    data.imageName !== undefined ? (data.imageName || "").trim() : currentImageName;

  const currentImageUrl = (existingLog.imageUrl || "").trim();
  const nextImageUrl =
    data.imageUrl !== undefined ? (data.imageUrl || "").trim() : currentImageUrl;

  return nextImageName !== currentImageName || nextImageUrl !== currentImageUrl;
};

const mapDiseaseLogOutput = (logDoc) => {
  const log = logDoc.toObject ? logDoc.toObject({ virtuals: true }) : { ...logDoc };
  const assignmentIds = (log.seasonPlotAssignments || [])
    .map((assignment) => assignment?._id || assignment)
    .filter(Boolean)
    .map((id) => String(id));
  const resolvedPlots = (log.seasonPlotAssignments || []).map((item) => item.plot).filter(Boolean);
  const plotIds = resolvedPlots
    .map((plot) => plot?._id || plot)
    .filter(Boolean)
    .map((id) => String(id));
  const firstAssignment = log.seasonPlotAssignments?.[0] || null;
  const seasonDetail = firstAssignment?.seasonDetail || null;
  const fieldObj = firstAssignment?.field || null;

  const fieldId = fieldObj?._id || null;
  const fieldName = fieldObj?.name || null;
  const seasonId = seasonDetail?._id || null;
  const seasonBaseName = seasonDetail?.season?.name || seasonDetail?.seasonName || null;
  const seasonYear = getSeasonYear(seasonDetail);
  const seasonLabel = seasonBaseName
    ? seasonYear
      ? `${seasonBaseName} ${seasonYear}`
      : seasonBaseName
    : null;

  const seasonStatus =
    seasonDetail?.status ??
    (() => {
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
    diseaseName: log.diseaseName || "Không xác định",
    seasonPlotAssignments: undefined,
    plots: resolvedPlots,
    plotIds,
    seasonPlotAssignmentIds: assignmentIds,
    plotCount: resolvedPlots.length,
    appliesToAllPlots: log.scope === "all_plots",
    plotLabel:
      log.scope === "all_plots"
        ? "Tat ca thua tham gia vu"
        : resolvedPlots.length === 1
          ? resolvedPlots[0]?.name || "1 thua"
          : `${resolvedPlots.length} thua duoc chon`,
    userName: log.user?.fullName || undefined,
    fieldId,
    fieldName,
    seasonId,
    year: seasonYear,
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
          select: "year startDate endDate seasonName createdAt",
          populate: { path: "season", select: "name" },
        },
        { path: "field", select: "name" },
      ],
    })
    .populate("user", "fullName email")
    .populate("processedBy", "fullName email");

const getSeasonForUser = async (seasonId) => {
  const seasonDoc = await SeasonDetail.findById(seasonId).populate("season", "name");

  if (!seasonDoc) {
    throw new Error("Không tìm thấy mùa vụ");
  }

  return seasonDoc.toObject({ virtuals: true });
};

const ensureActiveSeasonForMutation = (season, action) => {
  const statusFromVirtual = season.status;
  const isActive = statusFromVirtual
    ? statusFromVirtual === "active"
    : (() => {
        const now = new Date();
        return season.startDate
          ? new Date(season.startDate) <= now && (!season.endDate || new Date(season.endDate) >= now)
          : true;
      })();

  if (!isActive) {
    throw new Error(`Chỉ có thể ${action} nhật ký bệnh cho vụ đang canh tác`);
  }
};

const getParticipantPlotsForSeason = async (seasonId, userId, fieldId = null) => {
  const assignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonId,
    user: userId,
    status: "active",
    ...(fieldId ? { field: fieldId } : {}),
  })
    .populate("plot", "name area status field user")
    .lean();

  const activeAssignments = assignments.filter((item) => item.plot && item.plot.status === "active");
  if (activeAssignments.length === 0) {
    throw new Error("Mùa vụ này chưa có thửa nào tham gia hoặc active");
  }

  return activeAssignments;
};

const resolveAffectedPlots = async ({ seasonId, userId, fieldId, scope, plotIds }) => {
  const participantAssignments = await getParticipantPlotsForSeason(seasonId, userId, fieldId);
  const assignmentByPlotId = new Map(participantAssignments.map((item) => [String(item.plot._id), item]));

  if (scope === "selected_plots") {
    const selectedPlotIds = normalizePlotIds(plotIds);
    if (selectedPlotIds.length === 0) {
      throw new Error("Cần chọn ít nhất 1 thửa để lưu nhật ký bệnh");
    }

    const invalidPlotId = selectedPlotIds.find((plotId) => !assignmentByPlotId.has(plotId));
    if (invalidPlotId) {
      throw new Error("Có thửa ruộng không hợp lệ hoặc không thuộc mùa vụ đang chọn");
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
  let seasonId = data.seasonId || data.season;
  let fieldId = data.fieldId || data.field || null;

  if (!seasonId && existingLog?.seasonPlotAssignments?.[0]?.seasonDetail) {
    seasonId = String(existingLog.seasonPlotAssignments[0].seasonDetail);
  }
  if (!fieldId && existingLog?.seasonPlotAssignments?.[0]?.field) {
    fieldId = String(existingLog.seasonPlotAssignments[0].field);
  }

  if (!seasonId) {
    throw new Error("Thieu seasonId");
  }
  if (!fieldId) {
    throw new Error("Thieu fieldId");
  }

  const season = await getSeasonForUser(seasonId);
  if (requireActiveSeason) {
    ensureActiveSeasonForMutation(season, "luu");
  }

  const diseaseName = (data.diseaseName || data.disease || existingLog?.diseaseName || "").trim();
  if (!diseaseName) {
    throw new Error("Ten benh la bat buoc");
  }

  const scope =
    data.scope === "selected_plots" || data.scope === "single_plot" ? "selected_plots" : "all_plots";

  let affectedAssignments = [];
  if (data.plotIds !== undefined || data.scope !== undefined || data.fieldId !== undefined || data.field !== undefined) {
    affectedAssignments = await resolveAffectedPlots({
      seasonId: season._id,
      userId,
      fieldId,
      scope,
      plotIds: data.plotIds,
    });
  } else if (existingLog) {
    affectedAssignments = await SeasonPlotAssignment.find({
      _id: { $in: normalizeExistingAssignments(existingLog) },
    })
      .populate("plot")
      .lean();
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
    seasonPlotAssignments: affectedAssignments.map((item) => item._id),
    user: userId,
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
  const payload = await buildDiseaseLogPayload(
    data,
    userId,
    null,
    {
      requireActiveSeason: true,
    },
    imageUrl
  );

  if (payload.status === "processed") {
    payload.processedBy = userId;
  }

  const created = await DiseaseLog.create(payload);
  const populated = await populateDiseaseLogQuery(DiseaseLog.findById(created._id)).lean();
  return mapDiseaseLogOutput(populated);
};

const getDiseaseLogs = async (filters, currentUser) => {
  const query = {};
  const assignmentFilters = {};

  if (!isAdminUser(currentUser)) {
    query.user = currentUser.id;
    assignmentFilters.user = currentUser.id;
  } else if (filters.userId) {
    query.user = filters.userId;
    assignmentFilters.user = filters.userId;
  }

  if (filters.status && ["unprocessed", "processed"].includes(filters.status)) {
    query.status = filters.status;
  }

  if (filters.fieldId) {
    assignmentFilters.field = filters.fieldId;
  }

  if (filters.seasonId) {
    assignmentFilters.seasonDetail = filters.seasonId;
  }

  if (filters.seasonId || filters.fieldId) {
    const assignments = await SeasonPlotAssignment.find(assignmentFilters).lean();
    const assignmentIds = assignments.map((item) => item._id);
    if (!assignmentIds.length) {
      return [];
    }

    query.seasonPlotAssignments = { $in: assignmentIds };
  }

  const logs = await populateDiseaseLogQuery(
    DiseaseLog.find(query).sort({ detectedAt: -1, createdAt: -1 })
  );

  return logs.map(mapDiseaseLogOutput);
};

const updateDiseaseLog = async (id, data, currentUser) => {
  const query = isAdminUser(currentUser) ? { _id: id } : { _id: id, user: currentUser.id };

  const existing = await DiseaseLog.findOne(query).populate("seasonPlotAssignments").lean();
  if (!existing) {
    throw new Error("Không tìm thấy nhật ký bệnh");
  }

  const ownerUserId = existing.user?.toString?.() || existing.user;
  const seasonId = existing.seasonPlotAssignments?.[0]?.seasonDetail || null;
  if (!seasonId) {
    throw new Error("Nhật ký bệnh không còn liên kết vụ mùa hợp lệ");
  }

  const season = await getSeasonForUser(seasonId);
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
      throw new Error("Vu mua da ket thuc. Ban chi co the cap nhat trang thai xu ly va ghi chu.");
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
  const query = isAdminUser(currentUser) ? { _id: id } : { _id: id, user: currentUser.id };

  const existing = await DiseaseLog.findOne(query);
  if (!existing) {
    throw new Error("Không tìm thấy nhật ký bệnh");
  }

  const nextStatus = normalizeStatus(data.status, null);
  if (!nextStatus) {
    throw new Error("Trạng thái xử lý không hợp lệ");
  }

  applyProcessingFields(existing, data, currentUser.id);
  await existing.save();

  const updated = await populateDiseaseLogQuery(DiseaseLog.findById(existing._id)).lean();
  return mapDiseaseLogOutput(updated);
};

const deleteDiseaseLog = async (id, currentUser) => {
  const query = isAdminUser(currentUser) ? { _id: id } : { _id: id, user: currentUser.id };

  const existing = await DiseaseLog.findOne(query).populate("seasonPlotAssignments").lean();
  if (!existing) {
    throw new Error("Không tìm thấy nhật ký bệnh");
  }

  const ownerUserId = existing.user?.toString?.() || existing.user;
  const seasonId = existing.seasonPlotAssignments?.[0]?.seasonDetail || null;
  if (!seasonId) {
    throw new Error("Nhật ký bệnh không còn liên kết vụ mùa hợp lệ");
  }

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
