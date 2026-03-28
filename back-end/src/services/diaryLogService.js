const DiaryLog = require("../models/diaryLogModel");
const Plot = require("../models/plotModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
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

const getSeasonForUser = async (seasonId, userId) => {
  const season = await SeasonDetail.findOne({ _id: seasonId, user: userId });
  if (!season) {
    throw new Error("Không tìm thấy vụ mùa");
  }

  return season;
};

const validateSeasonAssignment = async ({ plotId, season, userId }) => {
  const activeAssignments = await SeasonPlotAssignment.find({
    seasonDetail: season._id,
    user: userId,
    status: "active",
  }).lean();

  if (activeAssignments.length === 0) {
    throw new Error("Vụ mùa này chưa có thửa nào tham gia canh tác.");
  }

  if (!plotId) {
    return null;
  }

  const plot = await Plot.findOne({ _id: plotId, user: userId });
  if (!plot) {
    throw new Error("Không tìm thấy thửa ruộng");
  }

  if (String(plot.field) !== String(season.field)) {
    throw new Error("Thửa ruộng không thuộc cánh đồng của vụ mùa này");
  }

  const assignment = activeAssignments.find(
    (item) => String(item.plot) === String(plotId)
  );

  if (!assignment) {
    throw new Error("Thửa ruộng này không tham gia vụ mùa đang chọn");
  }

  if (plot.status !== "active") {
    throw new Error("Chỉ có thể ghi nhật ký cho các thửa đang active");
  }

  return plot;
};

const getLogsBySeason = async (seasonId, userId) => {
  await getSeasonForUser(seasonId, userId);

  const logs = await DiaryLog.find({ season: seasonId, user: userId })
    .populate("task", "name")
    .populate("plot", "name status")
    .sort({ date: -1, createdAt: -1 });

  return logs.map(mapLogOutput);
};

const createLog = async (data, userId) => {
  const seasonValue = data.seasonId || data.season;
  const plotInput = data.plotId !== undefined ? data.plotId : data.plot;
  const plotValue = plotInput && plotInput !== "" ? plotInput : null;
  const taskId = await resolveTaskId({
    taskId: data.taskId || data.task,
    title: data.title,
    taskName: data.taskName,
  });

  const season = await getSeasonForUser(seasonValue, userId);
  if (season.status !== "active") {
    throw new Error("Chỉ có thể thêm nhật ký cho vụ đang active");
  }

  await validateSeasonAssignment({ plotId: plotValue, season, userId });

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
    .populate("plot", "name status");

  return mapLogOutput(log);
};

const updateLog = async (id, data, userId) => {
  const existingLog = await DiaryLog.findOne({ _id: id, user: userId });
  if (!existingLog) {
    throw new Error("Không tìm thấy nhật ký");
  }

  const season = await getSeasonForUser(existingLog.season, userId);
  if (season.status !== "active") {
    throw new Error("Không thể chỉnh sửa nhật ký của vụ đã kết thúc");
  }

  const updateData = { ...data };
  if (updateData.seasonId && String(updateData.seasonId) !== String(existingLog.season)) {
    throw new Error("Không thể chuyển nhật ký sang vụ khác");
  }

  const plotCandidate =
    updateData.plotId === "" || updateData.plot === ""
      ? null
      : updateData.plotId || updateData.plot || existingLog.plot;

  await validateSeasonAssignment({ plotId: plotCandidate, season, userId });
  updateData.plot = plotCandidate;

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
    .populate("plot", "name status");

  return updated ? mapLogOutput(updated) : null;
};

const deleteLog = async (id, userId) => {
  const existingLog = await DiaryLog.findOne({ _id: id, user: userId });
  if (!existingLog) {
    throw new Error("Không tìm thấy nhật ký");
  }

  const season = await getSeasonForUser(existingLog.season, userId);
  if (season.status !== "active") {
    throw new Error("Không thể xóa nhật ký của vụ đã kết thúc");
  }

  return await DiaryLog.findOneAndDelete({ _id: id, user: userId });
};

module.exports = { getLogsBySeason, createLog, updateLog, deleteLog };
