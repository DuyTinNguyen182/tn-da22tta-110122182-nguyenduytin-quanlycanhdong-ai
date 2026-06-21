const adminDashboardService = require("../services/adminDashboardService");

const getDashboard = async (req, res) => {
  try {
    const dashboard = await adminDashboardService.getDashboardData(
      req.query.seasonId || "",
    );
    res.status(200).json(dashboard);
  } catch (error) {
    const statusCode = error.message?.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message });
  }
};

module.exports = {
  getDashboard,
};
