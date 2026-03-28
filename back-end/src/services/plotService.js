const Plot = require("../models/plotModel");
const Field = require("../models/fieldModel");

const isAdminUser = (user) => (user?.role || "").toLowerCase() === "admin";

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

const createPlot = async (data, userId) => {
  await ensureFieldExists(data.fieldId);

  return await Plot.create({
    name: (data.name || "").trim(),
    area: data.area,
    status: data.status || "active",
    addressDetail: (data.addressDetail || "").trim(),
    field: data.fieldId,
    user: userId,
  });
};

const updatePlot = async (id, data, currentUser) => {
  const query = isAdminUser(currentUser) ? { _id: id } : { _id: id, user: currentUser.id };
  const updateData = {
    name: (data.name || "").trim(),
    area: data.area,
    status: data.status,
    addressDetail: (data.addressDetail || "").trim(),
  };

  const plot = await Plot.findOneAndUpdate(query, updateData, { new: true }).populate(
    "field",
    "name address"
  );

  if (!plot) {
    throw new Error("Không tìm thấy thửa ruộng");
  }

  return plot;
};

const deletePlot = async (id, currentUser) => {
  const query = isAdminUser(currentUser) ? { _id: id } : { _id: id, user: currentUser.id };
  const plot = await Plot.findOneAndDelete(query);
  if (!plot) {
    throw new Error("Không tìm thấy thửa ruộng");
  }

  return plot;
};

module.exports = {
  getPlotsByField,
  createPlot,
  updatePlot,
  deletePlot,
};
