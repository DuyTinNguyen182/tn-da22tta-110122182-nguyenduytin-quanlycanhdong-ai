const Plot = require("../models/plotModel");
const Field = require("../models/fieldModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const DiaryLog = require("../models/diaryLogModel");
const DiseaseLog = require("../models/diseaseLogModel");

const isAdminUser = (user) => (user?.role || "").toLowerCase() === "admin";

const normalizePlotPayload = (data = {}, fallbackStatus = "active") => {
  const name = (data.name || "").trim();
  const area = Number(data.area);
  const status = data.status || fallbackStatus;
  const addressDetail = (data.addressDetail || "").trim();

  if (!name) {
    throw new Error("Tên thửa ruộng là bắt buộc");
  }

  if (!Number.isFinite(area) || area <= 0) {
    throw new Error("Diện tích thửa ruộng phải lớn hơn 0");
  }

  if (!["active", "inactive"].includes(status)) {
    throw new Error("Trạng thái thửa ruộng không hợp lệ");
  }

  return { name, area, status, addressDetail };
};


const ensureFieldExists = async (fieldId) => {
  const field = await Field.findById(fieldId);
  if (!field) {
    throw new Error("Cánh đồng không tồn tại");
  }

  return field;
};

const getPlotsByField = async (fieldId, currentUser) => {
  await ensureFieldExists(fieldId);

  const query = { field: fieldId };
  if (!isAdminUser(currentUser)) {
    query.user = currentUser.id;
  }

  return await Plot.find(query)
    .populate("field", "name address")
    .sort({ createdAt: 1 });
};

const createPlot = async (data, userId, imageUrl = "") => {
  await ensureFieldExists(data.fieldId);
  const payload = normalizePlotPayload(data);

  return await Plot.create({
    ...payload,
    imageUrl,
    field: data.fieldId,
    user: userId,
  });
};

const updatePlot = async (id, data, currentUser, imageUrl = null) => {
  const query = isAdminUser(currentUser) ? { _id: id } : { _id: id, user: currentUser.id };
  const existingPlot = await Plot.findOne(query);
  if (!existingPlot) {
    throw new Error("Không tìm thấy thửa ruộng");
  }

  const updateData = normalizePlotPayload(data, existingPlot.status);

  // Chỉ ghi đè imageUrl nếu upload ảnh mới
  if (imageUrl !== null) {
    updateData.imageUrl = imageUrl;
  }

  return await Plot.findByIdAndUpdate(existingPlot._id, updateData, { new: true }).populate(
    "field",
    "name address"
  );
};


const deletePlot = async (id, currentUser) => {
  const query = isAdminUser(currentUser) ? { _id: id } : { _id: id, user: currentUser.id };
  const plot = await Plot.findOne(query);
  if (!plot) {
    throw new Error("Không tìm thấy thửa ruộng");
  }

  const [assignmentCount, diaryLogCount, diseaseLogCount] = await Promise.all([
    SeasonPlotAssignment.countDocuments({ plot: plot._id }),
    DiaryLog.countDocuments({
      $or: [{ plot: plot._id }, { plots: plot._id }],
    }),
    DiseaseLog.countDocuments({ plots: plot._id }),
  ]);

  if (assignmentCount > 0 || diaryLogCount > 0 || diseaseLogCount > 0) {
    throw new Error(
      "Thửa ruộng này đã tham gia mùa vụ hoặc có nhật ký liên quan. Hãy chuyển trạng thái sang chờ vụ mới để giữ lịch sử dữ liệu."
    );
  }

  await Plot.deleteOne({ _id: plot._id });
  return plot;
};

module.exports = {
  getPlotsByField,
  createPlot,
  updatePlot,
  deletePlot,
};
