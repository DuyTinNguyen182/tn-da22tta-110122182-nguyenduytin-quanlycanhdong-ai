const DiaryLog = require("../models/diaryLogModel");
const Plot = require("../models/plotModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const { resolveTaskId } = require("./taskService");

const normalizePlotIds = (plotIds = []) => {
  const values = Array.isArray(plotIds)
    ? plotIds
    : plotIds === undefined || plotIds === null || plotIds === ""
      ? []
      : [plotIds];

  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && item._id) return String(item._id);
          return String(item);
        })
    )
  );
};

const getSeasonForUser = async (seasonId, _userId) => {
  const season = await SeasonDetail.findById(seasonId);
  if (!season) {
    throw new Error("Không tìm thấy vụ mùa");
  }

  return season;
};

const resolveLogPlots = async ({ season, userId, scope, plotId, plotIds, fieldId }) => {
  const requestedPlotIds =
    scope === "single_plot"
      ? normalizePlotIds([plotId])
      : normalizePlotIds(plotIds);

  let targetFieldId = fieldId ? String(fieldId) : null;

  if (!targetFieldId && requestedPlotIds.length > 0) {
    const requestedPlots = await Plot.find({
      _id: { $in: requestedPlotIds },
      user: userId,
      status: "active",
    })
      .select("_id field")
      .lean();

    if (requestedPlots.length !== requestedPlotIds.length) {
      throw new Error("Có thửa không hợp lệ hoặc không thuộc người dùng hiện tại.");
    }

    const fieldIds = Array.from(new Set(requestedPlots.map((p) => String(p.field))));
    if (fieldIds.length !== 1) {
      throw new Error("Các thửa được chọn phải thuộc cùng một cánh đồng.");
    }

    targetFieldId = fieldIds[0];
  }

  if (scope === "all_plots" && !targetFieldId) {
    throw new Error("Thiếu thông tin cánh đồng khi áp dụng cho toàn bộ thửa.");
  }

  const assignments = await SeasonPlotAssignment.find({
    seasonDetail: season._id,
    user: userId,
    status: "active",
    ...(targetFieldId ? { field: targetFieldId } : {}),
  })
    .populate("plot", "name area status field user")
    .lean();

  const activeAssignments = assignments.filter((a) => a.plot && a.plot.status === "active");

  if (activeAssignments.length === 0) {
    throw new Error("Vụ mùa này chưa có thửa nào sẵn sàng ghi nhật ký.");
  }

  const assignmentByPlotId = new Map(activeAssignments.map((a) => [String(a.plot._id), a]));

  if (scope === "all_plots") {
    return {
      scope: "all_plots",
      assignments: activeAssignments,
      plots: activeAssignments.map((a) => a.plot),
    };
  }

  const normalizedIds = requestedPlotIds;

  if (normalizedIds.length === 0) {
    throw new Error("Cần chọn ít nhất 1 thửa để lưu nhật ký.");
  }

  const selectedAssignments = [];
  for (const id of normalizedIds) {
    if (!assignmentByPlotId.has(id)) {
      throw new Error("Có thửa không hợp lệ hoặc không tham gia vụ mùa đang chọn.");
    }
    selectedAssignments.push(assignmentByPlotId.get(id));
  }

  return {
    scope: normalizedIds.length === 1 ? "single_plot" : "selected_plots",
    assignments: selectedAssignments,
    plots: selectedAssignments.map((a) => a.plot),
  };
};

const buildPlotSnapshot = (plots) =>
  plots.map((plot) => ({
    plotId: plot._id,
    name: plot.name || "",
    area: Number(plot.area || 0),
    status: plot.status || "",
  }));

const mapLogOutput = (logDoc) => {
  const log = logDoc.toObject ? logDoc.toObject() : { ...logDoc };
  const task = log.task || null;
  
  // Backward compatibility with legacy logs: if seasonPlotAssignments is missing but we have plotSnapshot
  const hasAssignments = Array.isArray(log.seasonPlotAssignments) && log.seasonPlotAssignments.length > 0;
  
  // Resolve plots either from assignments or fallback to snapshot
  const resolvedPlots = hasAssignments 
    ? log.seasonPlotAssignments.map(a => a.plot).filter(Boolean)
    : log.plotSnapshot 
      ? log.plotSnapshot.map(s => ({ _id: s.plotId, name: s.name, area: s.area, status: s.status }))
      : [];

  const scope = log.scope || (resolvedPlots.length > 1 ? "selected_plots" : "single_plot");

  return {
    ...log,
    taskId: task?._id ? String(task._id) : typeof task === "string" ? task : null,
    taskName: task?.name || task?.label || "Khác",
    title: task?.name || task?.label || "Nhật ký mùa vụ",
    scope,
    plots: resolvedPlots,
    seasonPlotAssignments: undefined, // remove from output for cleaner response
    plotCount: resolvedPlots.length,
    appliesToAllPlots: scope === "all_plots",
    plotLabel:
      scope === "all_plots"
        ? "Tất cả thửa tham gia vụ"
        : resolvedPlots.length === 1
          ? resolvedPlots[0]?.name || "1 thửa"
          : `${resolvedPlots.length} thửa được chọn`,
  };
};

const getLogsBySeason = async (seasonId, userId, fieldId = null) => {
  await getSeasonForUser(seasonId, userId);

  const assignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonId,
    user: userId,
    ...(fieldId ? { field: fieldId } : {}),
  }).lean();
  const assignmentIds = assignments.map(a => a._id);

  const logQuery = {
    user: userId,
    $or: [{ seasonPlotAssignments: { $in: assignmentIds } }],
  };

  if (!fieldId) {
    // Legacy fallback for very old records that still only store season.
    logQuery.$or.push({ season: seasonId });
  }

  const logs = await DiaryLog.find(logQuery)
    .populate("task", "name")
    .populate({
      path: "seasonPlotAssignments",
      populate: { path: "plot", select: "name area status" }
    })
    // Also try to populate legacy fields for old logs
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
  
  // computed status check
  const now = new Date();
  const isActive = season.startDate && new Date(season.startDate) <= now && (!season.endDate || new Date(season.endDate) >= now);

  if (!isActive) {
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
    fieldId: data.fieldId || null,
  });

  const created = await DiaryLog.create({
    task: taskId,
    description: data.description,
    date: data.date,
    cost: data.cost,
    scope: resolved.scope,
    seasonPlotAssignments: resolved.assignments.map(a => a._id),
    plotSnapshot: buildPlotSnapshot(resolved.plots),
    user: userId,
  });

  const log = await DiaryLog.findById(created._id)
    .populate("task", "name")
    .populate({
      path: "seasonPlotAssignments",
      populate: { path: "plot", select: "name area status" }
    });

  return mapLogOutput(log);
};

const updateLog = async (id, data, userId) => {
  const existingLog = await DiaryLog.findOne({ _id: id, user: userId })
    .populate({
      path: "seasonPlotAssignments",
      populate: { path: "plot" }
    });

  if (!existingLog) {
    throw new Error("Không tìm thấy nhật ký");
  }

  // Derive season ID from assignments or legacy field
  const seasonId = existingLog.seasonPlotAssignments?.[0]?.seasonDetail 
    || existingLog.season;
    
  const season = await getSeasonForUser(seasonId, userId);
  
  const now = new Date();
  const isActive = season.startDate && new Date(season.startDate) <= now && (!season.endDate || new Date(season.endDate) >= now);

  if (!isActive) {
    throw new Error("Không thể chỉnh sửa nhật ký của vụ đã kết thúc");
  }

  const updateData = { ...data };

  // Fetch current explicitly assigned plots
  const existingPlotIdsStr = (existingLog.seasonPlotAssignments || [])
    .map(a => String(a.plot?._id));

  let scope =
    updateData.scope ||
    existingLog.scope ||
    (existingPlotIdsStr.length > 1 ? "selected_plots" : "single_plot");

  if (updateData.scope === "all_plots") {
    scope = "all_plots";
  } else if (updateData.plotId !== undefined) {
    scope = updateData.plotId ? "single_plot" : "all_plots";
  } else if (updateData.plotIds !== undefined) {
    scope = normalizePlotIds(updateData.plotIds).length <= 1 ? "single_plot" : "selected_plots";
  }

  const resolved = await resolveLogPlots({
    season,
    userId,
    scope,
    plotId: updateData.plotId !== undefined ? updateData.plotId : existingPlotIdsStr[0] || null,
    plotIds: updateData.plotIds !== undefined ? updateData.plotIds : existingPlotIdsStr,
    fieldId: updateData.fieldId !== undefined ? updateData.fieldId : null,
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
  delete updateData.fieldId;
  delete updateData.taskId;
  delete updateData.taskCode;
  delete updateData.taskName;
  delete updateData.title;
  delete updateData.type;

  updateData.scope = resolved.scope;
  updateData.seasonPlotAssignments = resolved.assignments.map(a => a._id);
  updateData.plotSnapshot = buildPlotSnapshot(resolved.plots);
  updateData.season = undefined; // Drop legacy field on update

  const updated = await DiaryLog.findOneAndUpdate(
    { _id: id, user: userId },
    updateData,
    { new: true }
  )
    .populate("task", "name")
    .populate({
      path: "seasonPlotAssignments",
      populate: { path: "plot", select: "name area status" }
    });

  return updated ? mapLogOutput(updated) : null;
};

const deleteLog = async (id, userId) => {
  const existingLog = await DiaryLog.findOne({ _id: id, user: userId })
    .populate("seasonPlotAssignments");
    
  if (!existingLog) {
    throw new Error("Không tìm thấy nhật ký");
  }

  const seasonId = existingLog.seasonPlotAssignments?.[0]?.seasonDetail || existingLog.season;
  const season = await getSeasonForUser(seasonId, userId);
  const now = new Date();
  const isActive = season.startDate && new Date(season.startDate) <= now && (!season.endDate || new Date(season.endDate) >= now);

  if (!isActive) {
    throw new Error("Không thể xóa nhật ký của vụ đã kết thúc");
  }

  return await DiaryLog.findOneAndDelete({ _id: id, user: userId });
};

module.exports = { getLogsBySeason, createLog, updateLog, deleteLog };
