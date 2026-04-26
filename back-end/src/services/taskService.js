const Task = require("../models/taskModel");
const DiaryLog = require("../models/diaryLogModel");
const TaskDetail = require("../models/taskDetailModel");

const normalizeTaskOutput = (taskDoc) => {
  const task = taskDoc.toObject ? taskDoc.toObject() : { ...taskDoc };
  const name = (task.name || task.label || "").trim();
  const taskDetails = Array.isArray(task.taskDetails) ? task.taskDetails : [];

  return {
    _id: String(task._id),
    name,
    taskDetails: taskDetails
      .map((detail) => ({
        _id: String(detail._id),
        name: (detail.name || "").trim(),
        taskId: String(detail.task || task._id),
      }))
      .filter((detail) => detail.name),
    taskDetailCount: taskDetails.length,
    hasTaskDetails: taskDetails.length > 0,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
};

const normalizeName = (value) => String(value || "").trim();

const ensureUniqueName = async (name, excludeId = null) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = await Task.findOne({
    name: { $regex: new RegExp(`^${escapedName}$`, "i") },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();

  if (existing) {
    throw new Error("Tên công việc đã tồn tại");
  }
};

const getTasks = async () => {
  const [tasks, taskDetails] = await Promise.all([
    Task.find().sort({ name: 1 }),
    TaskDetail.find().sort({ name: 1 }).lean(),
  ]);

  const taskDetailsByTaskId = new Map();
  taskDetails.forEach((detail) => {
    const key = String(detail.task);
    if (!taskDetailsByTaskId.has(key)) {
      taskDetailsByTaskId.set(key, []);
    }
    taskDetailsByTaskId.get(key).push(detail);
  });

  return tasks
    .map((task) => {
      const nextTask = task.toObject ? task.toObject() : { ...task };
      nextTask.taskDetails = taskDetailsByTaskId.get(String(task._id)) || [];
      return normalizeTaskOutput(nextTask);
    })
    .filter((task) => task.name);
};

const createTask = async (payload = {}) => {
  const name = normalizeName(payload.name);
  if (!name) {
    throw new Error("Tên công việc là bắt buộc");
  }
  await ensureUniqueName(name);

  const created = await Task.create({ name });
  return normalizeTaskOutput(created);
};

const updateTask = async (id, payload = {}) => {
  const name = normalizeName(payload.name);
  if (!name) {
    throw new Error("Tên công việc là bắt buộc");
  }

  const task = await Task.findById(id);
  if (!task) {
    throw new Error("Không tìm thấy công việc");
  }

  await ensureUniqueName(name, id);
  task.name = name;
  await task.save();
  return normalizeTaskOutput(task);
};

const deleteTask = async (id) => {
  const task = await Task.findById(id).lean();
  if (!task) {
    throw new Error("Không tìm thấy công việc");
  }

  const inUseCount = await DiaryLog.countDocuments({ task: id });
  if (inUseCount > 0) {
    throw new Error("Không thể xóa công việc đang được sử dụng trong nhật ký");
  }

  const taskDetailCount = await TaskDetail.countDocuments({ task: id });
  if (taskDetailCount > 0) {
    throw new Error("Không thể xóa công việc đang có chi tiết công việc");
  }

  await Task.deleteOne({ _id: id });
  return { deletedId: id };
};

const resolveTaskId = async ({ taskId, task, taskName, title }) => {
  const directTaskId = taskId || task;

  if (directTaskId) {
    const foundTask = await Task.findById(directTaskId).lean();
    if (!foundTask) throw new Error("Mã công việc không hợp lệ");
    return String(foundTask._id);
  }

  const resolvedName = normalizeName(taskName || title);

  if (resolvedName) {
    const escapedName = resolvedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const foundTask = await Task.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${escapedName}$`, "i") } },
        { label: { $regex: new RegExp(`^${escapedName}$`, "i") } },
      ],
    }).lean();

    if (!foundTask) throw new Error("Tên công việc không hợp lệ");
    return String(foundTask._id);
  }

  throw new Error("Vui lòng cung cấp taskId");
};

module.exports = { getTasks, createTask, updateTask, deleteTask, resolveTaskId };
