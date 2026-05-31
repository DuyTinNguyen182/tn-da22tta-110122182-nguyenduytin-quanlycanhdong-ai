const DiseaseLog = require("../models/diseaseLogModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const announcementService = require("./announcementService");
const { sendMail } = require("./mailService");
const {
  buildDiseaseWarningEmailTemplate,
} = require("../templates/diseaseWarningEmailTemplate");

const isAdminUser = (user) => (user?.role || "").toLowerCase() === "admin";

const normalizePlotIds = (plotIds = []) => {
  const values = Array.isArray(plotIds)
    ? plotIds
    : plotIds === undefined || plotIds === null || plotIds === ""
      ? []
      : [plotIds];

  return Array.from(
    new Set(
      values.filter(Boolean).map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && item._id)
          return String(item._id);
        return String(item);
      }),
    ),
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

const normalizeWarningSource = (value, fallback = "plot-disease-warning") =>
  ["plot-disease-warning", "plot-task-warning"].includes(value)
    ? value
    : fallback;

const ensureAdminUser = (currentUser, action) => {
  if (!isAdminUser(currentUser)) {
    throw new Error(`Chỉ admin mới được ${action}`);
  }
};

const stripVietnamese = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const formatComparableDate = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

const isSeasonActive = (season) => {
  if (season?.status) {
    return season.status === "active";
  }

  const now = new Date();
  const start = season?.startDate ? new Date(season.startDate) : null;
  const end = season?.endDate ? new Date(season.endDate) : null;

  if (!start) {
    return true;
  }

  return start <= now && (!end || end >= now);
};

const getSeasonYear = (seasonDetail) => {
  if (typeof seasonDetail?.year === "number") {
    return seasonDetail.year;
  }

  const sourceDate =
    seasonDetail?.startDate ||
    seasonDetail?.endDate ||
    seasonDetail?.createdAt ||
    null;

  return sourceDate ? new Date(sourceDate).getFullYear() : null;
};

const normalizeExistingAssignments = (log = {}) =>
  (log.seasonPlotAssignments || []).map((item) =>
    item?._id ? String(item._id) : String(item),
  );

const normalizeExistingPlots = (log = {}) =>
  (log.seasonPlotAssignments || [])
    .map((item) => item?.plot?._id || item?.plot)
    .filter(Boolean)
    .map((item) => String(item))
    .sort();

const applyProcessingFields = (target, data, actorId) => {
  const nextStatus = normalizeStatus(
    data.status,
    target.status || "unprocessed",
  );

  target.status = nextStatus;
  target.processingNote =
    data.processingNote !== undefined
      ? String(data.processingNote || "").trim()
      : String(target.processingNote || "").trim();

  if (nextStatus === "processed") {
    target.processedAt = data.processedAt || target.processedAt || new Date();
    target.processedBy = actorId;
    return;
  }

  target.processedAt = null;
  target.processedBy = null;
};

const hasHistoricalContentChanges = (data, existingLog) => {
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
      ? String(data.description || "").trim()
      : String(existingLog.description || "").trim();
  if (nextDescription !== (existingLog.description || "").trim()) {
    return true;
  }

  const nextDetectedAt = formatComparableDate(
    data.detectedAt || data.date || existingLog.detectedAt,
  );
  if (nextDetectedAt !== formatComparableDate(existingLog.detectedAt)) {
    return true;
  }

  const currentScope =
    existingLog.scope === "selected_plots" ? "selected_plots" : "all_plots";
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
    existingLog.seasonPlotAssignments?.[0]?.field?._id ||
    existingLog.seasonPlotAssignments?.[0]?.field ||
    null;
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

  const currentImageName = String(existingLog.imageName || "").trim();
  const nextImageName =
    data.imageName !== undefined
      ? String(data.imageName || "").trim()
      : currentImageName;

  const currentImageUrl = String(existingLog.imageUrl || "").trim();
  const nextImageUrl =
    data.imageUrl !== undefined
      ? String(data.imageUrl || "").trim()
      : currentImageUrl;

  return nextImageName !== currentImageName || nextImageUrl !== currentImageUrl;
};

const summarizePlotNames = (plots = [], maxItems = 5) => {
  const names = Array.from(
    new Set(
      (plots || [])
        .map((plot) => plot?.name || plot)
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

  if (names.length === 0) {
    return "một số thửa trong cánh đồng";
  }

  if (names.length <= maxItems) {
    return names.join(", ");
  }

  return `${names.slice(0, maxItems).join(", ")} và ${names.length - maxItems} thửa khác`;
};

const buildDiseaseWarningContent = ({ diseaseName, plots = [] }) => {
  const plotSummary = summarizePlotNames(plots);
  const normalizedDisease = stripVietnamese(diseaseName);

  // if (normalizedDisease.includes("dao on")) {
  //   return `Hệ thống ghi nhận bệnh đạo ôn lá trên các thửa ${plotSummary}. Đối với các thửa đã nhiễm: bà con cần khẩn trương ngưng bón phân đạm, tháo cạn nước và tiến hành phun thuốc đặc trị như Filia, Beam. Đối với các thửa lân cận: đề nghị bà con tăng cường thăm đồng, chủ động phun ngừa nếu thấy vết chấm kim.`;
  // }

  return `Hệ thống ghi nhận bệnh ${diseaseName} trên các thửa ${plotSummary}. Đối với các thửa đã nhiễm: bà con ... Đối với các thửa lân cận: đề nghị bà con tăng cường thăm đồng, chủ động xử lý sớm nếu xuất hiện triệu chứng bệnh...`;
};

const mapDiseaseLogOutput = (logDoc) => {
  const log = logDoc?.toObject
    ? logDoc.toObject({ virtuals: true })
    : { ...logDoc };
  const assignmentIds = (log.seasonPlotAssignments || [])
    .map((assignment) => assignment?._id || assignment)
    .filter(Boolean)
    .map((id) => String(id));
  const resolvedPlots = (log.seasonPlotAssignments || [])
    .map((item) => item.plot)
    .filter(Boolean);
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
  const seasonBaseName =
    seasonDetail?.season?.name || seasonDetail?.seasonName || null;
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
      const start = seasonDetail.startDate
        ? new Date(seasonDetail.startDate)
        : null;
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
        ? "Tất cả thửa tham gia vụ"
        : resolvedPlots.length === 1
          ? resolvedPlots[0]?.name || "1 thửa"
          : `${resolvedPlots.length} thửa được chọn`,
    userName: log.user?.fullName || undefined,
    fieldId,
    fieldName,
    seasonId,
    year: seasonYear,
    seasonLabel,
    seasonStatus,
    warningSent: log.warningSent === true,
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
    .populate("user", "fullName email phone")
    .populate("processedBy", "fullName email");

const getSeasonForUser = async (seasonId) => {
  const seasonDoc = await SeasonDetail.findById(seasonId).populate(
    "season",
    "name",
  );

  if (!seasonDoc) {
    throw new Error("Không tìm thấy mùa vụ");
  }

  return seasonDoc.toObject({ virtuals: true });
};

const ensureActiveSeasonForMutation = (season, action) => {
  if (!isSeasonActive(season)) {
    throw new Error(`Chỉ có thể ${action} nhật ký bệnh cho vụ đang canh tác`);
  }
};

const getParticipantPlotsForSeason = async (
  seasonId,
  userId,
  fieldId = null,
) => {
  const assignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonId,
    user: userId,
    status: "active",
    ...(fieldId ? { field: fieldId } : {}),
  })
    .populate("plot", "name area status field user")
    .lean();

  const activeAssignments = assignments.filter(
    (item) => item.plot && item.plot.status === "active",
  );
  if (activeAssignments.length === 0) {
    throw new Error("Mùa vụ này chưa có thửa nào đang hoạt động");
  }

  return activeAssignments;
};

const resolveAffectedPlots = async ({
  seasonId,
  userId,
  fieldId,
  scope,
  plotIds,
}) => {
  const participantAssignments = await getParticipantPlotsForSeason(
    seasonId,
    userId,
    fieldId,
  );
  const assignmentByPlotId = new Map(
    participantAssignments.map((item) => [String(item.plot._id), item]),
  );

  if (scope === "selected_plots") {
    const selectedPlotIds = normalizePlotIds(plotIds);
    if (selectedPlotIds.length === 0) {
      throw new Error("Cần chọn ít nhất 1 thửa để lưu nhật ký bệnh");
    }

    const invalidPlotId = selectedPlotIds.find(
      (plotId) => !assignmentByPlotId.has(plotId),
    );
    if (invalidPlotId) {
      throw new Error(
        "Có thửa ruộng không hợp lệ hoặc không thuộc mùa vụ đang chọn",
      );
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
  imageUrl = "",
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
    throw new Error("Thiếu seasonId");
  }

  if (!fieldId) {
    throw new Error("Thiếu fieldId");
  }

  const season = await getSeasonForUser(seasonId);
  if (requireActiveSeason) {
    ensureActiveSeasonForMutation(season, "lưu");
  }

  const diseaseName = (
    data.diseaseName ||
    data.disease ||
    existingLog?.diseaseName ||
    ""
  ).trim();
  if (!diseaseName) {
    throw new Error("Tên bệnh là bắt buộc");
  }

  const scope =
    data.scope === "selected_plots" || data.scope === "single_plot"
      ? "selected_plots"
      : "all_plots";

  let affectedAssignments = [];
  if (
    data.plotIds !== undefined ||
    data.scope !== undefined ||
    data.fieldId !== undefined ||
    data.field !== undefined
  ) {
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

  const status = normalizeStatus(
    data.status,
    existingLog?.status || "unprocessed",
  );
  const nextPayload = {
    diseaseName,
    confidence:
      data.confidence !== undefined
        ? normalizeConfidence(data.confidence)
        : normalizeConfidence(existingLog?.confidence),
    description: String(
      data.description || existingLog?.description || "",
    ).trim(),
    source: normalizeSource(
      data.source,
      normalizeSource(existingLog?.source, "ai_scan"),
    ),
    imageName: String(data.imageName || existingLog?.imageName || "").trim(),
    detectedAt:
      data.detectedAt || data.date || existingLog?.detectedAt || new Date(),
    status,
    processingNote: String(
      data.processingNote || existingLog?.processingNote || "",
    ).trim(),
    scope,
    seasonPlotAssignments: affectedAssignments.map((item) => item._id),
    user: userId,
    imageUrl: imageUrl || existingLog?.imageUrl || "",
  };

  if (status === "processed") {
    nextPayload.processedAt =
      data.processedAt || existingLog?.processedAt || new Date();
  } else {
    nextPayload.processedAt = null;
    nextPayload.processedBy = null;
  }

  return nextPayload;
};

const findPopulatedDiseaseLog = async (id, currentUser) => {
  const query = isAdminUser(currentUser)
    ? { _id: id }
    : { _id: id, user: currentUser.id };
  const log = await populateDiseaseLogQuery(DiseaseLog.findOne(query)).lean();

  if (!log) {
    throw new Error("Không tìm thấy nhật ký bệnh");
  }

  return log;
};

const buildDiseaseWarningContext = async (id, currentUser) => {
  ensureAdminUser(currentUser, "gửi cảnh báo dịch bệnh");

  const populatedLog = await findPopulatedDiseaseLog(id, currentUser);
  const mappedLog = mapDiseaseLogOutput(populatedLog);
  const firstAssignment = populatedLog.seasonPlotAssignments?.[0] || null;
  const seasonDetailId =
    firstAssignment?.seasonDetail?._id || firstAssignment?.seasonDetail || null;
  const fieldId = firstAssignment?.field?._id || firstAssignment?.field || null;
  const fieldName =
    firstAssignment?.field?.name || mappedLog.fieldName || "Không xác định";

  if (!seasonDetailId || !fieldId) {
    throw new Error(
      "Nhật ký bệnh không còn liên kết vụ mùa hoặc cánh đồng hợp lệ",
    );
  }

  const assignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonDetailId,
    field: fieldId,
    status: "active",
  })
    .populate("user", "fullName email phone")
    .populate("plot", "name")
    .lean();

  const recipientsMap = new Map();

  assignments.forEach((assignment) => {
    const userId = assignment.user?._id ? String(assignment.user._id) : "";
    if (!userId) return;

    if (!recipientsMap.has(userId)) {
      recipientsMap.set(userId, {
        userId,
        fullName: assignment.user?.fullName || "Nông dân",
        email: assignment.user?.email || "",
        phone: assignment.user?.phone || "",
        plotNames: [],
      });
    }

    if (assignment.plot?.name) {
      recipientsMap.get(userId).plotNames.push(assignment.plot.name);
    }
  });

  const recipients = Array.from(recipientsMap.values())
    .map((recipient) => ({
      ...recipient,
      plotNames: Array.from(new Set(recipient.plotNames)),
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "vi"));

  if (recipients.length === 0) {
    throw new Error(
      "Không tìm thấy nông dân nào trong cánh đồng để nhận cảnh báo",
    );
  }

  return {
    log: mappedLog,
    fieldId: String(fieldId),
    fieldName,
    seasonDetailId: String(seasonDetailId),
    recipients,
  };
};

const resolveDiseaseWarningRecipients = (
  context,
  recipientMode = "field_all",
) => {
  const normalizedMode =
    recipientMode === "reporter_only" ? "reporter_only" : "field_all";
  const reporterId = String(
    context?.log?.user?._id || context?.log?.user || "",
  ).trim();
  const fieldRecipients = Array.isArray(context?.recipients)
    ? context.recipients
    : [];
  const reporterFromField = fieldRecipients.find(
    (recipient) => String(recipient.userId || "") === reporterId,
  );

  const reporterRecipient =
    reporterFromField ||
    (reporterId
      ? {
          userId: reporterId,
          fullName:
            context?.log?.user?.fullName ||
            context?.log?.userName ||
            "Nông dân",
          email: context?.log?.user?.email || "",
          phone: context?.log?.user?.phone || "",
          plotNames: (context?.log?.plots || [])
            .map((plot) => plot?.name)
            .filter(Boolean),
        }
      : null);

  if (normalizedMode === "reporter_only") {
    if (!reporterRecipient) {
      throw new Error("Không tìm thấy nông dân ghi nhận bệnh để gửi cảnh báo");
    }

    return {
      recipientMode: normalizedMode,
      recipients: [reporterRecipient],
    };
  }

  return {
    recipientMode: normalizedMode,
    recipients: fieldRecipients,
  };
};

const buildDiseaseWarningDraft = ({
  log,
  fieldName,
  recipients,
  recipientMode = "field_all",
}) => ({
  title: `CẢNH BÁO ${String(log?.diseaseName || "BỆNH")
    .trim()
    .toUpperCase()} - ${String(fieldName || "")
    .trim()
    .toUpperCase()}`.trim(),
  content: buildDiseaseWarningContent({
    diseaseName: log?.diseaseName || "bệnh",
    plots: log?.plots || [],
  }),
  recipientMode,
  recipientOptions: [
    {
      value: "field_all",
      label: "Tất cả nông dân trên cánh đồng",
      count: Array.isArray(recipients) ? recipients.length : 0,
    },
    {
      value: "reporter_only",
      label: "Chỉ nông dân ghi nhận bệnh",
      count: 1,
    },
  ],
});

const createDiseaseLog = async (data, userId, imageUrl = "") => {
  const payload = await buildDiseaseLogPayload(
    data,
    userId,
    null,
    { requireActiveSeason: true },
    imageUrl,
  );

  if (payload.status === "processed") {
    payload.processedBy = userId;
  }

  const created = await DiseaseLog.create(payload);
  const populated = await populateDiseaseLogQuery(
    DiseaseLog.findById(created._id),
  ).lean();
  return mapDiseaseLogOutput(populated);
};

const getDiseaseLogs = async (filters = {}, currentUser) => {
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
    const assignments =
      await SeasonPlotAssignment.find(assignmentFilters).lean();
    const assignmentIds = assignments.map((item) => item._id);
    if (!assignmentIds.length) {
      return [];
    }

    query.seasonPlotAssignments = { $in: assignmentIds };
  }

  const logs = await populateDiseaseLogQuery(
    DiseaseLog.find(query).sort({ detectedAt: -1, createdAt: -1 }),
  );

  return logs.map(mapDiseaseLogOutput);
};

const updateDiseaseLog = async (id, data, currentUser, imageUrl = "") => {
  const query = isAdminUser(currentUser)
    ? { _id: id }
    : { _id: id, user: currentUser.id };

  const existing = await DiseaseLog.findOne(query)
    .populate("seasonPlotAssignments")
    .lean();
  if (!existing) {
    throw new Error("Không tìm thấy nhật ký bệnh");
  }

  const ownerUserId = existing.user?.toString?.() || existing.user;
  const seasonId = existing.seasonPlotAssignments?.[0]?.seasonDetail || null;
  if (!seasonId) {
    throw new Error("Nhật ký bệnh không còn liên kết vụ mùa hợp lệ");
  }

  const season = await getSeasonForUser(seasonId);

  if (!isSeasonActive(season)) {
    if (hasHistoricalContentChanges(data, existing)) {
      throw new Error(
        "Vụ mùa đã kết thúc. Bạn chỉ có thể cập nhật trạng thái xử lý và ghi chú.",
      );
    }

    const updatedHistoricalLog = await DiseaseLog.findOne(query);
    applyProcessingFields(updatedHistoricalLog, data, currentUser.id);
    await updatedHistoricalLog.save();

    const populatedHistoricalLog = await populateDiseaseLogQuery(
      DiseaseLog.findById(updatedHistoricalLog._id),
    ).lean();

    return mapDiseaseLogOutput(populatedHistoricalLog);
  }

  const payload = await buildDiseaseLogPayload(
    data,
    ownerUserId,
    existing,
    {
      requireActiveSeason: true,
    },
    imageUrl,
  );

  if (payload.status === "processed") {
    payload.processedBy = currentUser.id;
  }

  const updated = await populateDiseaseLogQuery(
    DiseaseLog.findOneAndUpdate(query, payload, { new: true }),
  ).lean();

  return mapDiseaseLogOutput(updated);
};

const updateDiseaseLogStatus = async (id, data, currentUser) => {
  const query = isAdminUser(currentUser)
    ? { _id: id }
    : { _id: id, user: currentUser.id };

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

  const updated = await populateDiseaseLogQuery(
    DiseaseLog.findById(existing._id),
  ).lean();
  return mapDiseaseLogOutput(updated);
};

const getDiseaseLogWarningPreview = async (id, currentUser) => {
  ensureAdminUser(currentUser, "xem trước cảnh báo dịch bệnh");

  const context = await buildDiseaseWarningContext(id, currentUser);
  const { recipients } = resolveDiseaseWarningRecipients(context, "field_all");
  const form = buildDiseaseWarningDraft({
    log: context.log,
    fieldName: context.fieldName,
    recipients,
    recipientMode: "field_all",
  });

  return {
    log: context.log,
    fieldId: context.fieldId,
    fieldName: context.fieldName,
    seasonDetailId: context.seasonDetailId,
    recipients,
    allFieldRecipients: context.recipients,
    reporterRecipient: resolveDiseaseWarningRecipients(context, "reporter_only")
      .recipients[0],
    form,
  };
};

const sendDiseaseLogWarning = async (id, payload = {}, currentUser) => {
  ensureAdminUser(currentUser, "gửi cảnh báo dịch bệnh");

  const context = await buildDiseaseWarningContext(id, currentUser);
  const { recipientMode, recipients } = resolveDiseaseWarningRecipients(
    context,
    payload.recipientMode || "field_all",
  );

  if (recipients.length === 0) {
    throw new Error("Không có nông dân phù hợp để gửi cảnh báo");
  }

  const title = String(payload.title || "").trim();
  const content = String(payload.content || "").trim();

  if (!title) {
    throw new Error("Tiêu đề cảnh báo là bắt buộc");
  }

  if (!content) {
    throw new Error("Nội dung cảnh báo là bắt buộc");
  }

  const createdAnnouncement =
    await announcementService.createSystemAnnouncement({
      type: "warning",
      source: normalizeWarningSource(payload.source, "plot-disease-warning"),
      title,
      content,
      isVisible: payload.isVisible !== false,
      audience: {
        scope: "users",
        userIds: recipients.map((recipient) => recipient.userId),
      },
      targetConfig: {
        mode:
          recipientMode === "reporter_only" ? "selected_users" : "field_users",
        fieldId: recipientMode === "field_all" ? context.fieldId : null,
      },
      deliveryChannels: ["web", "email"],
    });

  const emailRecipients = recipients.filter((recipient) => recipient.email);
  await Promise.all(
    emailRecipients.map((recipient) => {
      const emailContent = buildDiseaseWarningEmailTemplate({
        farmerName: recipient.fullName,
        title,
        content,
        fieldName: context.fieldName,
        plotNames: recipient.plotNames || [],
      });

      return sendMail({
        to: recipient.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    }),
  );

  const existingLog = await DiseaseLog.findById(id);
  if (!existingLog) {
    throw new Error("Không tìm thấy nhật ký bệnh");
  }

  existingLog.warningSent = true;
  existingLog.warningSentAt = new Date();
  await existingLog.save();

  const updated = await populateDiseaseLogQuery(
    DiseaseLog.findById(existingLog._id),
  ).lean();

  return {
    announcement: createdAnnouncement,
    log: mapDiseaseLogOutput(updated),
    recipients,
    recipientMode,
  };
};

const deleteDiseaseLog = async (id, currentUser) => {
  const query = isAdminUser(currentUser)
    ? { _id: id }
    : { _id: id, user: currentUser.id };

  const existing = await DiseaseLog.findOne(query)
    .populate("seasonPlotAssignments")
    .lean();
  if (!existing) {
    throw new Error("Không tìm thấy nhật ký bệnh");
  }

  const seasonId = existing.seasonPlotAssignments?.[0]?.seasonDetail || null;
  if (!seasonId) {
    throw new Error("Nhật ký bệnh không còn liên kết vụ mùa hợp lệ");
  }

  const season = await getSeasonForUser(seasonId);
  ensureActiveSeasonForMutation(season, "xóa");

  return DiseaseLog.findOneAndDelete(query);
};

module.exports = {
  createDiseaseLog,
  getDiseaseLogs,
  updateDiseaseLog,
  updateDiseaseLogStatus,
  getDiseaseLogWarningPreview,
  sendDiseaseLogWarning,
  deleteDiseaseLog,
};
