const mongoose = require("mongoose");

const BrowsingHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// ─── Index Strategy ──────────────────────────────────────────────────────────

// 1. Unique compound index: prevents duplicate entries per user+product pair.
//    On re-view, we upsert (update viewedAt) rather than insert.
BrowsingHistorySchema.index({ userId: 1, productId: 1 }, { unique: true });

// 2. Sort index for capping history to 50 most recent entries per user.
//    Enables efficient: find({ userId }).sort({ viewedAt: -1 }).limit(50)
BrowsingHistorySchema.index({ userId: 1, viewedAt: -1 });

// 3. TTL index: MongoDB background task automatically removes entries older
//    than 30 days. Zero application-level cleanup code required.
BrowsingHistorySchema.index(
  { viewedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
);

module.exports = mongoose.model("BrowsingHistory", BrowsingHistorySchema);
