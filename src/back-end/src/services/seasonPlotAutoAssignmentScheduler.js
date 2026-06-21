const {
  autoAssignActivePlotsForCurrentSeason,
} = require("./seasonPlotAutoAssignmentService");

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

let schedulerTimer = null;

const runAutoAssignment = async () => {
  try {
    const result = await autoAssignActivePlotsForCurrentSeason();

    if (result.didRun) {
      console.log(
        `Tu dong gan thua vao mua vu: them ${result.createdCount}, kich hoat lai ${result.reactivatedCount}, bo qua ${result.skippedCount}.`,
      );
    }
  } catch (error) {
    console.error("Loi tu dong gan thua vao mua vu:", error.message);
  }
};

const startSeasonPlotAutoAssignmentScheduler = () => {
  if (schedulerTimer) {
    return;
  }

  runAutoAssignment();
  schedulerTimer = setInterval(runAutoAssignment, ONE_HOUR_IN_MS);

  if (typeof schedulerTimer.unref === "function") {
    schedulerTimer.unref();
  }
};

module.exports = startSeasonPlotAutoAssignmentScheduler;
