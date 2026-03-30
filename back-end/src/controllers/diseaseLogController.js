const diseaseLogService = require("../services/diseaseLogService");

const getAll = async (req, res) => {
  try {
    const logs = await diseaseLogService.getDiseaseLogs(req.query, req.user);
    res.json(logs);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const log = await diseaseLogService.createDiseaseLog(req.body, req.user.id);
    res.status(201).json(log);
  } catch (error) {
    console.error("Create Disease Log Error:", error);
    res.status(400).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const log = await diseaseLogService.updateDiseaseLog(req.params.id, req.body, req.user);
    res.json(log);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const log = await diseaseLogService.updateDiseaseLogStatus(
      req.params.id,
      req.body,
      req.user
    );
    res.json(log);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    await diseaseLogService.deleteDiseaseLog(req.params.id, req.user);
    res.json({ message: "Đã xóa nhật ký bệnh" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAll,
  create,
  update,
  updateStatus,
  remove,
};
