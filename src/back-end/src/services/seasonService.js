const Season = require("../models/seasonModel");
const SeasonDetail = require("../models/seasonDetailModel");

const escapeRegExp = (input) => {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getSeasons = async ({ includeHidden = false } = {}) => {
  const query = includeHidden ? {} : { isVisible: { $ne: false } };
  return await Season.find(query).sort({ name: 1 });
};

const getSeasonById = async (id) => {
  return await Season.findById(id);
};

const createSeason = async (data) => {
  const rawName = data?.name || "";
  const name = rawName.trim();

  if (!name) {
    throw new Error("Tên mùa vụ là bắt buộc");
  }

  const exists = await Season.findOne({
    name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
  });

  if (exists) {
    throw new Error("Tên mùa vụ đã tồn tại");
  }

  return await Season.create({ name, isVisible: data?.isVisible !== false });
};

const updateSeason = async (id, data) => {
  const season = await Season.findById(id);
  if (!season) {
    throw new Error("Không tìm thấy mùa vụ");
  }

  const rawName = data?.name || "";
  const name = rawName.trim();

  if (!name) {
    throw new Error("Tên mùa vụ là bắt buộc");
  }

  const duplicate = await Season.findOne({
    _id: { $ne: id },
    name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
  });

  if (duplicate) {
    throw new Error("Tên mùa vụ đã tồn tại");
  }

  season.name = name;

  if (typeof data?.isVisible === "boolean") {
    season.isVisible = data.isVisible;
  }

  return await season.save();
};

const deleteSeason = async (id) => {
  const season = await Season.findById(id);
  if (!season) {
    throw new Error("Không tìm thấy mùa vụ");
  }

  const inUse = await SeasonDetail.exists({ season: id });
  if (inUse) {
    throw new Error("Không thể xóa mùa vụ đang được sử dụng trong chi tiết mùa vụ");
  }

  await season.deleteOne();
};

const getSeasonMap = async () => {
  const seasons = await Season.find().lean();
  return new Map(seasons.map((item) => [String(item._id), item]));
};

const resolveSeasonId = async ({ seasonId, seasonCode, seasonName }) => {
  const incomingId = seasonId || seasonCode;
  if (incomingId) {
    const season = await Season.findById(incomingId).lean();
    if (!season) {
      throw new Error("Mã mùa vụ không hợp lệ");
    }
    if (season.isVisible === false) {
      throw new Error("Mùa vụ này đang bị ẩn");
    }
    return String(season._id);
  }

  if (seasonName) {
    const season = await Season.findOne({ name: seasonName }).lean();
    if (!season) {
      throw new Error("Tên mùa vụ không hợp lệ");
    }
    if (season.isVisible === false) {
      throw new Error("Mùa vụ này đang bị ẩn");
    }
    return String(season._id);
  }

  throw new Error("Vui lòng cung cấp seasonId hoặc seasonName");
};

const getSeasonNameById = async (id) => {
  const season = await Season.findById(id).lean();
  return season?.name || "Không xác định";
};

module.exports = {
  getSeasons,
  getSeasonById,
  createSeason,
  updateSeason,
  deleteSeason,
  getSeasonMap,
  resolveSeasonId,
  getSeasonNameById,
};
