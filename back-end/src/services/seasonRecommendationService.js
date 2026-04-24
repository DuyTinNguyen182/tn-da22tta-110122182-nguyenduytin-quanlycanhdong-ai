const Season = require("../models/seasonModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const DiseaseLog = require("../models/diseaseLogModel");
const SeasonRecommendation = require("../models/seasonRecommendationModel");

const buildObservedDiseaseMap = async (seasonIds = []) => {
  const normalizedSeasonIds = seasonIds.map((item) => String(item));
  if (normalizedSeasonIds.length === 0) {
    return new Map();
  }

  const seasonDetails = await SeasonDetail.find(
    { season: { $in: normalizedSeasonIds } },
    "_id season"
  ).lean();

  const seasonDetailToSeasonId = new Map(
    seasonDetails.map((item) => [String(item._id), String(item.season)])
  );

  const assignments =
    seasonDetails.length > 0
      ? await SeasonPlotAssignment.find(
          { seasonDetail: { $in: seasonDetails.map((item) => item._id) } },
          "_id seasonDetail"
        ).lean()
      : [];

  const assignmentToSeasonId = new Map(
    assignments
      .map((item) => {
        const seasonId = seasonDetailToSeasonId.get(String(item.seasonDetail));
        return seasonId ? [String(item._id), seasonId] : null;
      })
      .filter(Boolean)
  );

  const groupedDiseases = new Map();
  const touchDiseaseGroup = (seasonId, diseaseName, detectedAt) => {
    const normalizedName = (diseaseName || "").trim();
    if (!normalizedName) {
      return;
    }

    const diseaseKey = normalizedName.toLocaleLowerCase("vi");
    if (!groupedDiseases.has(seasonId)) {
      groupedDiseases.set(seasonId, new Map());
    }

    const seasonDiseaseMap = groupedDiseases.get(seasonId);
    const current = seasonDiseaseMap.get(diseaseKey) || {
      diseaseName: normalizedName,
      totalLogs: 0,
      latestDetectedAt: null,
    };

    current.totalLogs += 1;
    if (!current.latestDetectedAt || new Date(detectedAt) > new Date(current.latestDetectedAt)) {
      current.latestDetectedAt = detectedAt;
    }

    seasonDiseaseMap.set(diseaseKey, current);
  };

  if (assignmentToSeasonId.size > 0) {
    const logs = await DiseaseLog.find(
      { seasonPlotAssignments: { $in: Array.from(assignmentToSeasonId.keys()) } },
      "diseaseName detectedAt seasonPlotAssignments"
    ).lean();

    logs.forEach((log) => {
      const affectedSeasonIds = new Set(
        (log.seasonPlotAssignments || [])
          .map((assignmentId) => assignmentToSeasonId.get(String(assignmentId)))
          .filter(Boolean)
      );

      affectedSeasonIds.forEach((seasonId) => {
        touchDiseaseGroup(seasonId, log.diseaseName, log.detectedAt);
      });
    });
  }

  return new Map(
    Array.from(groupedDiseases.entries()).map(([seasonId, diseaseMap]) => [
      seasonId,
      Array.from(diseaseMap.values()).sort((a, b) => {
        if (b.totalLogs !== a.totalLogs) {
          return b.totalLogs - a.totalLogs;
        }
        return a.diseaseName.localeCompare(b.diseaseName, "vi");
      }),
    ])
  );
};

const getVisibleSeasonRecommendations = async () => {
  const recommendations = await SeasonRecommendation.find({ isVisible: true })
    .populate("season", "name isVisible")
    .sort({ updatedAt: -1 })
    .lean();

  return recommendations
    .filter((item) => item.season && item.season.isVisible !== false)
    .map((item) => ({
      _id: item._id,
      seasonId: item.season._id,
      seasonName: item.season.name,
      content: item.content,
      isVisible: item.isVisible,
      updatedAt: item.updatedAt,
    }));
};

const getAdminSeasonRecommendationOverview = async () => {
  const seasons = await Season.find().sort({ name: 1 }).lean();
  const recommendationDocs = await SeasonRecommendation.find().lean();
  const recommendationMap = new Map(
    recommendationDocs.map((item) => [String(item.season), item])
  );
  const observedDiseaseMap = await buildObservedDiseaseMap(seasons.map((item) => item._id));

  return seasons.map((season) => ({
    seasonId: season._id,
    seasonName: season.name,
    seasonVisible: season.isVisible !== false,
    recommendation: recommendationMap.get(String(season._id))
      ? {
          _id: recommendationMap.get(String(season._id))._id,
          content: recommendationMap.get(String(season._id)).content,
          isVisible: recommendationMap.get(String(season._id)).isVisible === true,
          updatedAt: recommendationMap.get(String(season._id)).updatedAt,
        }
      : null,
    observedDiseases: observedDiseaseMap.get(String(season._id)) || [],
  }));
};

const upsertSeasonRecommendation = async (seasonId, data) => {
  const season = await Season.findById(seasonId).lean();
  if (!season) {
    throw new Error("Không tìm thấy mùa vụ");
  }

  const content = (data?.content || "").trim();
  if (!content) {
    throw new Error("Nội dung khuyến cáo là bắt buộc");
  }

  const isVisible = data?.isVisible === true;

  const updated = await SeasonRecommendation.findOneAndUpdate(
    { season: seasonId },
    {
      season: seasonId,
      content,
      isVisible,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  )
    .populate("season", "name isVisible")
    .lean();

  return {
    _id: updated._id,
    seasonId: updated.season?._id || seasonId,
    seasonName: updated.season?.name || season.name,
    content: updated.content,
    isVisible: updated.isVisible,
    updatedAt: updated.updatedAt,
  };
};

module.exports = {
  getVisibleSeasonRecommendations,
  getAdminSeasonRecommendationOverview,
  upsertSeasonRecommendation,
};
