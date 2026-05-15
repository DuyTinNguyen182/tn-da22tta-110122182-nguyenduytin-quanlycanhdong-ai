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
    source: {
      type: String,
      enum: ["manual", "plot-task-warning"],
      default: "manual",
    },
    audience: {
      scope: {
        type: String,
        enum: ["all", "users"],
        default: "all",
      },
      userIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    deliveryChannels: [
      {
        type: String,
        enum: ["web", "email"],
      },
    ],
  },
  {
    collection: "announcements",
    timestamps: true,
  }
);

announcementSchema.index({
  isVisible: 1,
  "audience.scope": 1,
  "audience.userIds": 1,
  createdAt: -1,
});

module.exports = mongoose.model("Announcement", announcementSchema);
