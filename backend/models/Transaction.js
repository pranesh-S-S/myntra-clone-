const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    paymentGateway: {
      type: String,
      default: "Stripe",
    },
    paymentMode: {
      type: String,
      enum: ["Card", "UPI", "NetBanking", "Wallet", "COD"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["Pending", "Success", "Failed", "Refunded"],
      default: "Pending",
      required: true,
    },
    gatewayTransactionId: {
      type: String,
      default: "",
    },
    webhookEventId: {
      type: String,
      unique: true,
      sparse: true,
    },
    invoiceId: {
      type: String,
      unique: true,
      required: true,
    },
  },
  { timestamps: true }
);

// Index 1: Filtering by userId, status, paymentMode and sorting by date
TransactionSchema.index({ userId: 1, status: 1, paymentMode: 1, createdAt: -1 });

// Index 2: Efficient cursor-based pagination
TransactionSchema.index({ userId: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model("Transaction", TransactionSchema);
