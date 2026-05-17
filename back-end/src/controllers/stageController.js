const stageService = require("../services/stageService");

exports.getAll = async (req, res) => {
  try {
    const stages = await stageService.getAllStages();
    res.json(stages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const stage = await stageService.getStageById(req.params.id);
    res.json(stage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const stage = await stageService.createStage(req.body);
    res.status(201).json(stage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const stage = await stageService.updateStage(req.params.id, req.body);
    res.json(stage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await stageService.deleteStage(req.params.id);
    res.json({ message: "Đã xóa giai đoạn" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
