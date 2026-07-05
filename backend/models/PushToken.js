const mongoose = require("mongoose");

const PushTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: ["ios", "android", "web"],
      default: "android",
    },
    deviceId: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// One token per user+device combination
PushTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

module.exports = mongoose.model("PushToken", PushTokenSchema);
