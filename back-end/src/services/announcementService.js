const mongoose = require("mongoose");
const Announcement = require("../models/announcementModel");
const AnnouncementRead = require("../models/announcementReadModel");
const Field = require("../models/fieldModel");
const User = require("../models/userModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const { sendMailSafely } = require("./mailService");
const {
  buildAnnouncementEmailTemplate,
} = require("../templates/announcementEmailTemplate");

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const ANNOUNCEMENT_TYPES = new Set(["notification", "warning"]);
const ANNOUNCEMENT_SOURCES = new Set([
  "manual",
  "plot-task-warning",
  "plot-disease-warning",
]);
const ANNOUNCEMENT_AUDIENCE_SCOPES = new Set(["all", "users"]);
const DELIVERY_CHANNELS = new Set(["web", "email"]);
const TARGET_MODES = new Set(["all_farmers", "selected_users", "field_users"]);

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
    throw new Error("Phạm vi người nhận không hợp lệ");
  }

  return normalized;
};

const normalizeAudienceUserIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter((item) => mongoose.Types.ObjectId.isValid(item)),
    ),
  );
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
  const channels = Array.isArray(value) && value.length > 0 ? value : ["web", "email"];
  const normalized = Array.from(
    new Set(
      channels
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  if (normalized.length === 0) {
    return ["web", "email"];
  }

  const hasInvalidChannel = normalized.some((item) => !DELIVERY_CHANNELS.has(item));
  if (hasInvalidChannel) {
    throw new Error("Kênh gửi thông báo không hợp lệ");
  }

  return normalized;
};

const normalizeTargetMode = (value, fallback = "all_farmers") => {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase();

  if (!TARGET_MODES.has(normalized)) {
    throw new Error("Kiểu người nhận không hợp lệ");
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

const getRecipientId = (entry) => {
  const recipientId = entry?._id ? String(entry._id) : String(entry || "");

  return recipientId;
};

const mapRecipientForAdmin = (entry) => {
  const recipientId = getRecipientId(entry);

  if (!recipientId) {
    return null;
  }

  return {
    _id: recipientId,
    fullName: entry?.fullName || "",
  };
};

const mapAnnouncementForAdmin = (item) => {
  const recipientItems = Array.isArray(item.audience?.userIds) ? item.audience.userIds : [];

  return {
    _id: String(item._id),
    type: item.type,
    title: item.title,
    content: item.content,
    isVisible: item.isVisible === true,
    source: item.source || "manual",
    audienceScope: item.audience?.scope || "all",
    audienceUserIds: recipientItems.map(getRecipientId).filter(Boolean),
    recipients: recipientItems.map(mapRecipientForAdmin).filter(Boolean),
    deliveryChannels: Array.isArray(item.deliveryChannels) ? item.deliveryChannels : ["web", "email"],
    targetMode: item.targetConfig?.mode || "all_farmers",
    targetFieldId: item.targetConfig?.fieldId?._id
      ? String(item.targetConfig.fieldId._id)
      : item.targetConfig?.fieldId
        ? String(item.targetConfig.fieldId)
        : "",
    targetFieldName: item.targetConfig?.fieldId?.name || "",
    recipientCount: recipientItems.length,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

const mapAnnouncementForVisibleList = (item) => ({
  _id: String(item._id),
  type: item.type,
  title: item.title,
  content: item.content,
  isVisible: item.isVisible === true,
  source: item.source || "manual",
  audienceScope: item.audience?.scope || "all",
  deliveryChannels: Array.isArray(item.deliveryChannels) ? item.deliveryChannels : ["web", "email"],
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const listFarmerUsers = async () =>
  User.find({ role: "farmer" })
    .sort({ fullName: 1, email: 1 })
    .select("_id fullName email phone")
    .lean();

const buildFieldFarmerIndex = async () => {
  const assignments = await SeasonPlotAssignment.find({ status: "active" })
    .populate("field", "name")
    .populate("user", "fullName email phone role")
    .lean();

  const fieldMap = new Map();

  assignments.forEach((assignment) => {
    const fieldId = assignment.field?._id ? String(assignment.field._id) : "";
    const userId = assignment.user?._id ? String(assignment.user._id) : "";
    const isFarmer = assignment.user?.role === "farmer";

    if (!fieldId || !userId || !isFarmer) {
      return;
    }

    if (!fieldMap.has(fieldId)) {
      fieldMap.set(fieldId, {
        fieldId,
        fieldName: assignment.field?.name || "Cánh đồng",
        userMap: new Map(),
      });
    }

    const fieldEntry = fieldMap.get(fieldId);
    if (!fieldEntry.userMap.has(userId)) {
      fieldEntry.userMap.set(userId, {
        _id: userId,
        fullName: assignment.user?.fullName || "Nông dân",
        email: assignment.user?.email || "",
        phone: assignment.user?.phone || "",
      });
    }
  });

  return fieldMap;
};

const getAdminAnnouncementOptions = async () => {
  const [fields, farmers, fieldFarmerIndex] = await Promise.all([
    Field.find().sort({ name: 1 }).select("_id name").lean(),
    listFarmerUsers(),
    buildFieldFarmerIndex(),
  ]);

  const farmerFieldMap = new Map();
  fieldFarmerIndex.forEach((entry) => {
    entry.userMap.forEach((user) => {
      if (!farmerFieldMap.has(user._id)) {
        farmerFieldMap.set(user._id, []);
      }

      farmerFieldMap.get(user._id).push({
        fieldId: entry.fieldId,
        fieldName: entry.fieldName,
      });
    });
  });

  return {
    fields: fields.map((field) => {
      const fieldId = String(field._id);
      const users = fieldFarmerIndex.get(fieldId)?.userMap || new Map();

      return {
        _id: fieldId,
        name: field.name || "Cánh đồng",
        farmerCount: users.size,
      };
    }),
    farmers: farmers.map((farmer) => ({
      _id: String(farmer._id),
      fullName: farmer.fullName || "Nông dân",
      email: farmer.email || "",
      phone: farmer.phone || "",
      fields: farmerFieldMap.get(String(farmer._id)) || [],
    })),
  };
};

const resolveAnnouncementRecipients = async (payload = {}, current = null) => {
  const targetMode = normalizeTargetMode(
    payload.targetConfig?.mode ?? current?.targetConfig?.mode ?? "all_farmers",
  );
  const fieldId =
    payload.targetConfig?.fieldId ?? current?.targetConfig?.fieldId?._id ?? current?.targetConfig?.fieldId ?? "";

  if (targetMode === "all_farmers") {
    const farmers = await listFarmerUsers();
    return {
      targetMode,
      fieldId: null,
      fieldName: "",
      recipients: farmers.map((item) => ({
        _id: String(item._id),
        fullName: item.fullName || "Nông dân",
        email: item.email || "",
        phone: item.phone || "",
      })),
    };
  }

  if (targetMode === "selected_users") {
    const userIds = normalizeAudienceUserIds(
      payload.audience?.userIds ?? current?.audience?.userIds ?? [],
    );

    if (userIds.length === 0) {
      throw new Error("Vui lòng chọn ít nhất 1 nông dân");
    }

    const farmers = await User.find({
      _id: { $in: userIds },
      role: "farmer",
    })
      .select("_id fullName email phone")
      .lean();

    if (farmers.length === 0) {
      throw new Error("Không tìm thấy nông dân phù hợp để gửi");
    }

    return {
      targetMode,
      fieldId: null,
      fieldName: "",
      recipients: farmers.map((item) => ({
        _id: String(item._id),
        fullName: item.fullName || "Nông dân",
        email: item.email || "",
        phone: item.phone || "",
      })),
    };
  }

  if (!mongoose.Types.ObjectId.isValid(String(fieldId || ""))) {
    throw new Error("Vui lòng chọn cánh đồng hợp lệ");
  }

  const assignments = await SeasonPlotAssignment.find({
    field: fieldId,
    status: "active",
  })
    .populate("field", "name")
    .populate("user", "fullName email phone role")
    .lean();

  const recipientsMap = new Map();
  let fieldName = "";

  assignments.forEach((assignment) => {
    if (assignment.user?.role !== "farmer" || !assignment.user?._id) {
      return;
    }

    fieldName = assignment.field?.name || fieldName;
    const userId = String(assignment.user._id);

    if (!recipientsMap.has(userId)) {
      recipientsMap.set(userId, {
        _id: userId,
        fullName: assignment.user?.fullName || "Nông dân",
        email: assignment.user?.email || "",
        phone: assignment.user?.phone || "",
      });
    }
  });

  const recipients = Array.from(recipientsMap.values());

  if (recipients.length === 0) {
    throw new Error("Cánh đồng này hiện chưa có nông dân để gửi");
  }

  return {
    targetMode,
    fieldId: String(fieldId),
    fieldName,
    recipients,
  };
};

const buildAnnouncementPayload = (payload = {}, current = null, recipientResolution = null) => {
  const type = normalizeType(payload.type || current?.type || "notification") || "notification";
  const title = String(payload.title ?? current?.title ?? "").trim();
  const content = String(payload.content ?? current?.content ?? "").trim();

  if (!title) {
    throw new Error("Tên thông báo/cảnh báo là bắt buộc");
  }

  if (!content) {
    throw new Error("Nội dung thông báo/cảnh báo là bắt buộc");
  }

  const recipients = recipientResolution?.recipients || [];
  const userIds = recipients.map((item) => item._id);

  return {
    type,
    title,
    content,
    isVisible: payload.isVisible ?? current?.isVisible ?? false,
    source: normalizeSource(payload.source ?? current?.source ?? "manual"),
    audience: normalizeAudience({
      scope: "users",
      userIds,
    }),
    targetConfig: {
      mode: recipientResolution?.targetMode || current?.targetConfig?.mode || "all_farmers",
      fieldId: recipientResolution?.fieldId || current?.targetConfig?.fieldId || null,
    },
    deliveryChannels: normalizeDeliveryChannels(
      payload.deliveryChannels ?? current?.deliveryChannels ?? ["web", "email"],
    ),
  };
};

const sendAnnouncementEmails = async ({ recipients, title, content, type, deliveryChannels }) => {
  if (!deliveryChannels.includes("email")) {
    return [];
  }

  const emailRecipients = recipients.filter((recipient) => recipient.email);
  if (emailRecipients.length === 0) {
    return [];
  }

  return Promise.all(
    emailRecipients.map(async (recipient) => {
      const emailContent = buildAnnouncementEmailTemplate({
        recipientName: recipient.fullName,
        title,
        content,
        type,
      });

      const result = await sendMailSafely({
        to: recipient.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      return {
        userId: recipient._id,
        email: recipient.email,
        emailSent: result.success,
        emailErrorMessage: result.errorMessage,
      };
    }),
  );
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
      ...mapAnnouncementForVisibleList(item),
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
        .populate("targetConfig.fieldId", "name")
        .populate("audience.userIds", "fullName")
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
    items: items.map(mapAnnouncementForAdmin),
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
  const recipientResolution = await resolveAnnouncementRecipients(payload);
  const data = buildAnnouncementPayload(payload, null, recipientResolution);
  const created = await Announcement.create(data);

  await sendAnnouncementEmails({
    recipients: recipientResolution.recipients,
    title: data.title,
    content: data.content,
    type: data.type,
    deliveryChannels: data.deliveryChannels,
  });

  const populated = await Announcement.findById(created._id)
    .populate("targetConfig.fieldId", "name")
    .populate("audience.userIds", "fullName")
    .lean();

  return mapAnnouncementForAdmin(populated);
};

const createSystemAnnouncement = async (payload = {}) => {
  const data = buildAnnouncementPayload(payload, null, {
    targetMode: payload.targetConfig?.mode || "selected_users",
    fieldId: payload.targetConfig?.fieldId || null,
    recipients: Array.isArray(payload.audience?.userIds)
      ? payload.audience.userIds.map((item) => ({ _id: String(item) }))
      : [],
  });
  const created = await Announcement.create(data);
  return mapAnnouncementForAdmin(created.toObject());
};

const updateAnnouncement = async (id, payload = {}) => {
  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw new Error("Không tìm thấy thông báo/cảnh báo");
  }

  const recipientResolution = await resolveAnnouncementRecipients(payload, announcement);
  const data = buildAnnouncementPayload(payload, announcement, recipientResolution);

  announcement.type = data.type;
  announcement.title = data.title;
  announcement.content = data.content;
  announcement.isVisible = data.isVisible;
  announcement.source = data.source;
  announcement.audience = data.audience;
  announcement.targetConfig = data.targetConfig;
  announcement.deliveryChannels = data.deliveryChannels;

  await announcement.save();

  const populated = await Announcement.findById(announcement._id)
    .populate("targetConfig.fieldId", "name")
    .populate("audience.userIds", "fullName")
    .lean();
  return mapAnnouncementForAdmin(populated);
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

const deleteAnnouncements = async (ids = []) => {
  const normalizedIds = Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [])
        .map((item) => String(item || "").trim())
        .filter((item) => mongoose.Types.ObjectId.isValid(item)),
    ),
  );

  if (normalizedIds.length === 0) {
    throw new Error("Vui lòng chọn ít nhất 1 thông báo/cảnh báo để xóa");
  }

  await Announcement.deleteMany({ _id: { $in: normalizedIds } });
  await AnnouncementRead.deleteMany({ announcement: { $in: normalizedIds } });

  return {
    deletedCount: normalizedIds.length,
  };
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
      })),
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
  getAdminAnnouncementOptions,
  createAnnouncement,
  createSystemAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  deleteAnnouncements,
  getUnreadAnnouncementSummary,
  markVisibleAnnouncementsAsRead,
};
