const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const Plot = require("../models/plotModel");

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const processedSeasonIds = new Set();

const getDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  return `${partMap.get("year")}-${partMap.get("month")}-${partMap.get("day")}`;
};

const isSeasonActive = (seasonDoc, now = new Date()) => {
  if (!seasonDoc?.startDate) {
    return false;
  }

  const startDate = new Date(seasonDoc.startDate);
  const endDate = seasonDoc.endDate ? new Date(seasonDoc.endDate) : null;

  return startDate <= now && (!endDate || endDate >= now);
};

const isSeasonStartDateToday = (seasonDoc, now = new Date()) =>
  Boolean(seasonDoc?.startDate) && getDateKey(seasonDoc.startDate) === getDateKey(now);

const normalizeSeasonDoc = async (seasonOrId) => {
  if (!seasonOrId) {
    return null;
  }

  if (seasonOrId._id) {
    return seasonOrId;
  }

  return await SeasonDetail.findById(seasonOrId);
};

const autoAssignActivePlotsToSeason = async (seasonOrId, options = {}) => {
  const seasonDoc = await normalizeSeasonDoc(seasonOrId);

  if (!seasonDoc) {
    return {
      createdCount: 0,
      reactivatedCount: 0,
      skippedCount: 0,
      totalActivePlotCount: 0,
      didRun: false,
    };
  }

  const seasonId = String(seasonDoc._id);
  const now = options.now || new Date();

  if (!options.force && processedSeasonIds.has(seasonId)) {
    return {
      createdCount: 0,
      reactivatedCount: 0,
      skippedCount: 0,
      totalActivePlotCount: 0,
      didRun: false,
    };
  }

  if (!isSeasonActive(seasonDoc, now) || !isSeasonStartDateToday(seasonDoc, now)) {
    return {
      createdCount: 0,
      reactivatedCount: 0,
      skippedCount: 0,
      totalActivePlotCount: 0,
      didRun: false,
    };
  }

  const activePlots = await Plot.find({ status: "active" }).lean();
  const activePlotIds = activePlots.map((plot) => plot._id);

  if (activePlots.length === 0) {
    processedSeasonIds.add(seasonId);

    return {
      createdCount: 0,
      reactivatedCount: 0,
      skippedCount: 0,
      totalActivePlotCount: 0,
      didRun: true,
    };
  }

  const existingAssignments = await SeasonPlotAssignment.find({
    seasonDetail: seasonDoc._id,
    plot: { $in: activePlotIds },
  }).lean();
  const existingByPlotId = new Map(
    existingAssignments.map((item) => [String(item.plot), item]),
  );

  let createdCount = 0;
  const reactivatedCount = 0;
  let skippedCount = 0;

  const operations = activePlots.map((plot) => {
    const existingAssignment = existingByPlotId.get(String(plot._id));

    if (!existingAssignment) {
      createdCount += 1;
    } else {
      skippedCount += 1;
    }

    return {
      updateOne: {
        filter: {
          seasonDetail: seasonDoc._id,
          plot: plot._id,
        },
        update: {
          $setOnInsert: {
            seasonDetail: seasonDoc._id,
            plot: plot._id,
            field: plot.field,
            user: plot.user,
            status: "active",
          },
        },
        upsert: true,
      },
    };
  });

  await SeasonPlotAssignment.bulkWrite(operations, { ordered: false });
  processedSeasonIds.add(seasonId);

  return {
    createdCount,
    reactivatedCount,
    skippedCount,
    totalActivePlotCount: activePlots.length,
    didRun: true,
  };
};

const autoAssignActivePlotsForCurrentSeason = async () => {
  const now = new Date();
  const seasonDoc = await SeasonDetail.findOne({
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  }).sort({ startDate: -1, createdAt: -1 });

  if (!seasonDoc) {
    return {
      seasonDetailId: null,
      createdCount: 0,
      reactivatedCount: 0,
      skippedCount: 0,
      totalActivePlotCount: 0,
      didRun: false,
    };
  }

  const result = await autoAssignActivePlotsToSeason(seasonDoc, { now });

  return {
    seasonDetailId: String(seasonDoc._id),
    ...result,
  };
};

module.exports = {
  autoAssignActivePlotsForCurrentSeason,
  autoAssignActivePlotsToSeason,
  isSeasonActive,
  isSeasonStartDateToday,
};
