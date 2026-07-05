const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");
const Transaction = require("../models/Transaction");
const TransactionAuditLog = require("../models/TransactionAuditLog");
const Order = require("../models/Order");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_myntra_key_123";

// ─── GET /transactions ────────────────────────────────────────────────────────
// My Transactions listing page with cursor pagination & filtering
router.get("/", async (req, res) => {
  try {
    const { userId, status, paymentMode, startDate, endDate, limit = 10, cursor } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const query = { userId: new mongoose.Types.ObjectId(userId) };

    if (status) query.status = status;
    if (paymentMode) query.paymentMode = paymentMode;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Cursor pagination (createdAt_id format)
    if (cursor) {
      const [cursorTime, cursorId] = cursor.split("_");
      query.$or = [
        { createdAt: { $lt: new Date(cursorTime) } },
        {
          createdAt: new Date(cursorTime),
          _id: { $lt: new mongoose.Types.ObjectId(cursorId) },
        },
      ];
    }

    const parsedLimit = parseInt(limit);
    // Fetch limit + 1 to determine if there is a next page
    const list = await Transaction.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(parsedLimit + 1);

    const hasNextPage = list.length > parsedLimit;
    const items = hasNextPage ? list.slice(0, parsedLimit) : list;

    // Generate next cursor if there is a next page
    let nextCursor = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = `${lastItem.createdAt.toISOString()}_${lastItem._id}`;
    }

    res.status(200).json({
      items,
      nextCursor,
      hasNextPage,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ─── POST /transactions/webhook ──────────────────────────────────────────────
// Idempotent webhook processor to handle gateway callbacks
router.post("/webhook", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { webhookEventId, orderId, userId, amount, paymentMode, gatewayTransactionId, status } = req.body;

    if (!webhookEventId || !orderId || !userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "webhookEventId, orderId, and userId are required" });
    }

    // 1. Double check query (preventing slow duplicates)
    const existingTx = await Transaction.findOne({ webhookEventId }).session(session);
    if (existingTx) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({ received: true, message: "Duplicate webhook, already processed" });
    }

    // Generate Invoice ID
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = Math.random().toString(16).slice(2, 6).toUpperCase();
    const invoiceId = `INV-${today}-${randomHex}`;

    // 2. Insert transaction
    // Unique index on webhookEventId acts as a distributed lock under concurrent race conditions
    let transaction;
    try {
      transaction = new Transaction({
        userId: new mongoose.Types.ObjectId(userId),
        orderId: new mongoose.Types.ObjectId(orderId),
        paymentMode,
        amount,
        status: status || "Success",
        gatewayTransactionId,
        webhookEventId,
        invoiceId,
      });
      await transaction.save({ session });
    } catch (saveErr) {
      // MongoDB duplicate key error code 11000
      if (saveErr.code === 11000) {
        await session.abortTransaction();
        session.endSession();
        return res.status(200).json({ received: true, message: "Duplicate webhook, caught by database lock" });
      }
      throw saveErr;
    }

    // 3. Create Immutable Audit Log
    const audit = new TransactionAuditLog({
      transactionId: transaction._id,
      userId: transaction.userId,
      event: status === "Failed" ? "payment_failed" : "payment_success",
      previousStatus: "Pending",
      newStatus: transaction.status,
      actor: {
        id: gatewayTransactionId || "gateway_system",
        role: "gateway",
      },
      ipAddress: req.ip || "",
      metadata: { webhookPayload: req.body },
    });
    await audit.save({ session });

    // 4. Update order status if order exists
    if (status !== "Failed") {
      await Order.findByIdAndUpdate(
        orderId,
        { status: "Processing" },
        { session }
      );
    } else {
      await Order.findByIdAndUpdate(
        orderId,
        { status: "Cancelled" },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ received: true, message: "Webhook processed successfully", transactionId: transaction._id });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Webhook processing error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

// ─── GET /transactions/export ────────────────────────────────────────────────
// Streaming CSV export using Mongoose cursor
router.get("/export", async (req, res) => {
  try {
    const { userId, status, paymentMode } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required to export data" });
    }

    const query = { userId: new mongoose.Types.ObjectId(userId) };
    if (status) query.status = status;
    if (paymentMode) query.paymentMode = paymentMode;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=transactions_${Date.now()}.csv`);

    // Write CSV Headers
    res.write("Invoice ID,Date,Amount,Currency,Status,Payment Mode,Gateway ID\n");

    const cursor = Transaction.find(query)
      .sort({ createdAt: -1 })
      .cursor();

    cursor.on("data", (doc) => {
      // Sanitize fields to escape quotes/commas
      const sanitize = (val) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const row = [
        sanitize(doc.invoiceId),
        sanitize(doc.createdAt.toISOString()),
        sanitize(doc.amount),
        sanitize(doc.currency),
        sanitize(doc.status),
        sanitize(doc.paymentMode),
        sanitize(doc.gatewayTransactionId),
      ].join(",") + "\n";

      res.write(row);
    });

    cursor.on("end", () => {
      res.end();
    });

    cursor.on("error", (err) => {
      console.error("CSV Export cursor error:", err);
      res.write("\nError during export stream.");
      res.end();
    });
  } catch (error) {
    console.error("Export endpoint failed:", error);
    res.status(500).json({ message: "Failed to generate CSV export" });
  }
});

// ─── GET /transactions/receipt/token/:transactionId ──────────────────────────
// Generate signed signed JWT URL to securely download receipt with 15-minute expiry
router.get("/receipt/token/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;

    const tx = await Transaction.findById(transactionId);
    if (!tx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const token = jwt.sign(
      { transactionId: tx._id.toString() },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.status(200).json({
      token,
      downloadUrl: `http://localhost:5000/transactions/receipt/download?token=${token}`,
    });
  } catch (error) {
    console.error("Error generating receipt token:", error);
    res.status(500).json({ message: "Failed to generate receipt link" });
  }
});

// ─── GET /transactions/receipt/download ──────────────────────────────────────
// Decodes JWT, generates PDF dynamically, and streams directly to user
router.get("/receipt/download", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Bad Request: Token is missing");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).send("Unauthorized: Download link expired or invalid signature");
    }

    const tx = await Transaction.findById(decoded.transactionId).populate("userId");
    if (!tx) {
      return res.status(404).send("Transaction not found");
    }

    // Setup PDF Document Stream
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Receipt_${tx.invoiceId}.pdf`);

    doc.pipe(res);

    // Header styling
    doc
      .fillColor("#D01C53")
      .fontSize(24)
      .text("MYNTRA RECEIPT", { align: "right" });
    doc.fillColor("#000000").fontSize(10).text("Order Payment Invoice", { align: "right" });
    doc.moveDown(2);

    // Invoice Metadata Block
    doc.fontSize(12).text(`Invoice Number: ${tx.invoiceId}`);
    doc.text(`Invoice Date: ${tx.createdAt.toLocaleString()}`);
    doc.text(`Transaction Reference: ${tx.gatewayTransactionId || "N/A"}`);
    doc.text(`Payment Gateway: ${tx.paymentGateway}`);
    doc.moveDown(1.5);

    // Divider Line
    doc
      .strokeColor("#E0E0E0")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();
    doc.moveDown(1.5);

    // Billing Information
    doc.fontSize(14).text("Customer & Billing Info:", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`User Email: ${tx.userId?.email || "customer@myntra.com"}`);
    doc.text(`User ID: ${tx.userId?._id || "N/A"}`);
    doc.moveDown(1.5);

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(12).text("Description", 50, tableTop, { bold: true });
    doc.text("Status", 300, tableTop, { bold: true });
    doc.text("Mode", 400, tableTop, { bold: true });
    doc.text("Amount", 480, tableTop, { bold: true, align: "right" });
    doc.moveDown(0.5);

    doc
      .strokeColor("#E0E0E0")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();
    doc.moveDown(0.8);

    // Table Row Data
    const rowTop = doc.y;
    doc.text(`Shopping Checkout Order #${tx.orderId}`, 50, rowTop);
    doc.text(tx.status, 300, rowTop);
    doc.text(tx.paymentMode, 400, rowTop);
    doc.text(`₹${tx.amount.toFixed(2)}`, 480, rowTop, { align: "right" });

    doc.moveDown(2);

    // Total Amount Box
    doc
      .rect(350, doc.y, 200, 50)
      .fillAndStroke("#F9F9F9", "#D01C53");
    
    doc
      .fillColor("#000000")
      .fontSize(12)
      .text("Total Paid:", 370, doc.y - 40);
    
    doc
      .fillColor("#D01C53")
      .fontSize(16)
      .text(`₹${tx.amount.toFixed(2)}`, 430, doc.y - 43, { align: "right" });

    doc.moveDown(4);

    // Footer
    doc
      .fillColor("#888888")
      .fontSize(10)
      .text("This receipt was generated electronically and is valid without physical signature.", { align: "center" });
    doc.text("Thank you for shopping with Myntra!", { align: "center" });

    doc.end();
  } catch (error) {
    console.error("PDF Receipt generation failed:", error);
    if (!res.headersSent) {
      res.status(500).send("Error generating PDF invoice receipt");
    }
  }
});

module.exports = router;
