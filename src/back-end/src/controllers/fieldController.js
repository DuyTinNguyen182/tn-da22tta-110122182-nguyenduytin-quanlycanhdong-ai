const fieldService = require("../services/fieldService");

const create = async (req, res) => {
  try {
    const result = await fieldService.createField(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const options = {
      assignedOnly:
        req.query.assignedOnly === "true" || req.query.assignedOnly === "1",
      my: req.query.my === "true" || req.query.my === "1",
    };
    const fields = await fieldService.getAllFields(req.user, options);
    res.json(fields);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSummary = async (req, res) => {
  try {
    const summary = await fieldService.getFieldSummary(req.user);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await fieldService.updateField(id, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await fieldService.deleteField(id, req.user);
    res.json({ message: "Đã xóa thành công" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  create,
  getAll,
  getSummary,
  update,
  remove,
};
