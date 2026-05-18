const adminDashboardService = require("../services/adminDashboardService");

const getDashboard = async (req, res) => {
  try {
    const { seasonId = "" } = req.query;
    const dashboard = await adminDashboardService.getDashboardData(seasonId);
    return res.status(200).json(dashboard);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboard,
};
