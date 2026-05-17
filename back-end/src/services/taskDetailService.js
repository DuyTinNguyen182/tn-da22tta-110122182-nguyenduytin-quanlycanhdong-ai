const DiaryLog = require("../models/farmingLogModel");
const Task = require("../models/taskModel");
const TaskDetail = require("../models/taskDetailModel");
const { resolveTaskId } = require("./taskService");

const normalizeName = (value) => String(value || "").trim();

const normalizeTaskDetailOutput = (taskDetailDoc) => {
  const taskDetail = taskDetailDoc.toObject ? taskDetailDoc.toObject() : { ...taskDetailDoc };
  const task = taskDetail.task || null;

  return {
    _id: String(taskDetail._id),
    name: normalizeName(taskDetail.name),
    taskId: task?._id ? String(task._id) : typeof task === "string" ? String(task) : "",
    taskName: task?.name || "",
    createdAt: taskDetail.createdAt,
    updatedAt: taskDetail.updatedAt,
  };
};

const ensureTaskExists = async (taskId) => {
  const task = await Task.findById(taskId).lean();
  if (!task) {
    throw new Error("Không tìm thấy công việc");
  }
  return task;
};

const ensureUniqueTaskDetailName = async (taskId, name, excludeId = null) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = await TaskDetail.findOne({
    task: taskId,
    name: { $regex: new RegExp(`^${escapedName}$`, "i") },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();

  if (existing) {
    throw new Error("Tên chi tiết công việc đã tồn tại trong công việc này");
  }
};

const getTaskDetails = async (filters = {}) => {
  const query = {};
  if (filters.taskId) {
    query.task = filters.taskId;
  }

  const taskDetails = await TaskDetail.find(query)
    .populate("task", "name")
    .sort({ name: 1, createdAt: -1 });

  return taskDetails.map(normalizeTaskDetailOutput).filter((item) => item.name);
};

const createTaskDetail = async (payload = {}) => {
  const name = normalizeName(payload.name);
  const taskId = payload.taskId || payload.task;

  if (!taskId) {
    throw new Error("Vui lòng chọn công việc cha");
  }
  if (!name) {
    throw new Error("Tên chi tiết công việc là bắt buộc");
  }

  await ensureTaskExists(taskId);
  await ensureUniqueTaskDetailName(taskId, name);

  const created = await TaskDetail.create({ task: taskId, name });
  const populated = await TaskDetail.findById(created._id).populate("task", "name");
  return normalizeTaskDetailOutput(populated);
};

const updateTaskDetail = async (id, payload = {}) => {
  const name = normalizeName(payload.name);
  const taskId = payload.taskId || payload.task;

  if (!taskId) {
    throw new Error("Vui lòng chọn công việc cha");
  }
  if (!name) {
    throw new Error("Tên chi tiết công việc là bắt buộc");
  }

  const existing = await TaskDetail.findById(id);
  if (!existing) {
    throw new Error("Không tìm thấy chi tiết công việc");
  }

  await ensureTaskExists(taskId);
  await ensureUniqueTaskDetailName(taskId, name, id);

  existing.task = taskId;
  existing.name = name;
  await existing.save();

  const populated = await TaskDetail.findById(existing._id).populate("task", "name");
  return normalizeTaskDetailOutput(populated);
};

const deleteTaskDetail = async (id) => {
  const taskDetail = await TaskDetail.findById(id).lean();
  if (!taskDetail) {
    throw new Error("Không tìm thấy chi tiết công việc");
  }

  const inUseCount = await DiaryLog.countDocuments({ taskDetail: id });
  if (inUseCount > 0) {
    throw new Error("Không thể xóa chi tiết công việc đang được sử dụng trong nhật ký");
  }

  await TaskDetail.deleteOne({ _id: id });
  return { deletedId: id };
};

const resolveTaskSelection = async ({
  taskId,
  task,
  taskDetailId,
  taskDetail,
  taskName,
  title,
}) => {
  const directTaskDetailId = taskDetailId || taskDetail;

  if (directTaskDetailId) {
    const foundTaskDetail = await TaskDetail.findById(directTaskDetailId)
      .populate("task", "name")
      .lean();

    if (!foundTaskDetail) {
      throw new Error("Mã chi tiết công việc không hợp lệ");
    }

    const directTaskId = taskId || task;
    if (
      directTaskId &&
      String(foundTaskDetail.task?._id || foundTaskDetail.task) !== String(directTaskId)
    ) {
      throw new Error("Chi tiết công việc không thuộc công việc đã chọn");
    }

    return {
      task: null,
      taskDetail: String(foundTaskDetail._id),
      taskId: String(foundTaskDetail.task?._id || foundTaskDetail.task),
      taskName: foundTaskDetail.task?.name || "",
      taskDetailName: foundTaskDetail.name || "",
    };
  }

  const resolvedTaskId = await resolveTaskId({
    taskId: taskId || task,
    taskName,
    title,
  });

  const taskDetailCount = await TaskDetail.countDocuments({ task: resolvedTaskId });
  if (taskDetailCount > 0) {
    throw new Error("Công việc này có chi tiết công việc, vui lòng chọn chi tiết phù hợp");
  }

  const foundTask = await Task.findById(resolvedTaskId).lean();

  return {
    task: String(foundTask._id),
    taskDetail: null,
    taskId: String(foundTask._id),
    taskName: foundTask.name || "",
    taskDetailName: "",
  };
};

module.exports = {
  createTaskDetail,
  deleteTaskDetail,
  getTaskDetails,
  normalizeTaskDetailOutput,
  resolveTaskSelection,
  updateTaskDetail,
};
