const mongoose = require("mongoose");

const announcementReadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    announcement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "announcement_reads",
    timestamps: true,
  }
);

announcementReadSchema.index({ user: 1, announcement: 1 }, { unique: true });
announcementReadSchema.index({ user: 1, readAt: -1 });

module.exports = mongoose.model("AnnouncementRead", announcementReadSchema);
