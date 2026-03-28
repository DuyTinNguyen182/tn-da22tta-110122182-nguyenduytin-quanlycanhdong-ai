const seasonDetailService = require("../services/seasonDetailService");

exports.getAllSeasonDetails = async (req, res) => {
  try {
    const seasons = await seasonDetailService.getAllSeasonDetails();
    res.json(seasons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSeasonDetailsByField = async (req, res) => {
  try {
    const seasons = await seasonDetailService.getSeasonDetailsByField(req.query.fieldId, req.user.id);
    res.json(seasons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createSeasonDetail = async (req, res) => {
  try {
    const { seasonName, seasonId, seasonCode, fieldId, startDate, plotIds } = req.body;

    if ((!seasonName && !seasonId && !seasonCode) || !fieldId) {
      return res.status(400).json({ message: "Vui lòng cung cấp seasonId (hoặc seasonName) và fieldId" });
    }

    const payload = {
      seasonName,
      seasonId,
      seasonCode,
      year: parseInt(req.body.year) || new Date().getFullYear(),
      fieldId,
      startDate,
      plotIds,
      status: req.body.status || "active",
    };

    const season = await seasonDetailService.createSeasonDetail(payload, req.user.id);
    res.status(201).json(season);
  } catch (error) {
    console.error("Create season detail error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateSeasonDetail = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.year) {
      payload.year = parseInt(payload.year);
    }

    const season = await seasonDetailService.updateSeasonDetail(req.params.id, payload, req.user.id);
    res.json(season);
  } catch (error) {
    console.error("Update season detail error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.finishSeasonDetail = async (req, res) => {
  try {
    const season = await seasonDetailService.finishSeasonDetail(req.params.id, req.user.id);
    res.json(season);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteSeasonDetail = async (req, res) => {
  try {
    await seasonDetailService.deleteSeasonDetail(req.params.id, req.user.id);
    res.json({ message: "Đã xóa chi tiết mùa vụ" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
