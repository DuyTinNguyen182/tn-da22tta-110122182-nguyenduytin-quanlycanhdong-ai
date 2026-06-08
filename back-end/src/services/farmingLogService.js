const DiaryLog = require("../models/farmingLogModel");
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
      values.filter(Boolean).map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && item._id)
          return String(item._id);
        return String(item);
      }),
    ),
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

const resolveLogPlots = async ({
  season,
  userId,
  scope,
  plotId,
  plotIds,
  fieldId,
}) => {
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
      throw new Error(
        "Có thửa không hợp lệ hoặc không thuộc người dùng hiện tại.",
      );
    }

    const fieldIds = Array.from(
      new Set(requestedPlots.map((p) => String(p.field))),
    );
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

  const activeAssignments = assignments.filter(
    (item) => item.plot && item.plot.status === "active",
  );

  if (activeAssignments.length === 0) {
    throw new Error("Vụ mùa này chưa có thửa nào sẵn sàng ghi nhật ký.");
  }

  const assignmentByPlotId = new Map(
    activeAssignments.map((item) => [String(item.plot._id), item]),
  );

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
      throw new Error(
        "Có thửa không hợp lệ hoặc không tham gia vụ mùa đang chọn.",
      );
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
  return (
    firstAssignment?.seasonDetail?._id || firstAssignment?.seasonDetail || null
  );
};

const mapLogOutput = (logDoc) => {
  const log = logDoc.toObject ? logDoc.toObject() : { ...logDoc };
  const task = log.task || null;
  const assignmentIds = (log.seasonPlotAssignments || [])
    .map((assignment) => assignment?._id || assignment)
    .filter(Boolean)
    .map((id) => String(id));
  const resolvedPlots = (log.seasonPlotAssignments || [])
    .map((assignment) => assignment.plot)
    .filter(Boolean);
  const plotIds = resolvedPlots
    .map((plot) => plot?._id || plot)
    .filter(Boolean)
    .map((id) => String(id));
  const scope =
    log.scope || (resolvedPlots.length > 1 ? "selected_plots" : "single_plot");
  const taskId = task?._id
    ? String(task._id)
    : typeof task === "string"
      ? String(task)
      : null;
  const taskName = task?.name || task?.label || "Khac";
  const title = taskName || "Nhật ký mùa vụ";

  return {
    ...log,
    taskId,
    taskName,
    title,
    taskLabel: taskName,
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
    .populate({
      path: "task",
      select: "name stage order",
      populate: { path: "stage", select: "name order" },
    })
    .populate({
      path: "seasonPlotAssignments",
      populate: [
        { path: "plot", select: "name area status field" },
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
    }).sort({ date: -1, createdAt: -1 }),
  );

  return logs.map(mapLogOutput);
};

const createLog = async (data, userId) => {
  const seasonValue = data.seasonId || data.season;
  const resolvedTaskId = await resolveTaskId({
    taskId: data.taskId || data.task,
    taskName: data.taskName,
    title: data.title,
  });

  const season = await getSeasonForUser(seasonValue);
  ensureActiveSeasonForMutation(season, "thêm");

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

  const assignmentIds = resolved.assignments.map(
    (assignment) => assignment._id,
  );

  await validateRepetitionConstraint(resolvedTaskId, assignmentIds);
  await validatePrerequisiteConstraint(resolvedTaskId, assignmentIds);
  // --------------------------------------

  const created = await DiaryLog.create({
    task: resolvedTaskId,
    description: data.description,
    date: data.date,
    cost: data.cost,
    scope: resolved.scope,
    seasonPlotAssignments: assignmentIds,
    user: userId,
  });

  const log = await buildDiaryLogPopulate(DiaryLog.findById(created._id));
  return mapLogOutput(log);
};

const updateLog = async (id, data, userId) => {
  const existingLog = await buildDiaryLogPopulate(
    DiaryLog.findOne({ _id: id, user: userId }),
  );

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
    scope =
      normalizePlotIds(updateData.plotIds).length <= 1
        ? "single_plot"
        : "selected_plots";
  }

  const resolved = await resolveLogPlots({
    season,
    userId,
    scope,
    plotId:
      updateData.plotId !== undefined
        ? updateData.plotId
        : existingPlotIds[0] || null,
    plotIds:
      updateData.plotIds !== undefined ? updateData.plotIds : existingPlotIds,
    fieldId: updateData.fieldId !== undefined ? updateData.fieldId : null,
  });

  if (
    updateData.taskId ||
    updateData.task ||
    updateData.title ||
    updateData.taskName
  ) {
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
  delete updateData.taskDetailId;
  delete updateData.taskDetail;
  delete updateData.title;
  delete updateData.type;

  updateData.scope = resolved.scope;
  updateData.seasonPlotAssignments = resolved.assignments.map(
    (assignment) => assignment._id,
  );

  const taskToValidate = updateData.task || existingLog.task._id;
  const assignmentsToValidate =
    updateData.seasonPlotAssignments ||
    (existingLog.seasonPlotAssignments || []).map((a) => a._id);

  await validateRepetitionConstraint(taskToValidate, assignmentsToValidate, id);
  await validatePrerequisiteConstraint(taskToValidate, assignmentsToValidate);

  const updated = await buildDiaryLogPopulate(
    DiaryLog.findOneAndUpdate({ _id: id, user: userId }, updateData, {
      new: true,
    }),
  );

  return updated ? mapLogOutput(updated) : null;
};

const deleteLog = async (id, userId) => {
  const existingLog = await DiaryLog.findOne({
    _id: id,
    user: userId,
  }).populate("seasonPlotAssignments");

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

const validateRepetitionConstraint = async (
  taskId,
  seasonPlotAssignmentIds,
  excludeLogId = null,
) => {
  try {
    const Task = require("../models/taskModel");
    const task = await Task.findById(taskId).select("isRepeatable name").lean();
    if (!task) throw new Error("Không tìm thấy công việc");

    if (task.isRepeatable) return;

    const query = {
      task: taskId,
      seasonPlotAssignments: { $in: seasonPlotAssignmentIds },
    };
    if (excludeLogId) {
      query._id = { $ne: excludeLogId }; // $ne: Not Equal
    }

    const existingLog = await DiaryLog.findOne(query).select("_id").lean();

    if (existingLog) {
      throw new Error(
        `Công việc "${task.name || "không xác định"}" là công việc không được phép lặp lại trên cùng một thửa.`,
      );
    }
  } catch (error) {
    if (error.message.includes("không được phép lặp lại")) throw error;
    throw new Error(`Xác thực ràng buộc lặp lại thất bại: ${error.message}`);
  }
};

const validatePrerequisiteConstraint = async (
  taskId,
  seasonPlotAssignmentIds,
) => {
  try {
    const Task = require("../models/taskModel");

    const task = await Task.findById(taskId)
      .populate("prerequisites", "_id name")
      .lean();

    if (!task) {
      throw new Error("Không tìm thấy công việc");
    }

    if (!task.prerequisites || task.prerequisites.length === 0) {
      return;
    }

    // 1. Lấy thông tin Tên thửa đất để hiển thị lỗi thân thiện
    const assignments = await SeasonPlotAssignment.find({
      _id: { $in: seasonPlotAssignmentIds },
    })
      .populate("plot", "name")
      .lean();

    const plotNamesMap = {};
    assignments.forEach((a) => {
      plotNamesMap[String(a._id)] = a.plot?.name || "Thửa không xác định";
    });

    const missingPrerequisites = [];

    for (const prerequisite of task.prerequisites) {
      const prerequisiteId = prerequisite._id || prerequisite;

      const loggedAssignments = await DiaryLog.find({
        task: prerequisiteId,
        seasonPlotAssignments: { $in: seasonPlotAssignmentIds },
      })
        .select("seasonPlotAssignments")
        .lean();

      const loggedAssignmentIds = new Set();
      loggedAssignments.forEach((log) => {
        (log.seasonPlotAssignments || []).forEach((assignmentId) => {
          loggedAssignmentIds.add(String(assignmentId));
        });
      });

      for (const assignmentId of seasonPlotAssignmentIds) {
        if (!loggedAssignmentIds.has(String(assignmentId))) {
          missingPrerequisites.push({
            prerequisiteName: prerequisite.name || "Công việc không xác định",
            plotName: plotNamesMap[String(assignmentId)],
          });
        }
      }
    }

    // 2. Gom nhóm lỗi và xuất thông báo
    if (missingPrerequisites.length > 0) {
      const grouped = {};
      missingPrerequisites.forEach((p) => {
        if (!grouped[p.prerequisiteName]) grouped[p.prerequisiteName] = [];
        grouped[p.prerequisiteName].push(p.plotName);
      });

      const errorMessages = Object.keys(grouped).map(
        (taskName) => `- ${taskName} (tại: ${grouped[taskName].join(", ")})`,
      );

      throw new Error(
        `Không thể lưu nhật ký. Vui lòng hoàn thành các công việc tiên quyết sau:\n${errorMessages.join("\n")}`,
      );
    }
  } catch (error) {
    if (error.message.includes("Không thể lưu nhật ký")) {
      throw error;
    }
    throw new Error(`Xác thực ràng buộc tiên quyết thất bại: ${error.message}`);
  }
};

const createDiaryLog = async (payload) => {
  try {
    const {
      task,
      description = "",
      date = new Date(),
      cost = 0,
      scope = "all_plots",
      seasonPlotAssignments = [],
      user,
    } = payload;

    if (!task) {
      throw new Error("Vui lòng cung cấp ID công việc.");
    }

    if (!user) {
      throw new Error("Vui lòng cung cấp ID người dùng.");
    }

    if (
      !Array.isArray(seasonPlotAssignments) ||
      seasonPlotAssignments.length === 0
    ) {
      throw new Error("Vui lòng chọn ít nhất một phân công thửa cho vụ mùa.");
    }

    const validScopes = ["single_plot", "selected_plots", "all_plots"];
    if (!validScopes.includes(scope)) {
      throw new Error(
        `Phạm vi không hợp lệ. Phải là một trong: ${validScopes.join(", ")}`,
      );
    }

    const Task = require("../models/taskModel");
    const taskDoc = await Task.findById(task).lean();
    if (!taskDoc) {
      throw new Error("Công việc tham chiếu không tồn tại.");
    }

    await validateRepetitionConstraint(task, seasonPlotAssignments);

    await validatePrerequisiteConstraint(task, seasonPlotAssignments);

    const newLog = new DiaryLog({
      task,
      description: description.trim(),
      date,
      cost: Math.max(0, cost),
      scope,
      seasonPlotAssignments,
      user,
    });

    await newLog.save();

    const populatedLog = await buildDiaryLogPopulate(
      DiaryLog.findById(newLog._id),
    );
    return mapLogOutput(populatedLog);
  } catch (error) {
    throw new Error(`Tạo nhật ký canh tác thất bại: ${error.message}`);
  }
};

module.exports = {
  getLogsBySeason,
  createLog,
  updateLog,
  deleteLog,
  createDiaryLog,
  validateRepetitionConstraint,
  validatePrerequisiteConstraint,
};
