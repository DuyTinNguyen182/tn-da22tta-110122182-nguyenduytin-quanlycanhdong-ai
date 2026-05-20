const adminProgressService = require("../services/adminProgressService");
const adminPlotStatisticsService = require("../services/adminPlotStatisticsService");

const getOverview = async (req, res) => {
  try {
    const overview = await adminProgressService.getAdminOverview(
      req.query,
      req.user,
    );
    res.json(overview);
  } catch (error) {
    const statusCode = error.message?.includes("admin") ? 403 : 500;
    res.status(statusCode).json({ message: error.message });
  }
};

const getPlotStatisticsOptions = async (_req, res) => {
  try {
    const options =
      await adminPlotStatisticsService.getAdminPlotStatisticsOptions();
    res.json(options);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPlotTaskStatistics = async (req, res) => {
  try {
    const statistics =
      await adminPlotStatisticsService.getAdminPlotTaskStatistics(
        req.query,
        req.user,
      );
    res.json(statistics);
  } catch (error) {
    const statusCode = error.message?.includes("admin") ? 403 : 400;
    res.status(statusCode).json({ message: error.message });
  }
};

const sendPlotTaskWarnings = async (req, res) => {
  try {
    const result = await adminPlotStatisticsService.sendPlotTaskWarnings(
      req.body,
      req.user,
    );
    res.json(result);
  } catch (error) {
    const statusCode = error.message?.includes("admin") ? 403 : 400;
    res.status(statusCode).json({ message: error.message });
  }
};

const getCurrentSeasonInfo = async (_req, res) => {
  try {
    const info = await adminProgressService.getCurrentSeasonInfo();
    res.json(info || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOverview,
  getPlotStatisticsOptions,
  getPlotTaskStatistics,
  sendPlotTaskWarnings,
  getCurrentSeasonInfo,
};
