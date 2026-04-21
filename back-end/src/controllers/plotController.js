const plotService = require("../services/plotService");

const getByField = async (req, res) => {
  try {
    const { fieldId } = req.query;
    if (!fieldId) {
      return res.status(400).json({ message: "Thiếu Field ID" });
    }

    const plots = await plotService.getPlotsByField(fieldId, req.user);
    res.json(plots);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const imageUrl = req.file?.path || "";
    const result = await plotService.createPlot(req.body, req.user.id, imageUrl);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const imageUrl = req.file?.path || null;
    const result = await plotService.updatePlot(id, req.body, req.user, imageUrl);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await plotService.deletePlot(id, req.user);
    res.json({ message: "Đã xóa thửa ruộng" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getByField, create, update, remove };
