const seasonDetailService = require("../services/seasonDetailService");

exports.getAllSeasonDetails = async (req, res) => {
  try {
    const seasons = await seasonDetailService.getAllSeasonDetails();
    res.json(seasons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getActiveSeasonDetail = async (req, res) => {
  try {
    const season = await seasonDetailService.getActiveSeasonDetail();
    res.json(season);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFarmerSeasonDetails = async (req, res) => {
  try {
    const seasons = await seasonDetailService.getFarmerSeasonDetails(req.user.id, req.query.fieldId);
    res.json(seasons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createSeasonDetail = async (req, res) => {
  try {
    const { seasonName, seasonId, seasonCode, startDate, endDate, status } =
      req.body;

    if (!seasonName && !seasonId && !seasonCode) {
      return res.status(400).json({
        message:
          "Vui lòng cung cấp seasonId (hoặc seasonName) để xác định mùa vụ",
      });
    }

    const payload = {
      seasonName,
      seasonId,
      seasonCode,
      startDate,
      endDate,
      status: status || "planned",
    };

    const season = await seasonDetailService.createSeasonDetail(payload);
    res.status(201).json(season);
  } catch (error) {
    console.error("Create season detail error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateSeasonDetail = async (req, res) => {
  try {
    const season = await seasonDetailService.updateSeasonDetail(
      req.params.id,
      req.body
    );
    res.json(season);
  } catch (error) {
    console.error("Update season detail error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.finishSeasonDetail = async (req, res) => {
  try {
    const season = await seasonDetailService.finishSeasonDetail(req.params.id);
    res.json(season);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteSeasonDetail = async (req, res) => {
  try {
    await seasonDetailService.deleteSeasonDetail(req.params.id);
    res.json({ message: "Đã xóa chi tiết mùa vụ" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
