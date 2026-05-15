const DiaryLog = require("../models/diaryLogModel");
const Plot = require("../models/plotModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const { resolveTaskSelection } = require("./taskDetailService");

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

const getSeasonForUser = async (seasonId) => {
  const season = await SeasonDetail.findById(seasonId);
  if (!season) {
    throw new Error("Không tìm thấy vụ mùa");
  }

  return season;
};

const ensureActiveSeasonForMutation = (season, action) => {
  const now = new Date();
  const isActive =
    season.startDate &&
    new Date(season.startDate) <= now &&
    (!season.endDate || new Date(season.endDate) >= now);

  if (!isActive) {
    throw new Error(`Không thể ${action} nhật ký của vụ đã kết thúc`);
  }
};

const resolveLogPlots = async ({ season, userId, scope, plotId, plotIds, fieldId }) => {
  const requestedPlotIds =
    scope === "single_plot" ? normalizePlotIds([plotId]) : normalizePlotIds(plotIds);

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

  const activeAssignments = assignments.filter((item) => item.plot && item.plot.status === "active");

  if (activeAssignments.length === 0) {
    throw new Error("Vụ mùa này chưa có thửa nào sẵn sàng ghi nhật ký.");
  }

  const assignmentByPlotId = new Map(activeAssignments.map((item) => [String(item.plot._id), item]));

  if (scope === "all_plots") {
    return {
      scope: "all_plots",
      assignments: activeAssignments,
      plots: activeAssignments.map((item) => item.plot),
    };
  }

  if (requestedPlotIds.length === 0) {
    throw new Error("Cần chọn ít nhất 1 thửa để lưu nhật ký.");
  }

  const selectedAssignments = requestedPlotIds.map((id) => {
    const assignment = assignmentByPlotId.get(id);
    if (!assignment) {
      throw new Error("Có thửa không hợp lệ hoặc không tham gia vụ mùa đang chọn.");
    }
    return assignment;
  });

  return {
    scope: requestedPlotIds.length === 1 ? "single_plot" : "selected_plots",
    assignments: selectedAssignments,
    plots: selectedAssignments.map((item) => item.plot),
  };
};

const getSeasonIdFromLog = (log) => {
  const firstAssignment = log.seasonPlotAssignments?.[0];
  return firstAssignment?.seasonDetail?._id || firstAssignment?.seasonDetail || null;
};

const mapLogOutput = (logDoc) => {
  const log = logDoc.toObject ? logDoc.toObject() : { ...logDoc };
  const taskDetail = log.taskDetail || null;
  const taskFromDetail = taskDetail?.task || null;
  const task = taskFromDetail || log.task || null;
  const assignmentIds = (log.seasonPlotAssignments || [])
    .map((assignment) => assignment?._id || assignment)
    .filter(Boolean)
    .map((id) => String(id));
  const resolvedPlots = (log.seasonPlotAssignments || []).map((assignment) => assignment.plot).filter(Boolean);
  const plotIds = resolvedPlots
    .map((plot) => plot?._id || plot)
    .filter(Boolean)
    .map((id) => String(id));
  const scope = log.scope || (resolvedPlots.length > 1 ? "selected_plots" : "single_plot");
  const taskId = task?._id ? String(task._id) : typeof task === "string" ? String(task) : null;
  const taskDetailId = taskDetail?._id
    ? String(taskDetail._id)
    : typeof taskDetail === "string"
      ? String(taskDetail)
      : null;
  const taskName = task?.name || task?.label || "Khac";
  const taskDetailName = taskDetail?.name || "";
  const title = taskDetailName || taskName || "Nhật ký mùa vụ";

  return {
    ...log,
    taskId,
    taskName,
    taskDetailId,
    taskDetailName,
    title,
    taskLabel: taskDetailName ? `${taskName} - ${taskDetailName}` : taskName,
    scope,
    plots: resolvedPlots,
    plotIds,
    seasonPlotAssignmentIds: assignmentIds,
    seasonPlotAssignments: undefined,
    plotCount: resolvedPlots.length,
    appliesToAllPlots: scope === "all_plots",
    plotLabel:
      scope === "all_plots"
        ? "Tat ca thua tham gia vu"
        : resolvedPlots.length === 1
          ? resolvedPlots[0]?.name || "1 thua"
          : `${resolvedPlots.length} thua duoc chon`,
  };
};

const buildDiaryLogPopulate = (query) =>
  query
    .populate("task", "name")
    .populate({
      path: "taskDetail",
      select: "name task",
      populate: { path: "task", select: "name" },
    })
    .populate({
      path: "seasonPlotAssignments",
      populate: [
        { path: "plot", select: "name area status" },
        { path: "seasonDetail", select: "_id startDate endDate" },
      ],
    });

const getLogsBySeason = async (seasonId, userId, fieldId = null) => {
  await getSeasonForUser(seasonId);

  const assignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonId,
    user: userId,
    ...(fieldId ? { field: fieldId } : {}),
  }).lean();

  const assignmentIds = assignments.map((assignment) => assignment._id);
  if (!assignmentIds.length) {
    return [];
  }

  const logs = await buildDiaryLogPopulate(
    DiaryLog.find({
      user: userId,
      seasonPlotAssignments: { $in: assignmentIds },
    }).sort({ date: -1, createdAt: -1 })
  );

  return logs.map(mapLogOutput);
};

const createLog = async (data, userId) => {
  const seasonValue = data.seasonId || data.season;
  const resolvedTask = await resolveTaskSelection({
    taskId: data.taskId || data.task,
    taskDetailId: data.taskDetailId || data.taskDetail,
    title: data.title,
    taskName: data.taskName,
  });

  const season = await getSeasonForUser(seasonValue);
  ensureActiveSeasonForMutation(season, "them");

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
    task: resolvedTask.task,
    taskDetail: resolvedTask.taskDetail,
    description: data.description,
    date: data.date,
    cost: data.cost,
    scope: resolved.scope,
    seasonPlotAssignments: resolved.assignments.map((assignment) => assignment._id),
    user: userId,
  });

  const log = await buildDiaryLogPopulate(DiaryLog.findById(created._id));
  return mapLogOutput(log);
};

const updateLog = async (id, data, userId) => {
  const existingLog = await buildDiaryLogPopulate(DiaryLog.findOne({ _id: id, user: userId }));

  if (!existingLog) {
    throw new Error("Không tìm thấy nhật ký");
  }

  const seasonId = getSeasonIdFromLog(existingLog);
  if (!seasonId) {
    throw new Error("Nhật ký không còn liên kết vụ mùa hợp lệ");
  }

  const season = await getSeasonForUser(seasonId);
  ensureActiveSeasonForMutation(season, "chinh sua");

  const updateData = { ...data };
  const existingPlotIds = (existingLog.seasonPlotAssignments || [])
    .map((assignment) => String(assignment.plot?._id))
    .filter(Boolean);

  let scope =
    updateData.scope ||
    existingLog.scope ||
    (existingPlotIds.length > 1 ? "selected_plots" : "single_plot");

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
    plotId: updateData.plotId !== undefined ? updateData.plotId : existingPlotIds[0] || null,
    plotIds: updateData.plotIds !== undefined ? updateData.plotIds : existingPlotIds,
    fieldId: updateData.fieldId !== undefined ? updateData.fieldId : null,
  });

  if (
    updateData.taskId ||
    updateData.task ||
    updateData.taskDetailId ||
    updateData.taskDetail ||
    updateData.title ||
    updateData.taskName
  ) {
    const resolvedTask = await resolveTaskSelection({
      taskId: updateData.taskId || updateData.task,
      taskDetailId: updateData.taskDetailId || updateData.taskDetail,
      title: updateData.title,
      taskName: updateData.taskName,
    });

    updateData.task = resolvedTask.task;
    updateData.taskDetail = resolvedTask.taskDetail;
  }

  delete updateData.seasonId;
  delete updateData.plotId;
  delete updateData.plotIds;
  delete updateData.fieldId;
  delete updateData.taskId;
  delete updateData.taskCode;
  delete updateData.taskName;
  delete updateData.taskDetailId;
  delete updateData.title;
  delete updateData.type;

  updateData.scope = resolved.scope;
  updateData.seasonPlotAssignments = resolved.assignments.map((assignment) => assignment._id);

  const updated = await buildDiaryLogPopulate(
    DiaryLog.findOneAndUpdate({ _id: id, user: userId }, updateData, { new: true })
  );

  return updated ? mapLogOutput(updated) : null;
};

const deleteLog = async (id, userId) => {
  const existingLog = await DiaryLog.findOne({ _id: id, user: userId }).populate(
    "seasonPlotAssignments"
  );

  if (!existingLog) {
    throw new Error("Không tìm thấy nhật ký");
  }

  const seasonId = getSeasonIdFromLog(existingLog);
  if (!seasonId) {
    throw new Error("Nhật ký không còn liên kết vụ mùa hợp lệ");
  }

  const season = await getSeasonForUser(seasonId);
  ensureActiveSeasonForMutation(season, "xoa");

  return await DiaryLog.findOneAndDelete({ _id: id, user: userId });
};

module.exports = { getLogsBySeason, createLog, updateLog, deleteLog };
