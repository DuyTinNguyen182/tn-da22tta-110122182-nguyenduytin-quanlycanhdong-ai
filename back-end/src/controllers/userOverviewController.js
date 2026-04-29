const getCurrentSeasonInfo = async (req, res) => {
  try {
    const info = await userOverviewService.getCurrentSeasonInfo(req.user);
    res.json(info || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const userOverviewService = require("../services/userOverviewService");

const getDashboardOptions = async (req, res) => {
  try {
    const options = await userOverviewService.getDashboardOptions(req.user);
    res.json(options);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStatistics = async (req, res) => {
  try {
    const statistics = await userOverviewService.getDashboardStatistics(req.query, req.user);
    res.json(statistics);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getDashboardOptions,
  getDashboardStatistics,
  getCurrentSeasonInfo,
};
