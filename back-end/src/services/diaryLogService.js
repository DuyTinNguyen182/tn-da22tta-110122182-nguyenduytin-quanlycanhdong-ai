const DiaryLog = require("../models/diaryLogModel");
const Plot = require("../models/plotModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const { resolveTaskId } = require("./taskService");

const normalizePlotIds = (plotIds = []) => {
  if (!Array.isArray(plotIds)) {
    return [];
  }

  return Array.from(new Set(plotIds.filter(Boolean).map((item) => String(item))));
};

const getSeasonForUser = async (seasonId, userId) => {
  const season = await SeasonDetail.findOne({ _id: seasonId, user: userId });
  if (!season) {
    throw new Error("Không tìm thấy vụ mùa");
  }

  return season;
};

const getActiveSeasonPlots = async (seasonId, userId) => {
  const assignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonId,
    user: userId,
    status: "active",
  })
    .populate("plot", "name area status field user")
    .lean();

  const plots = assignments
    .map((item) => item.plot)
    .filter((plot) => plot && plot.status === "active");

  if (plots.length === 0) {
    throw new Error("Vụ mùa này chưa có thửa nào sẵn sàng ghi nhật ký.");
  }

  return plots;
};

const resolveLogPlots = async ({ season, userId, scope, plotId, plotIds }) => {
  const activePlots = await getActiveSeasonPlots(season._id, userId);
  const activePlotMap = new Map(activePlots.map((plot) => [String(plot._id), plot]));

  if (scope === "all_plots") {
    return {
      scope: "all_plots",
      plots: activePlots,
    };
  }

  const normalizedIds =
    scope === "single_plot"
      ? normalizePlotIds([plotId])
      : normalizePlotIds(plotIds);

  if (normalizedIds.length === 0) {
    throw new Error("Cần chọn ít nhất 1 thửa để lưu nhật ký.");
  }

  const invalidPlotId = normalizedIds.find((id) => !activePlotMap.has(id));
  if (invalidPlotId) {
    throw new Error("Có thửa không hợp lệ hoặc không tham gia vụ mùa đang chọn.");
  }

  return {
    scope: normalizedIds.length === 1 ? "single_plot" : "selected_plots",
    plots: normalizedIds.map((id) => activePlotMap.get(id)),
  };
};

const buildPlotSnapshot = (plots) =>
  plots.map((plot) => ({
    plotId: plot._id,
    name: plot.name || "",
    area: Number(plot.area || 0),
    status: plot.status || "",
  }));

const normalizeExistingPlots = (log) => {
  if (Array.isArray(log.plots) && log.plots.length > 0) {
    return log.plots.map((item) => (item?._id ? String(item._id) : String(item)));
  }

  if (log.plot) {
    return [log.plot?._id ? String(log.plot._id) : String(log.plot)];
  }

  return [];
};

const mapLogOutput = (logDoc) => {
  const log = logDoc.toObject ? logDoc.toObject() : { ...logDoc };
  const task = log.task || null;
  const scope =
    log.scope ||
    (Array.isArray(log.plots) && log.plots.length > 1
      ? "selected_plots"
      : Array.isArray(log.plots) && log.plots.length === 1
        ? "single_plot"
        : log.plot
          ? "single_plot"
          : "all_plots");

  const normalizedPlots =
    Array.isArray(log.plots) && log.plots.length > 0
      ? log.plots
      : log.plot
        ? [log.plot]
        : [];

  return {
    ...log,
    taskId: task?._id ? String(task._id) : typeof task === "string" ? task : null,
    taskName: task?.name || task?.label || "Khác",
    title: task?.name || task?.label || "Nhật ký mùa vụ",
    scope,
    plots: normalizedPlots,
    plotCount: normalizedPlots.length,
    appliesToAllPlots: scope === "all_plots",
    plotLabel:
      scope === "all_plots"
        ? "Tất cả thửa tham gia vụ"
        : normalizedPlots.length === 1
          ? normalizedPlots[0]?.name || "1 thửa"
          : `${normalizedPlots.length} thửa được chọn`,
  };
};

const getLogsBySeason = async (seasonId, userId) => {
  await getSeasonForUser(seasonId, userId);

  const logs = await DiaryLog.find({ season: seasonId, user: userId })
    .populate("task", "name")
    .populate("plot", "name area status")
    .populate("plots", "name area status")
    .sort({ date: -1, createdAt: -1 });

  return logs.map(mapLogOutput);
};

const createLog = async (data, userId) => {
  const seasonValue = data.seasonId || data.season;
  const taskId = await resolveTaskId({
    taskId: data.taskId || data.task,
    title: data.title,
    taskName: data.taskName,
  });

  const season = await getSeasonForUser(seasonValue, userId);
  if (season.status !== "active") {
    throw new Error("Chỉ có thể thêm nhật ký cho vụ đang active");
  }

  const requestedScope =
    data.scope === "selected_plots"
      ? "selected_plots"
      : data.scope === "single_plot"
        ? "single_plot"
        : data.plotId
          ? "single_plot"
          : "all_plots";

  const resolved = await resolveLogPlots({
    season,
    userId,
    scope: requestedScope,
    plotId: data.plotId || data.plot || null,
    plotIds: data.plotIds,
  });

  const created = await DiaryLog.create({
    task: taskId,
    description: data.description,
    date: data.date,
    cost: data.cost,
    season: seasonValue,
    plot: resolved.scope === "single_plot" ? resolved.plots[0]._id : null,
    scope: resolved.scope,
    plots: resolved.plots.map((plot) => plot._id),
    plotSnapshot: buildPlotSnapshot(resolved.plots),
    user: userId,
  });

  const log = await DiaryLog.findById(created._id)
    .populate("task", "name")
    .populate("plot", "name area status")
    .populate("plots", "name area status");

  return mapLogOutput(log);
};

const updateLog = async (id, data, userId) => {
  const existingLog = await DiaryLog.findOne({ _id: id, user: userId })
    .populate("plot", "name area status")
    .populate("plots", "name area status");

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

  let scope =
    updateData.scope ||
    existingLog.scope ||
    (normalizeExistingPlots(existingLog).length > 1 ? "selected_plots" : "single_plot");

  if (updateData.scope === "all_plots") {
    scope = "all_plots";
  } else if (updateData.plotId !== undefined) {
    scope = updateData.plotId ? "single_plot" : "all_plots";
  } else if (updateData.plotIds) {
    scope = normalizePlotIds(updateData.plotIds).length <= 1 ? "single_plot" : "selected_plots";
  }

  const resolved = await resolveLogPlots({
    season,
    userId,
    scope,
    plotId:
      updateData.plotId !== undefined
        ? updateData.plotId
        : normalizeExistingPlots(existingLog)[0] || null,
    plotIds:
      updateData.plotIds !== undefined
        ? updateData.plotIds
        : normalizeExistingPlots(existingLog),
  });

  if (updateData.taskId || updateData.task || updateData.title || updateData.taskName) {
    updateData.task = await resolveTaskId({
      taskId: updateData.taskId || updateData.task,
      title: updateData.title,
      taskName: updateData.taskName,
    });
  }

  delete updateData.seasonId;
  delete updateData.plotId;
  delete updateData.plotIds;
  delete updateData.taskId;
  delete updateData.taskCode;
  delete updateData.taskName;
  delete updateData.title;
  delete updateData.type;

  updateData.plot = resolved.scope === "single_plot" ? resolved.plots[0]._id : null;
  updateData.scope = resolved.scope;
  updateData.plots = resolved.plots.map((plot) => plot._id);
  updateData.plotSnapshot = buildPlotSnapshot(resolved.plots);

  const updated = await DiaryLog.findOneAndUpdate(
    { _id: id, user: userId },
    updateData,
    { new: true }
  )
    .populate("task", "name")
    .populate("plot", "name area status")
    .populate("plots", "name area status");

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
