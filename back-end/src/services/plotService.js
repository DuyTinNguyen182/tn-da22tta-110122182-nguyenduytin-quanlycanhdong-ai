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

  if (!name) {
    throw new Error("Ten thua ruong la bat buoc");
  }

  if (!Number.isFinite(area) || area <= 0) {
    throw new Error("Dien tich thua ruong phai lon hon 0");
  }

  if (!["active", "inactive"].includes(status)) {
    throw new Error("Trang thai thua ruong khong hop le");
  }

  return { name, area, status };
};

const ensureFieldExists = async (fieldId) => {
  const field = await Field.findById(fieldId);
  if (!field) {
    throw new Error("Canh dong khong ton tai");
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
    .populate("user", "fullName email phone")
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
    throw new Error("Khong tim thay thua ruong");
  }

  const updateData = normalizePlotPayload(data, existingPlot.status);
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
    throw new Error("Khong tim thay thua ruong");
  }

  const assignments = await SeasonPlotAssignment.find({ plot: plot._id }).select("_id").lean();
  const assignmentIds = assignments.map((item) => item._id);

  const [diaryLogCount, diseaseLogCount] = assignmentIds.length
    ? await Promise.all([
        DiaryLog.countDocuments({ seasonPlotAssignments: { $in: assignmentIds } }),
        DiseaseLog.countDocuments({ seasonPlotAssignments: { $in: assignmentIds } }),
      ])
    : [0, 0];

  if (assignments.length > 0 || diaryLogCount > 0 || diseaseLogCount > 0) {
    throw new Error(
      "Thua ruong nay da tham gia mua vu hoac co nhat ky lien quan. Hay chuyen trang thai sang cho vu moi de giu lich su du lieu."
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
