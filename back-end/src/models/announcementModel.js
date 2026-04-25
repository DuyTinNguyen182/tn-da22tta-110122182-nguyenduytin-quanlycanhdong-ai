const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["notification", "warning"],
      required: true,
      default: "notification",
    },
    title: {
      type: String,
      required: true,
      trim: true,
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
    collection: "announcements",
    timestamps: true,
  }
);

module.exports = mongoose.model("Announcement", announcementSchema);
