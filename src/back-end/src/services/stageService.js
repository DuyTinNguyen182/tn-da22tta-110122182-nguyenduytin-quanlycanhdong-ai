const Stage = require("../models/stageModel");

/**
 * Get all stages sorted by order
 */
const getAllStages = async () => {
  try {
    const stages = await Stage.find().sort({ order: 1 }).lean();
    return stages;
  } catch (error) {
    throw new Error(`Failed to retrieve stages: ${error.message}`);
  }
};

/**
 * Get a stage by ID
 */
const getStageById = async (stageId) => {
  try {
    const stage = await Stage.findById(stageId).lean();
    if (!stage) {
      throw new Error("Stage not found");
    }
    return stage;
  } catch (error) {
    throw new Error(`Failed to retrieve stage: ${error.message}`);
  }
};

/**
 * Create a new stage
 */
const createStage = async (payload) => {
  try {
    const { name, order } = payload;

    if (!name || !name.trim()) {
      throw new Error("Stage name is required");
    }

    if (typeof order !== "number" || order < 0) {
      throw new Error("Stage order must be a non-negative number");
    }

    // Check for duplicate name
    const existingStage = await Stage.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    }).lean();

    if (existingStage) {
      throw new Error(`Stage with name "${name}" already exists`);
    }

    const stage = new Stage({
      name: name.trim(),
      order,
    });

    await stage.save();
    return stage.toObject();
  } catch (error) {
    throw new Error(`Failed to create stage: ${error.message}`);
  }
};

/**
 * Update a stage
 */
const updateStage = async (stageId, payload) => {
  try {
    const { name, order } = payload;

    const updateData = {};
    if (name !== undefined && name.trim()) {
      // Check for duplicate name (excluding current stage)
      const existingStage = await Stage.findOne({
        _id: { $ne: stageId },
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      }).lean();

      if (existingStage) {
        throw new Error(`Stage with name "${name}" already exists`);
      }

      updateData.name = name.trim();
    }

    if (order !== undefined && typeof order === "number" && order >= 0) {
      updateData.order = order;
    }

    const stage = await Stage.findByIdAndUpdate(stageId, updateData, {
      new: true,
    }).lean();

    if (!stage) {
      throw new Error("Stage not found");
    }

    return stage;
  } catch (error) {
    throw new Error(`Failed to update stage: ${error.message}`);
  }
};

/**
 * Delete a stage
 */
const deleteStage = async (stageId) => {
  const Task = require("../models/taskModel");

  const dependentTasks = await Task.findOne({ stage: stageId }).lean();
  if (dependentTasks) {
    throw new Error("Không thể xóa giai đoạn vì còn công việc liên quan");
  }

  const stage = await Stage.findByIdAndDelete(stageId).lean();
  if (!stage) {
    throw new Error("Không tìm thấy giai đoạn");
  }

  return stage;
};

module.exports = {
  getAllStages,
  getStageById,
  createStage,
  updateStage,
  deleteStage,
};
