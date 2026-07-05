const mongoose = require("mongoose");

const TransactionAuditLogSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    event: {
      type: String,
      enum: [
        "created",
        "payment_success",
        "payment_failed",
        "refund_initiated",
        "refund_completed",
      ],
      required: true,
    },
    previousStatus: {
      type: String,
      default: "",
    },
    newStatus: {
      type: String,
      required: true,
    },
    actor: {
      id: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        enum: ["user", "admin", "system", "gateway"],
        default: "user",
      },
    },
    ipAddress: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false } // No updatedAt is required for immutable logs
);

// Compound index for finding transaction history
TransactionAuditLogSchema.index({ transactionId: 1, timestamp: -1 });

// ─── Immutability Enforcement ────────────────────────────────────────────────
// Prevent modifications, deletes, and overrides at the mongoose adapter layer

const preventMutation = function (next) {
  next(new Error("Database Error: Transaction audit logs are immutable. No modifications or deletions are allowed."));
};

TransactionAuditLogSchema.pre("save", function (next) {
  if (!this.isNew) {
    return next(new Error("Database Error: Cannot modify an existing transaction audit log document."));
  }
  next();
});

TransactionAuditLogSchema.pre("updateOne", preventMutation);
TransactionAuditLogSchema.pre("findOneAndUpdate", preventMutation);
TransactionAuditLogSchema.pre("updateMany", preventMutation);
TransactionAuditLogSchema.pre("deleteOne", preventMutation);
TransactionAuditLogSchema.pre("deleteMany", preventMutation);
TransactionAuditLogSchema.pre("remove", preventMutation);
TransactionAuditLogSchema.pre("findOneAndDelete", preventMutation);
TransactionAuditLogSchema.pre("findOneAndRemove", preventMutation);

module.exports = mongoose.model("TransactionAuditLog", TransactionAuditLogSchema);
