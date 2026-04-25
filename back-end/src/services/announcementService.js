const Announcement = require("../models/announcementModel");

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const ANNOUNCEMENT_TYPES = new Set(["notification", "warning"]);

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const normalizeLimit = (value) => {
  const parsed = parsePositiveInteger(value, DEFAULT_LIMIT);
  return Math.min(parsed, MAX_LIMIT);
};

const normalizeType = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized || normalized === "all") {
    return "";
  }

  if (!ANNOUNCEMENT_TYPES.has(normalized)) {
    throw new Error("Loai thong bao khong hop le");
  }

  return normalized;
};

const normalizeVisibility = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized || normalized === "all") {
    return null;
  }

  if (normalized === "visible") {
    return true;
  }

  if (normalized === "hidden") {
    return false;
  }

  throw new Error("Trang thai hien thi khong hop le");
};

const buildKeywordFilter = (keyword) => {
  const normalized = String(keyword || "").trim();
  if (!normalized) {
    return null;
  }

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  return {
    $or: [{ title: regex }, { content: regex }],
  };
};

const buildPagination = ({ page, limit, totalItems }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
};

const normalizeAnnouncementOutput = (item) => ({
  _id: String(item._id),
  type: item.type,
  title: item.title,
  content: item.content,
  isVisible: item.isVisible === true,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const buildQueryOptions = (query = {}, { adminView = false } = {}) => {
  const page = parsePositiveInteger(query.page, 1);
  const limit = normalizeLimit(query.limit);
  const filters = {};
  const type = normalizeType(query.type);
  const keywordFilter = buildKeywordFilter(query.keyword);

  if (type) {
    filters.type = type;
  }

  if (keywordFilter) {
    Object.assign(filters, keywordFilter);
  }

  if (adminView) {
    const isVisible = normalizeVisibility(query.visibility);
    if (typeof isVisible === "boolean") {
      filters.isVisible = isVisible;
    }
  } else {
    filters.isVisible = true;
  }

  return { page, limit, filters };
};

const listVisibleAnnouncements = async (query = {}) => {
  const { page, limit, filters } = buildQueryOptions(query, { adminView: false });
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    Announcement.find(filters)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Announcement.countDocuments(filters),
  ]);

  return {
    items: items.map(normalizeAnnouncementOutput),
    pagination: buildPagination({ page, limit, totalItems }),
  };
};

const listAdminAnnouncements = async (query = {}) => {
  const { page, limit, filters } = buildQueryOptions(query, { adminView: true });
  const skip = (page - 1) * limit;

  const [items, totalItems, totalCount, visibleCount, hiddenCount, warningCount, notificationCount] =
    await Promise.all([
      Announcement.find(filters)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Announcement.countDocuments(filters),
      Announcement.countDocuments(),
      Announcement.countDocuments({ isVisible: true }),
      Announcement.countDocuments({ isVisible: false }),
      Announcement.countDocuments({ type: "warning" }),
      Announcement.countDocuments({ type: "notification" }),
    ]);

  return {
    items: items.map(normalizeAnnouncementOutput),
    pagination: buildPagination({ page, limit, totalItems }),
    summary: {
      totalCount,
      visibleCount,
      hiddenCount,
      warningCount,
      notificationCount,
    },
  };
};

const validatePayload = (payload = {}) => {
  const type = normalizeType(payload.type || "notification") || "notification";
  const title = String(payload.title || "").trim();
  const content = String(payload.content || "").trim();

  if (!title) {
    throw new Error("Ten thong bao/canh bao la bat buoc");
  }

  if (!content) {
    throw new Error("Noi dung thong bao/canh bao la bat buoc");
  }

  return {
    type,
    title,
    content,
    isVisible: payload.isVisible === true,
  };
};

const createAnnouncement = async (payload = {}) => {
  const data = validatePayload(payload);
  const created = await Announcement.create(data);
  return normalizeAnnouncementOutput(created);
};

const updateAnnouncement = async (id, payload = {}) => {
  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw new Error("Khong tim thay thong bao/canh bao");
  }

  const data = validatePayload({
    type: payload.type ?? announcement.type,
    title: payload.title ?? announcement.title,
    content: payload.content ?? announcement.content,
    isVisible: payload.isVisible ?? announcement.isVisible,
  });

  announcement.type = data.type;
  announcement.title = data.title;
  announcement.content = data.content;
  announcement.isVisible = data.isVisible;

  await announcement.save();
  return normalizeAnnouncementOutput(announcement);
};

const deleteAnnouncement = async (id) => {
  const announcement = await Announcement.findById(id).lean();
  if (!announcement) {
    throw new Error("Khong tim thay thong bao/canh bao");
  }

  await Announcement.deleteOne({ _id: id });
  return { deletedId: id };
};

module.exports = {
  listVisibleAnnouncements,
  listAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
