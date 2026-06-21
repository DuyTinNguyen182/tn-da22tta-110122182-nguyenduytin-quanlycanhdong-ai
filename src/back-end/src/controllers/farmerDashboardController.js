const farmerDashboardService = require("../services/farmerDashboardService");

const getDashboard = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { seasonId = "" } = req.query;
    const dashboard = await farmerDashboardService.getFarmerDashboardData(
      userId,
      seasonId,
    );
    return res.status(200).json(dashboard);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { seasonId = "" } = req.query;

    const recommendations =
      await farmerDashboardService.getDailyRecommendations(userId, seasonId);

    return res.status(200).json(recommendations);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboard,
  getRecommendations,
};
