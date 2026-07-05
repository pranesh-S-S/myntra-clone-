const mongoose = require("mongoose");

const NotificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotificationQueue",
    },
    type: {
      type: String,
      required: true,
    },
    title: String,
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for rate limit queries: "how many sent to this user in last 24h?"
NotificationLogSchema.index({ userId: 1, sentAt: -1 });

module.exports = mongoose.model("NotificationLog", NotificationLogSchema);
