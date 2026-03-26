const DiaryLog = require("../models/diaryLogModel");
const { resolveTaskId } = require("./taskService");

const mapLogOutput = (logDoc) => {
  const log = logDoc.toObject ? logDoc.toObject() : { ...logDoc };
  const task = log.task || null;
  const taskName = task?.name || task?.label || "Khác";

  return {
    ...log,
    taskId: task?._id ? String(task._id) : typeof task === "string" ? task : null,
    taskName,
    title: taskName,
  };
};

// Lấy nhật ký của một vụ
const getLogsBySeason = async (seasonId, userId) => {
  const logs = await DiaryLog.find({ season: seasonId, user: userId })
    .populate("task", "name")
    .populate("plot", "name") // Lấy thêm tên thửa nếu có
    .sort({ date: -1 }); // Mới nhất lên đầu

  return logs.map(mapLogOutput);
};

const createLog = async (data, userId) => {
  const seasonValue = data.seasonId || data.season;
  const plotInput = data.plotId !== undefined ? data.plotId : data.plot;
  const plotValue = plotInput && plotInput !== "" ? plotInput : null;
  const taskId = await resolveTaskId({ taskId: data.taskId || data.task, title: data.title, taskName: data.taskName });

  const created = await DiaryLog.create({
    task: taskId,
    description: data.description,
    date: data.date,
    cost: data.cost,
    season: seasonValue,
    plot: plotValue,
    user: userId,
  });

  const log = await DiaryLog.findById(created._id)
    .populate("task", "name")
    .populate("plot", "name");

  return mapLogOutput(log);
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

  if (updateData.taskId || updateData.task || updateData.title || updateData.taskName) {
    updateData.task = await resolveTaskId({
      taskId: updateData.taskId || updateData.task,
      title: updateData.title,
      taskName: updateData.taskName,
    });
  }

  delete updateData.seasonId;
  delete updateData.plotId;
  delete updateData.taskId;
  delete updateData.taskCode;
  delete updateData.taskName;
  delete updateData.title;
  delete updateData.type;

  const updated = await DiaryLog.findOneAndUpdate(
    { _id: id, user: userId },
    updateData,
    { new: true }
  )
    .populate("task", "name")
    .populate("plot", "name");

  return updated ? mapLogOutput(updated) : null;
};

const deleteLog = async (id, userId) => {
  return await DiaryLog.findOneAndDelete({ _id: id, user: userId });
};

module.exports = { getLogsBySeason, createLog, updateLog, deleteLog };