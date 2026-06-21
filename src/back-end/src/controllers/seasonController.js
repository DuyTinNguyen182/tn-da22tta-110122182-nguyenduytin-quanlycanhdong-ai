const seasonService = require("../services/seasonService");

exports.getSeasons = async (req, res) => {
  try {
    const includeHidden =
      String(req.query.includeHidden || "").toLowerCase() === "true" &&
      (req.user?.role || "").toLowerCase() === "admin";

    const seasons = await seasonService.getSeasons({ includeHidden });
    res.json(seasons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSeasonById = async (req, res) => {
  try {
    const season = await seasonService.getSeasonById(req.params.id);
    if (!season) {
      return res.status(404).json({ message: "Không tìm thấy mùa vụ" });
    }

    res.json(season);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createSeason = async (req, res) => {
  try {
    const created = await seasonService.createSeason(req.body);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateSeason = async (req, res) => {
  try {
    const updated = await seasonService.updateSeason(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteSeason = async (req, res) => {
  try {
    await seasonService.deleteSeason(req.params.id);
    res.json({ message: "Đã xóa mùa vụ" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
