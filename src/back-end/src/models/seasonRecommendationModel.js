const mongoose = require("mongoose");

const seasonRecommendationSchema = new mongoose.Schema(
  {
    season: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
      unique: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    isVisible: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: "season_recommendations",
    timestamps: true,
  }
);

module.exports = mongoose.model("SeasonRecommendation", seasonRecommendationSchema);
