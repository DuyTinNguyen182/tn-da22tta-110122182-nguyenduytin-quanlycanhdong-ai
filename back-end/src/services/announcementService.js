const mongoose = require("mongoose");
const Announcement = require("../models/announcementModel");
const AnnouncementRead = require("../models/announcementReadModel");

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const ANNOUNCEMENT_TYPES = new Set(["notification", "warning"]);
const ANNOUNCEMENT_SOURCES = new Set(["manual", "plot-task-warning"]);
const ANNOUNCEMENT_AUDIENCE_SCOPES = new Set(["all", "users"]);
const DELIVERY_CHANNELS = new Set(["web", "email"]);

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
    throw new Error("Loại thông báo không hợp lệ");
  }

  return normalized;
};

const normalizeSource = (value) => {
  const normalized = String(value || "manual")
    .trim()
    .toLowerCase();

  if (!ANNOUNCEMENT_SOURCES.has(normalized)) {
    throw new Error("Nguồn thông báo không hợp lệ");
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

  throw new Error("Trạng thái hiển thị không hợp lệ");
};

const normalizeAudienceScope = (value) => {
  const normalized = String(value || "all")
    .trim()
    .toLowerCase();

  if (!ANNOUNCEMENT_AUDIENCE_SCOPES.has(normalized)) {
    throw new Error("Phân loại người nhận không hợp lệ");
  }

  return normalized;
};

const normalizeAudienceUserIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const userIds = Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter((item) => mongoose.Types.ObjectId.isValid(item))
    )
  );

  return userIds;
};

const normalizeAudience = (value = {}) => {
  const scope = normalizeAudienceScope(value.scope || "all");
  const userIds = normalizeAudienceUserIds(value.userIds);

  if (scope === "users" && userIds.length === 0) {
    throw new Error("Thông báo dành riêng phải có ít nhất 1 người nhận");
  }

  return {
    scope,
    userIds: scope === "users" ? userIds : [],
  };
};

const normalizeDeliveryChannels = (value) => {
  const channels = Array.isArray(value) && value.length > 0 ? value : ["web"];
  const normalized = Array.from(
    new Set(
      channels
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );

  if (normalized.length === 0) {
    return ["web"];
  }

  const hasInvalidChannel = normalized.some((item) => !DELIVERY_CHANNELS.has(item));
  if (hasInvalidChannel) {
    throw new Error("Kênh gửi thông báo không hợp lệ");
  }

  return normalized;
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
  source: item.source || "manual",
  audienceScope: item.audience?.scope || "all",
  deliveryChannels: Array.isArray(item.deliveryChannels) ? item.deliveryChannels : ["web"],
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const buildVisibleAudienceFilter = (currentUser) => ({
  $or: [
    { "audience.scope": { $exists: false } },
    { "audience.scope": "all" },
    {
      "audience.scope": "users",
      "audience.userIds": currentUser?.id || null,
    },
  ],
});

const buildQueryOptions = (query = {}, { adminView = false, currentUser = null } = {}) => {
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
    filters.$and = [buildVisibleAudienceFilter(currentUser)];
  }

  return { page, limit, filters };
};

const buildAnnouncementPayload = (payload = {}, current = null) => {
  const type = normalizeType(payload.type || current?.type || "notification") || "notification";
  const title = String(payload.title ?? current?.title ?? "").trim();
  const content = String(payload.content ?? current?.content ?? "").trim();

  if (!title) {
    throw new Error("Tên thông báo/cảnh báo là bắt buộc");
  }

  if (!content) {
    throw new Error("Nội dung thông báo/cảnh báo là bắt buộc");
  }

  return {
    type,
    title,
    content,
    isVisible: payload.isVisible ?? current?.isVisible ?? false,
    source: normalizeSource(payload.source ?? current?.source ?? "manual"),
    audience: normalizeAudience(payload.audience ?? current?.audience ?? { scope: "all" }),
    deliveryChannels: normalizeDeliveryChannels(
      payload.deliveryChannels ?? current?.deliveryChannels ?? ["web"]
    ),
  };
};

const listReadableAnnouncementIds = async (currentUser) => {
  if (!currentUser?.id) {
    return [];
  }

  return Announcement.find({
    isVisible: true,
    $and: [buildVisibleAudienceFilter(currentUser)],
  }).distinct("_id");
};

const listVisibleAnnouncements = async (query = {}, currentUser = null) => {
  const { page, limit, filters } = buildQueryOptions(query, {
    adminView: false,
    currentUser,
  });
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    Announcement.find(filters)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Announcement.countDocuments(filters),
  ]);

  const itemIds = items.map((item) => item._id);
  const readAnnouncementIds =
    currentUser?.id && itemIds.length > 0
      ? await AnnouncementRead.find({
          user: currentUser.id,
          announcement: { $in: itemIds },
        }).distinct("announcement")
      : [];
  const readIdSet = new Set(readAnnouncementIds.map((item) => String(item)));

  return {
    items: items.map((item) => ({
      ...normalizeAnnouncementOutput(item),
      isRead: readIdSet.has(String(item._id)),
    })),
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

const createAnnouncement = async (payload = {}) => {
  const data = buildAnnouncementPayload(payload);
  const created = await Announcement.create(data);
  return normalizeAnnouncementOutput(created);
};

const createSystemAnnouncement = async (payload = {}) => {
  const data = buildAnnouncementPayload(payload);
  const created = await Announcement.create(data);
  return normalizeAnnouncementOutput(created);
};

const updateAnnouncement = async (id, payload = {}) => {
  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw new Error("Không tìm thấy thông báo/cảnh báo");
  }

  const data = buildAnnouncementPayload(payload, announcement);

  announcement.type = data.type;
  announcement.title = data.title;
  announcement.content = data.content;
  announcement.isVisible = data.isVisible;
  announcement.source = data.source;
  announcement.audience = data.audience;
  announcement.deliveryChannels = data.deliveryChannels;

  await announcement.save();
  return normalizeAnnouncementOutput(announcement);
};

const deleteAnnouncement = async (id) => {
  const announcement = await Announcement.findById(id).lean();
  if (!announcement) {
    throw new Error("Không tìm thấy thông báo/cảnh báo");
  }

  await Announcement.deleteOne({ _id: id });
  await AnnouncementRead.deleteMany({ announcement: id });
  return { deletedId: id };
};

const getUnreadAnnouncementSummary = async (currentUser) => {
  const announcementIds = await listReadableAnnouncementIds(currentUser);

  if (announcementIds.length === 0) {
    return {
      unreadCount: 0,
    };
  }

  const readAnnouncementIds = await AnnouncementRead.find({
    user: currentUser.id,
    announcement: { $in: announcementIds },
  }).distinct("announcement");

  return {
    unreadCount: Math.max(0, announcementIds.length - readAnnouncementIds.length),
  };
};

const markVisibleAnnouncementsAsRead = async (currentUser) => {
  const announcementIds = await listReadableAnnouncementIds(currentUser);

  if (announcementIds.length === 0) {
    return {
      markedCount: 0,
      unreadCount: 0,
    };
  }

  const readAnnouncementIds = await AnnouncementRead.find({
    user: currentUser.id,
    announcement: { $in: announcementIds },
  }).distinct("announcement");
  const readIdSet = new Set(readAnnouncementIds.map((item) => String(item)));
  const unreadAnnouncementIds = announcementIds.filter((item) => !readIdSet.has(String(item)));

  if (unreadAnnouncementIds.length > 0) {
    await AnnouncementRead.bulkWrite(
      unreadAnnouncementIds.map((announcementId) => ({
        updateOne: {
          filter: {
            user: new mongoose.Types.ObjectId(currentUser.id),
            announcement: announcementId,
          },
          update: {
            $set: {
              readAt: new Date(),
            },
          },
          upsert: true,
        },
      }))
    );
  }

  return {
    markedCount: unreadAnnouncementIds.length,
    unreadCount: 0,
  };
};

module.exports = {
  listVisibleAnnouncements,
  listAdminAnnouncements,
  createAnnouncement,
  createSystemAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getUnreadAnnouncementSummary,
  markVisibleAnnouncementsAsRead,
};
