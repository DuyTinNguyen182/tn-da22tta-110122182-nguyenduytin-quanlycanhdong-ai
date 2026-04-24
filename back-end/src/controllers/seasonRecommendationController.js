const seasonRecommendationService = require("../services/seasonRecommendationService");

exports.getVisibleRecommendations = async (_req, res) => {
  try {
    const recommendations = await seasonRecommendationService.getVisibleSeasonRecommendations();
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminOverview = async (_req, res) => {
  try {
    const recommendations =
      await seasonRecommendationService.getAdminSeasonRecommendationOverview();
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.upsertBySeason = async (req, res) => {
  try {
    const recommendation = await seasonRecommendationService.upsertSeasonRecommendation(
      req.params.seasonId,
      req.body
    );
    res.json(recommendation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
