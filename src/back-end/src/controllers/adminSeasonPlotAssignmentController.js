const adminSeasonPlotAssignmentService = require("../services/adminSeasonPlotAssignmentService");

const getActiveAssignments = async (req, res) => {
  try {
    const result =
      await adminSeasonPlotAssignmentService.getActiveSeasonPlotAssignments();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignPlots = async (req, res) => {
  try {
    const result = await adminSeasonPlotAssignmentService.assignPlotsToActiveSeason(
      req.body?.plotIds,
    );
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const removePlot = async (req, res) => {
  try {
    const result =
      await adminSeasonPlotAssignmentService.removePlotFromActiveSeason(
        req.params.plotId,
      );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getActiveAssignments,
  assignPlots,
  removePlot,
};
