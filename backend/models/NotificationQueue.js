const mongoose = require("mongoose");

const NotificationQueueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["order_status", "cart_abandonment", "promotional", "custom"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed", "cancelled"],
      default: "pending",
    },
    scheduledFor: {
      type: Date,
      default: null, // null = immediate
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    expoReceiptIds: {
      type: [String],
      default: [],
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient queue polling
NotificationQueueSchema.index({ status: 1, scheduledFor: 1 });
NotificationQueueSchema.index({ status: 1, nextRetryAt: 1 });

module.exports = mongoose.model("NotificationQueue", NotificationQueueSchema);
