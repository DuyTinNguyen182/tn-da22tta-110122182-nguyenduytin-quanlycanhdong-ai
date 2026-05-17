const Task = require("../models/taskModel");
const Stage = require("../models/stageModel");
const DiaryLog = require("../models/farmingLogModel");

const VALID_TASK_CATEGORIES = [
  "FERTILIZER",
  "PESTICIDE",
  "WATER",
  "LABOR",
  "SEED",
  "OTHER",
];

const normalizeTaskCategory = (category) => {
  if (!category) {
    return "OTHER";
  }

  const normalizedCategory = String(category).toUpperCase();
  if (!VALID_TASK_CATEGORIES.includes(normalizedCategory)) {
    throw new Error("Danh mục công việc không hợp lệ");
  }

  return normalizedCategory;
};

/**
 * Cycle Detection Algorithm (DFS)
 * Detects if there's a circular dependency in prerequisites
 *
 * @param {ObjectId} taskId - The task to check
 * @param {Array<ObjectId>} prerequisites - Direct prerequisites of the task
 * @param {Map} visited - Visited nodes
 * @param {Map} recStack - Recursion stack (for cycle detection)
 * @param {Map} allTaskPrerequisites - Cache of all task prerequisites
 * @returns {boolean} - true if cycle detected, false otherwise
 */
const detectCycleDFS = async (
  taskId,
  visited = new Map(),
  recStack = new Map(),
  allTaskPrerequisites = null
) => {
  const taskIdStr = String(taskId);

  // If not visited, mark as visited
  if (!visited.has(taskIdStr)) {
    visited.set(taskIdStr, true);
    recStack.set(taskIdStr, true);

    // Get prerequisites for this task
    if (!allTaskPrerequisites) {
      allTaskPrerequisites = new Map();
    }

    let prerequisites;
    if (allTaskPrerequisites.has(taskIdStr)) {
      prerequisites = allTaskPrerequisites.get(taskIdStr);
    } else {
      const task = await Task.findById(taskId).select("prerequisites").lean();
      prerequisites = (task?.prerequisites || []).map((p) => String(p));
      allTaskPrerequisites.set(taskIdStr, prerequisites);
    }

    // Recurse for each prerequisite
    for (const prereq of prerequisites) {
      const prereqStr = String(prereq);

      if (!visited.has(prereqStr)) {
        // Recursively check this prerequisite
        if (
          await detectCycleDFS(
            prereq,
            visited,
            recStack,
            allTaskPrerequisites
          )
        ) {
          return true;
        }
      } else if (recStack.has(prereqStr)) {
        // Back edge detected - cycle found!
        return true;
      }
    }
  }

  // Remove from recursion stack when backtracking
  recStack.delete(taskIdStr);
  return false;
};

/**
 * Validate prerequisites for circular dependencies
 *
 * @param {ObjectId} taskId - The task being created/updated
 * @param {Array<ObjectId>} prerequisites - The prerequisites to validate
 * @throws {Error} if circular dependency detected
 */
const validateNoCircularDependency = async (taskId, prerequisites = []) => {
  if (!prerequisites || prerequisites.length === 0) {
    return; // No prerequisites to validate
  }

  const hasCycle = await detectCycleDFS(taskId);
  if (hasCycle) {
    throw new Error(
      "Phát hiện vòng phụ thuộc trong các công việc tiên quyết. Một công việc không thể yêu cầu chính nó trực tiếp hoặc gián tiếp."
    );
  }
};

/**
 * Get all tasks with populated references
 */
const getTasks = async () => {
  try {
    const tasks = await Task.find()
      .sort({ order: 1 })
      .populate("stage", "name order")
      .populate({
        path: "prerequisites",
        select: "name order stage",
        populate: {
          path: "stage",
          select: "name order",
        },
      })
      .lean();

    return tasks;
  } catch (error) {
    throw new Error(`Không thể lấy danh sách công việc: ${error.message}`);
  }
};

/**
 * Get all tasks for a stage
 */
const getTasksByStage = async (stageId) => {
  try {
    const stage = await Stage.findById(stageId).lean();
    if (!stage) {
      throw new Error("Không tìm thấy giai đoạn");
    }

    const tasks = await Task.find({ stage: stageId })
      .sort({ order: 1 })
      .populate("prerequisites", "name order")
      .lean();

    return tasks;
  } catch (error) {
    throw new Error(`Không thể lấy danh sách công việc: ${error.message}`);
  }
};

/**
 * Get a task by ID
 */
const getTaskById = async (taskId) => {
  try {
    const task = await Task.findById(taskId)
      .populate("stage", "name order")
      .populate("prerequisites", "name order stage")
      .lean();

    if (!task) {
      throw new Error("Không tìm thấy công việc");
    }

    return task;
  } catch (error) {
    throw new Error(`Không thể lấy thông tin công việc: ${error.message}`);
  }
};

/**
 * Create a new task with circular dependency validation
 *
 * @param {Object} payload - Task data
 * @param {ObjectId} payload.stage - Stage ID
 * @param {string} payload.name - Task name
 * @param {number} payload.order - Task order
 * @param {boolean} payload.isRepeatable - Whether task is repeatable
 * @param {Array<ObjectId>} payload.prerequisites - Prerequisite task IDs
 * @throws {Error} if validation fails or circular dependency detected
 * @returns {Object} Created task
 */
const createTask = async (payload) => {
  try {
    let {
      stage,
      name,
      order,
      category,
      isRepeatable = true,
      prerequisites,
    } = payload;

    // Normalize prerequisites to array of IDs
    if (!prerequisites) {
      prerequisites = [];
    } else if (!Array.isArray(prerequisites)) {
      prerequisites = [prerequisites];
    } else {
      // Extract IDs from objects if needed (in case frontend sends {value, label} format)
      prerequisites = prerequisites.map((p) => (typeof p === "object" ? p.value || p._id : p));
    }

    // Validate required fields
    if (!stage) {
      throw new Error("Vui lòng cung cấp ID giai đoạn.");
    }

    if (!name || !name.trim()) {
      throw new Error("Vui lòng cung cấp tên công việc.");
    }

    if (typeof order !== "number" || order < 0) {
      throw new Error("Thứ tự công việc phải là một số không âm.");
    }

    const normalizedCategory = normalizeTaskCategory(category);

    // Verify stage exists
    const stageDoc = await Stage.findById(stage).lean();
    if (!stageDoc) {
      throw new Error("Giai đoạn tham chiếu không tồn tại.");
    }

    // Create temporary task to validate circular dependencies
    // The temporary ID is used for cycle detection
    const tempTask = new Task({
      stage,
      name: name.trim(),
      order,
      category: normalizedCategory,
      isRepeatable,
      prerequisites: prerequisites.map((p) => String(p)),
    });

    // Validate circular dependencies
    if (prerequisites && prerequisites.length > 0) {
      const hasCycle = await detectCycleDFS(tempTask._id);
      if (hasCycle) {
        throw new Error(
          "Phát hiện vòng phụ thuộc trong các công việc tiên quyết. Một công việc không thể yêu cầu chính nó trực tiếp hoặc gián tiếp."
        );
      }
    }

    // Check for duplicate task name within the same stage
    const existingTask = await Task.findOne({
      stage,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    }).lean();

    if (existingTask) {
      throw new Error(`Đã tồn tại công việc với tên "${name}" trong giai đoạn này`);
    }

    // Validate that all prerequisites exist and belong to same or previous stages
    if (prerequisites && prerequisites.length > 0) {
      const prereqTasks = await Task.find({
        _id: { $in: prerequisites },
      })
        .select("stage name")
        .lean();

      if (prereqTasks.length !== prerequisites.length) {
        throw new Error("Một hoặc nhiều công việc tiên quyết không tồn tại");
      }

      // Verify all prerequisites are valid Task IDs (optional: can enforce stage ordering)
      const invalidPrereqs = prerequisites.filter(
        (p) =>
          !prereqTasks.find(
            (task) => String(task._id) === String(p)
          )
      );

      if (invalidPrereqs.length > 0) {
        throw new Error("Các ID công việc tiên quyết không hợp lệ được cung cấp");
      }
    }

    // Save the task
    await tempTask.save();

    // Return populated task
    return await getTaskById(tempTask._id);
  } catch (error) {
    throw new Error(`Tạo công việc thất bại: ${error.message}`);
  }
};

/**
 * Update a task
 */
const updateTask = async (taskId, payload) => {
  try {
    const { stage, name, order, category, isRepeatable, prerequisites } = payload;

    const task = await Task.findById(taskId).lean();
    if (!task) {
      throw new Error("Không tìm thấy công việc");
    }

    const updateData = {};

    // Validate and update stage
    if (stage !== undefined) {
      const stageDoc = await Stage.findById(stage).lean();
      if (!stageDoc) {
        throw new Error("Giai đoạn tham chiếu không tồn tại.");
      }
      updateData.stage = stage;
    }

    // Validate and update name
    if (name !== undefined && name.trim()) {
      const existingTask = await Task.findOne({
        _id: { $ne: taskId },
        stage: stage || task.stage,
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      }).lean();

      if (existingTask) {
        throw new Error(`Đã tồn tại công việc với tên "${name}"`);
      }

      updateData.name = name.trim();
    }

    // Validate and update order
    if (order !== undefined && typeof order === "number" && order >= 0) {
      updateData.order = order;
    }

    if (category !== undefined) {
      updateData.category = normalizeTaskCategory(category);
    }

    // Validate and update isRepeatable
    if (isRepeatable !== undefined && typeof isRepeatable === "boolean") {
      updateData.isRepeatable = isRepeatable;
    }

    // Validate and update prerequisites
    if (prerequisites !== undefined) {
      // Normalize prerequisites to array of IDs
      let normalizedPrerequisites = prerequisites;
      if (!Array.isArray(normalizedPrerequisites)) {
        if (normalizedPrerequisites === null || normalizedPrerequisites === "") {
          normalizedPrerequisites = [];
        } else {
          normalizedPrerequisites = [normalizedPrerequisites];
        }
      } else {
        // Extract IDs from objects if needed (in case frontend sends {value, label} format)
        normalizedPrerequisites = normalizedPrerequisites.map((p) => 
          typeof p === "object" ? (p.value || p._id) : p
        );
      }

      if (normalizedPrerequisites.length > 0) {
        // Check for circular dependencies
        const hasCycle = await detectCycleDFS(taskId);
        if (hasCycle) {
          throw new Error(
            "Phát hiện vòng phụ thuộc trong các công việc tiên quyết. Một công việc không thể yêu cầu chính nó trực tiếp hoặc gián tiếp."
          );
        }

        // Verify all prerequisites exist
        const prereqTasks = await Task.find({
          _id: { $in: normalizedPrerequisites },
        })
          .select("_id")
          .lean();

        if (prereqTasks.length !== normalizedPrerequisites.length) {
          throw new Error("Một hoặc nhiều công việc tiên quyết không tồn tại");
        }
      }

      updateData.prerequisites = normalizedPrerequisites.map((p) => String(p));
    }

    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    return await getTaskById(updatedTask._id);
  } catch (error) {
    throw new Error(`Cập nhật công việc thất bại: ${error.message}`);
  }
};

/**
 * Delete a task
 */
const deleteTask = async (taskId) => {
  try {
    // Check if this task is a prerequisite for other tasks
    const dependentTasks = await Task.findOne({
      prerequisites: taskId,
    }).lean();

    if (dependentTasks) {
      throw new Error("Không thể xóa công việc vì nó là công việc tiên quyết của công việc khác");
    }

    // Check if any diary logs reference this task
    const diaryLogs = await DiaryLog.findOne({ task: taskId }).lean();
    if (diaryLogs) {
      throw new Error("Không thể xóa công việc vì đã có nhật ký liên quan");
    }

    const task = await Task.findByIdAndDelete(taskId).lean();
    if (!task) {
      throw new Error("Không tìm thấy công việc");
    }

    return task;
  } catch (error) {
    throw new Error(`Xóa công việc thất bại: ${error.message}`);
  }
};

/**
 * Get task dependency tree (for visualization/debugging)
 */
const getTaskDependencyTree = async (taskId) => {
  try {
    const task = await Task.findById(taskId)
      .populate("stage", "name")
      .populate({
        path: "prerequisites",
        select: "name stage order",
        populate: { path: "stage", select: "name" },
      })
      .lean();

    if (!task) {
      throw new Error("Không tìm thấy công việc");
    }

    return task;
  } catch (error) {
    throw new Error(`Không thể lấy cây phụ thuộc công việc: ${error.message}`);
  }
};

/**
 * Resolve a task from an id, name, or title-like input.
 * Falls back to a case-insensitive name lookup when no direct id is provided.
 */
const resolveTaskId = async ({ taskId, taskName, title }) => {
  const directValue = taskId || title;

  if (directValue) {
    const directTask = await Task.findById(directValue).lean();
    if (directTask) {
      return String(directTask._id);
    }
  }

  const candidateName = String(taskName || title || "").trim();
  if (candidateName) {
    const matchedTask = await Task.findOne({
      name: { $regex: new RegExp(`^${candidateName}$`, "i") },
    }).lean();

    if (matchedTask) {
      return String(matchedTask._id);
    }
  }

  throw new Error("Không tìm thấy công việc hợp lệ");
};

module.exports = {
  getTasks,
  getTasksByStage,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskDependencyTree,
  validateNoCircularDependency,
  detectCycleDFS,
  resolveTaskId,
};
