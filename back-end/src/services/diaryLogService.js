const DiaryLog = require("../models/diaryLogModel");

// Lấy nhật ký của một vụ
const getLogsBySeason = async (seasonId, userId) => {
  return await DiaryLog.find({ season: seasonId, user: userId })
    .populate("plot", "name") // Lấy thêm tên thửa nếu có
    .sort({ date: -1 }); // Mới nhất lên đầu
};

const createLog = async (data, userId) => {
  const seasonValue = data.seasonId || data.season;
  const plotInput = data.plotId !== undefined ? data.plotId : data.plot;
  const plotValue = plotInput && plotInput !== "" ? plotInput : null;

  return await DiaryLog.create({
    title: data.title,
    description: data.description,
    date: data.date,
    type: data.type || "other",
    cost: data.cost,
    season: seasonValue,
    plot: plotValue,
    user: userId,
  });
};

const updateLog = async (id, data, userId) => {
  const updateData = { ...data };

  if (updateData.seasonId) {
    updateData.season = updateData.seasonId;
  }

  if (updateData.plotId === "" || updateData.plot === "") {
    updateData.plot = null;
  } else if (updateData.plotId) {
    updateData.plot = updateData.plotId;
  }

  delete updateData.seasonId;
  delete updateData.plotId;

  return await DiaryLog.findOneAndUpdate(
    { _id: id, user: userId },
    updateData,
    { new: true }
  );
};

const deleteLog = async (id, userId) => {
  return await DiaryLog.findOneAndDelete({ _id: id, user: userId });
};

module.exports = { getLogsBySeason, createLog, updateLog, deleteLog };