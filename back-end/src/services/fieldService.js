const mongoose = require("mongoose");
const Field = require("../models/fieldModel");
const Plot = require("../models/plotModel");

const DiseaseLog = require("../models/diseaseLogModel");
const User = require("../models/userModel");

const isAdminUser = (user) => (user?.role || "").toLowerCase() === "admin";

const normalizeFieldPayload = (data = {}) => {
  const name = (data.name || "").trim();
  const address = (data.address || "").trim();

  if (!name) {
    throw new Error("Tên cánh đồng là bắt buộc");
  }

  return { name, address };
};

const buildFieldStatsMap = async () => {
  const plotStats = await Plot.aggregate([
    {
      $group: {
        _id: "$field",
        plotCount: { $sum: 1 },
        totalArea: { $sum: "$area" },
        farmerIds: { $addToSet: "$user" },
      },
    },
  ]);

  const plotMap = new Map(
    plotStats.map((item) => [
      String(item._id),
      {
        plotCount: item.plotCount || 0,
        totalArea: item.totalArea || 0,
        farmerCount: item.farmerIds?.length || 0,
      },
    ])
  );

  return { plotMap };
};

const buildUserPlotMap = async (currentUser) => {
  if (isAdminUser(currentUser)) {
    return new Map();
  }

  const userPlotStats = await Plot.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(currentUser.id) } },
    {
      $group: {
        _id: "$field",
        myPlotCount: { $sum: 1 },
        myTotalArea: { $sum: "$area" },
      },
    },
  ]);

  return new Map(
    userPlotStats.map((item) => [
      String(item._id),
      {
        myPlotCount: item.myPlotCount || 0,
        myTotalArea: item.myTotalArea || 0,
      },
    ])
  );
};

const enrichFields = async (fieldDocs, currentUser) => {
  const { plotMap } = await buildFieldStatsMap();
  const userPlotMap = await buildUserPlotMap(currentUser);

  return fieldDocs.map((fieldDoc) => {
    const field = fieldDoc.toObject ? fieldDoc.toObject() : { ...fieldDoc };
    const stats = plotMap.get(String(field._id)) || {
      plotCount: 0,
      totalArea: 0,
      farmerCount: 0,
    };
    const userStats = userPlotMap.get(String(field._id)) || {
      myPlotCount: 0,
      myTotalArea: 0,
    };

    return {
      ...field,
      plotCount: stats.plotCount,
      totalArea: stats.totalArea,
      farmerCount: stats.farmerCount,
      myPlotCount: userStats.myPlotCount,
      myTotalArea: userStats.myTotalArea,
      createdByName: field.user?.fullName || "",
    };
  });
};

const createField = async (data, currentUser) => {
  if (!isAdminUser(currentUser)) {
    throw new Error("Chỉ admin mới được tạo cánh đồng");
  }

  const payload = normalizeFieldPayload(data);

  const exists = await Field.findOne({
    name: { $regex: `^${payload.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });

  if (exists) {
    throw new Error("Tên cánh đồng đã tồn tại");
  }

  return await Field.create({
    ...payload,
    user: currentUser.id,
  });
};

const getAllFields = async (currentUser) => {
  const fields = await Field.find()
    .populate("user", "fullName")
    .sort({ createdAt: -1 });

  return await enrichFields(fields, currentUser);
};

const updateField = async (id, data, currentUser) => {
  if (!isAdminUser(currentUser)) {
    throw new Error("Chỉ admin mới được cập nhật cánh đồng");
  }

  const payload = normalizeFieldPayload(data);

  const duplicate = await Field.findOne({
    _id: { $ne: id },
    name: { $regex: `^${payload.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });

  if (duplicate) {
    throw new Error("Tên cánh đồng đã tồn tại");
  }

  const field = await Field.findByIdAndUpdate(id, payload, { new: true }).populate(
    "user",
    "fullName"
  );

  if (!field) {
    throw new Error("Không tìm thấy cánh đồng");
  }

  const [enrichedField] = await enrichFields([field], currentUser);
  return enrichedField;
};

const deleteFieldCascadeById = async (fieldId) => {
  const field = await Field.findById(fieldId);
  if (!field) {
    throw new Error("Không tìm thấy cánh đồng");
  }

  await Promise.all([
    Plot.deleteMany({ field: fieldId }),
    DiseaseLog.deleteMany({ field: fieldId }),
  ]);

  await Field.deleteOne({ _id: fieldId });
  return field;
};

const deleteField = async (id, currentUser) => {
  if (!isAdminUser(currentUser)) {
    throw new Error("Chỉ admin mới được xóa cánh đồng");
  }

  return await deleteFieldCascadeById(id);
};

const getFieldSummary = async (currentUser) => {
  const allFields = await getAllFields(currentUser);

  if (isAdminUser(currentUser)) {
    const [farmerCount, plotStats] = await Promise.all([
      User.countDocuments({ role: { $regex: /^farmer$/i } }),
      Plot.aggregate([
        {
          $group: {
            _id: null,
            plotCount: { $sum: 1 },
            totalArea: { $sum: "$area" },
          },
        },
      ]),
    ]);

    const totals = plotStats[0] || { plotCount: 0, totalArea: 0 };

    return {
      role: "admin",
      stats: {
        fieldCount: allFields.length,
        plotCount: totals.plotCount || 0,
        totalArea: totals.totalArea || 0,
        farmerCount,
      },
      recentFields: allFields.slice(0, 5),
    };
  }

  const userObjectId = new mongoose.Types.ObjectId(currentUser.id);
  const [userPlotStats, recentPlots] = await Promise.all([
    Plot.aggregate([
      { $match: { user: userObjectId } },
      {
        $group: {
          _id: null,
          plotCount: { $sum: 1 },
          totalArea: { $sum: "$area" },
          fieldIds: { $addToSet: "$field" },
        },
      },
    ]),
    Plot.find({ user: currentUser.id })
      .populate("field", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const totals = userPlotStats[0] || { plotCount: 0, totalArea: 0, fieldIds: [] };

  return {
    role: "farmer",
    stats: {
      availableFieldCount: allFields.length,
      fieldCount: totals.fieldIds?.length || 0,
      plotCount: totals.plotCount || 0,
      totalArea: totals.totalArea || 0,
    },
    recentPlots,
  };
};

module.exports = {
  createField,
  getAllFields,
  updateField,
  deleteField,
  deleteFieldCascadeById,
  getFieldSummary,
};
