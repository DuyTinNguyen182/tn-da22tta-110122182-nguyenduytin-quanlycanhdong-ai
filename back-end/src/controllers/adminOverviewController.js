const adminOverviewService = require("../services/adminOverviewService");

const getOverview = async (req, res) => {
  try {
    const overview = await adminOverviewService.getAdminOverview(req.query, req.user);
    res.json(overview);
  } catch (error) {
    const statusCode = error.message?.includes("admin") ? 403 : 500;
    res.status(statusCode).json({ message: error.message });
  }
};

module.exports = {
  getOverview,
};
