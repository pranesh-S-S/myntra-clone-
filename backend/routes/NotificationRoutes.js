const express = require("express");
const mongoose = require("mongoose");
const PushToken = require("../models/PushToken");
const NotificationQueue = require("../models/NotificationQueue");
const NotificationLog = require("../models/NotificationLog");
const notificationService = require("../services/notificationService");
const router = express.Router();

// ─── POST /notifications/register-token ──────────────────────────────────────
// Register a device push token for a user (supports multiple devices)
router.post("/register-token", async (req, res) => {
  try {
    const { userId, token, platform, deviceId } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ message: "userId and token are required" });
    }

    // Upsert: if token already exists for this user, just update it
    const doc = await PushToken.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), token },
      {
        userId: new mongoose.Types.ObjectId(userId),
        token,
        platform: platform || "android",
        deviceId: deviceId || "",
        isActive: true,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Token registered", tokenId: doc._id });
  } catch (error) {
    console.error("Error registering push token:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ─── DELETE /notifications/unregister-token ──────────────────────────────────
// Remove a specific device token
router.delete("/unregister-token", async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ message: "userId and token are required" });
    }

    await PushToken.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(userId),
      token,
    });

    res.status(200).json({ message: "Token unregistered" });
  } catch (error) {
    console.error("Error unregistering push token:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ─── GET /notifications/history/:userId ──────────────────────────────────────
// Get notification history for a user
router.get("/history/:userId", async (req, res) => {
  try {
    const logs = await NotificationLog.find({
      userId: req.params.userId,
    })
      .sort({ sentAt: -1 })
      .limit(50);

    res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching notification history:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ─── POST /notifications/send ────────────────────────────────────────────────
// Admin: manually send a notification to a user
router.post("/send", async (req, res) => {
  try {
    const { userId, type, title, body, data, scheduledFor } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ message: "userId, title, and body are required" });
    }

    const job = await notificationService.enqueue(
      userId,
      type || "custom",
      title,
      body,
      data || {},
      scheduledFor ? new Date(scheduledFor) : null
    );

    res.status(200).json({ message: "Notification queued", jobId: job._id });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ─── GET /notifications/queue-status ─────────────────────────────────────────
// Debug endpoint: view queue statistics
router.get("/queue-status", async (req, res) => {
  try {
    const counts = await NotificationQueue.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const stats = {};
    for (const c of counts) {
      stats[c._id] = c.count;
    }

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching queue status:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
