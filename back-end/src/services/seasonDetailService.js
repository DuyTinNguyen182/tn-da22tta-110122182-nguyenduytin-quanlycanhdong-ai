const SeasonDetail = require("../models/seasonDetailModel");
const DiaryLog = require("../models/diaryLogModel");
const {
  getSeasonMap,
  resolveSeasonId,
  getSeasonNameById,
} = require("./seasonService");

const decorateSeasonDetail = (seasonDoc, catalogMap) => {
  const season = seasonDoc.toObject ? seasonDoc.toObject() : { ...seasonDoc };
  const seasonRefId =
    season?.season && typeof season.season === "object" && season.season._id
      ? String(season.season._id)
      : season?.season
        ? String(season.season)
        : null;
  const seasonMeta = seasonRefId ? catalogMap.get(seasonRefId) || season.season || null : null;
  const seasonName = seasonMeta?.name || "Không xác định";

  return {
    ...season,
    seasonId: seasonRefId,
    season: seasonMeta,
    seasonName,
    name: `${seasonName} ${season.year}`,
  };
};

// Lấy danh sách vụ của 1 cánh đồng
const getSeasonDetailsByField = async (fieldId, userId) => {
  const [seasonDocs, catalogMap] = await Promise.all([
    SeasonDetail.find({ field: fieldId, user: userId })
      .populate("season", "name")
      .populate("field", "name area location")
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 }),
    getSeasonMap(),
  ]);

  return seasonDocs.map((doc) => decorateSeasonDetail(doc, catalogMap));
};

const getAllSeasonDetails = async () => {
  const [seasonDocs, catalogMap] = await Promise.all([
    SeasonDetail.find()
      .populate("season", "name")
      .populate("field", "name area location")
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 }),
    getSeasonMap(),
  ]);

  return seasonDocs.map((doc) => decorateSeasonDetail(doc, catalogMap));
};

// Kiểm tra xem có season active nào cho field này không
const hasActiveSeasonDetails = async (fieldId, userId) => {
  const activeSeason = await SeasonDetail.findOne({
    field: fieldId,
    user: userId,
    status: "active",
  });
  return !!activeSeason;
};

// Kiểm tra xem season + year đã tồn tại cho field + user này không
const seasonDetailExists = async (seasonId, year, fieldId, userId) => {
  const existing = await SeasonDetail.findOne({
    season: seasonId,
    year,
    field: fieldId,
    user: userId,
  });
  return !!existing;
};

// Tạo vụ mới
const createSeasonDetail = async (data, userId) => {
  const { year, fieldId, startDate, status = "active" } = data;
  const seasonId = await resolveSeasonId(data);
  const catalogMap = await getSeasonMap();
  const resolvedName = catalogMap.get(seasonId)?.name || "Không xác định";

  const hasActive = await hasActiveSeasonDetails(fieldId, userId);
  if (hasActive && status === "active") {
    throw new Error("Cánh đồng này đang có vụ canh tác chưa kết thúc. Vui lòng kết thúc vụ hiện tại trước khi tạo vụ mới.");
  }

  const exists = await seasonDetailExists(seasonId, year, fieldId, userId);
  if (exists) {
    throw new Error(`Vụ ${resolvedName} ${year} đã tồn tại cho cánh đồng này. Vui lòng chọn mùa vụ khác hoặc cập nhật thông tin.`);
  }

  const season = await SeasonDetail.create({
    season: seasonId,
    year,
    field: fieldId,
    startDate: startDate || new Date(),
    user: userId,
    status,
  });

  const seasonDoc = await SeasonDetail.findById(season._id)
    .populate("season", "name")
    .populate("field", "name area location")
    .populate("user", "firstName lastName email");

  return decorateSeasonDetail(seasonDoc, catalogMap);
};

const finishSeasonDetail = async (id, userId) => {
  const [updatedDoc, catalogMap] = await Promise.all([
    SeasonDetail.findOneAndUpdate(
      { _id: id, user: userId },
      { status: "completed", endDate: new Date() },
      { new: true }
    )
      .populate("season", "name")
      .populate("field", "name area location")
      .populate("user", "firstName lastName email"),
    getSeasonMap(),
  ]);

  return updatedDoc ? decorateSeasonDetail(updatedDoc, catalogMap) : null;
};

const updateSeasonDetail = async (id, data, userId) => {
  const season = await SeasonDetail.findOne({ _id: id, user: userId });
  if (!season) {
    throw new Error("Không tìm thấy mùa vụ");
  }

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

  delete updateData.seasonCode;
  delete updateData.seasonId;
  delete updateData.seasonName;

  const [updatedDoc, catalogMap] = await Promise.all([
    SeasonDetail.findByIdAndUpdate(id, updateData, { new: true })
      .populate("season", "name")
      .populate("field", "name area location")
      .populate("user", "firstName lastName email"),
    getSeasonMap(),
  ]);

  return updatedDoc ? decorateSeasonDetail(updatedDoc, catalogMap) : null;
};

const deleteSeasonDetail = async (id, userId) => {
  const season = await SeasonDetail.findOneAndDelete({ _id: id, user: userId });
  if (season) {
    await DiaryLog.deleteMany({ season: id });
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
