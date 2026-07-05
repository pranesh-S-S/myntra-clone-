const { Expo } = require("expo-server-sdk");
const PushToken = require("../models/PushToken");
const NotificationQueue = require("../models/NotificationQueue");
const NotificationLog = require("../models/NotificationLog");

const expo = new Expo();

const MAX_NOTIFICATIONS_PER_DAY = 10;
const MAX_ATTEMPTS = 3;

// ─── Public API: Enqueue a notification ──────────────────────────────────────

async function enqueue(userId, type, title, body, data = {}, scheduledFor = null) {
  const job = await NotificationQueue.create({
    userId,
    type,
    title,
    body,
    data,
    status: "pending",
    scheduledFor: scheduledFor || new Date(), // null = immediate
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
  });
  console.log(`[NotificationService] Enqueued ${type} notification for user ${userId}, job ${job._id}`);
  return job;
}

// ─── Rate Limit Check ────────────────────────────────────────────────────────

async function isRateLimited(userId) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await NotificationLog.countDocuments({
    userId,
    sentAt: { $gte: twentyFourHoursAgo },
  });
  return count >= MAX_NOTIFICATIONS_PER_DAY;
}

// ─── Send to Expo Push Service ───────────────────────────────────────────────

async function sendToExpo(tokens, title, body, data = {}) {
  const messages = [];

  for (const pushToken of tokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.warn(`[NotificationService] Invalid Expo push token: ${pushToken}`);
      continue;
    }
    messages.push({
      to: pushToken,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
    });
  }

  if (messages.length === 0) {
    return { tickets: [], errors: [] };
  }

  // Chunk messages (Expo recommends max 100 per request)
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  const errors = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("[NotificationService] Expo send error:", error);
      errors.push(error.message);
    }
  }

  return { tickets, errors };
}

// ─── Process Queue: Poll and send pending jobs ───────────────────────────────

async function processQueue() {
  const now = new Date();

  // Find jobs that are ready to process:
  // 1. Pending jobs where scheduledFor <= now
  // 2. Failed jobs where nextRetryAt <= now and attempts < maxAttempts
  const jobs = await NotificationQueue.find({
    $or: [
      {
        status: "pending",
        scheduledFor: { $lte: now },
      },
      {
        status: "failed",
        nextRetryAt: { $lte: now },
        $expr: { $lt: ["$attempts", "$maxAttempts"] },
      },
    ],
  }).limit(50); // Process max 50 jobs per cycle

  if (jobs.length === 0) return;

  console.log(`[NotificationService] Processing ${jobs.length} queued notifications`);

  for (const job of jobs) {
    try {
      // Mark as processing
      job.status = "processing";
      job.attempts += 1;
      job.lastAttemptAt = now;
      await job.save();

      // Check rate limit
      if (await isRateLimited(job.userId)) {
        job.status = "cancelled";
        job.error = "Rate limited: exceeded max notifications per day";
        await job.save();
        console.log(`[NotificationService] Job ${job._id} cancelled: rate limited`);
        continue;
      }

      // Get active push tokens for this user
      const tokenDocs = await PushToken.find({
        userId: job.userId,
        isActive: true,
      });

      if (tokenDocs.length === 0) {
        job.status = "cancelled";
        job.error = "No active push tokens for user";
        await job.save();
        console.log(`[NotificationService] Job ${job._id} cancelled: no tokens`);
        continue;
      }

      const tokens = tokenDocs.map((t) => t.token);

      // Send via Expo
      const { tickets, errors } = await sendToExpo(
        tokens,
        job.title,
        job.body,
        { ...job.data, notificationId: job._id.toString() }
      );

      if (errors.length > 0 && tickets.length === 0) {
        // Total failure
        throw new Error(errors.join("; "));
      }

      // Extract receipt IDs from successful tickets
      const receiptIds = tickets
        .filter((t) => t.id)
        .map((t) => t.id);

      // Check for immediate ticket errors (e.g., DeviceNotRegistered)
      for (let i = 0; i < tickets.length; i++) {
        if (tickets[i].status === "error") {
          const errDetail = tickets[i].details;
          if (errDetail && errDetail.error === "DeviceNotRegistered") {
            // Immediately deactivate this token
            await PushToken.findOneAndUpdate(
              { token: tokens[i] },
              { isActive: false }
            );
            console.log(`[NotificationService] Deactivated token: ${tokens[i]}`);
          }
        }
      }

      // Mark as sent
      job.status = "sent";
      job.expoReceiptIds = receiptIds;
      job.error = null;
      await job.save();

      // Log for rate limiting
      await NotificationLog.create({
        userId: job.userId,
        notificationId: job._id,
        type: job.type,
        title: job.title,
        sentAt: new Date(),
      });

      console.log(`[NotificationService] Job ${job._id} sent successfully`);
    } catch (error) {
      console.error(`[NotificationService] Job ${job._id} failed:`, error.message);

      job.error = error.message;

      if (job.attempts >= job.maxAttempts) {
        job.status = "failed";
        console.log(`[NotificationService] Job ${job._id} permanently failed after ${job.attempts} attempts`);
      } else {
        // Schedule retry with exponential backoff
        // Backoff: 2^attempt * 30 seconds (30s, 120s, 480s)
        const backoffMs = Math.pow(2, job.attempts) * 30 * 1000;
        job.status = "failed";
        job.nextRetryAt = new Date(Date.now() + backoffMs);
        console.log(`[NotificationService] Job ${job._id} scheduled for retry at ${job.nextRetryAt}`);
      }

      await job.save();
    }
  }
}

// ─── Check Expo Push Receipts ────────────────────────────────────────────────

async function checkReceipts() {
  // Find recently sent notifications that have receipt IDs
  const recentJobs = await NotificationQueue.find({
    status: "sent",
    expoReceiptIds: { $exists: true, $ne: [] },
    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).limit(100);

  if (recentJobs.length === 0) return;

  // Collect all receipt IDs
  const allReceiptIds = [];
  const receiptToJob = new Map();

  for (const job of recentJobs) {
    for (const rid of job.expoReceiptIds) {
      allReceiptIds.push(rid);
      receiptToJob.set(rid, job);
    }
  }

  // Chunk receipt IDs and fetch from Expo
  const chunks = expo.chunkPushNotificationReceiptIds(allReceiptIds);

  for (const chunk of chunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      for (const [receiptId, receipt] of Object.entries(receipts)) {
        if (receipt.status === "error") {
          console.warn(`[NotificationService] Receipt error for ${receiptId}:`, receipt.message);

          if (receipt.details && receipt.details.error === "DeviceNotRegistered") {
            // Find the token associated with this receipt and deactivate it
            const job = receiptToJob.get(receiptId);
            if (job) {
              // We don't know which exact token, but we can look at the user's tokens
              // For safety, log the error on the job
              console.log(`[NotificationService] DeviceNotRegistered for job ${job._id}, user ${job.userId}`);
              // Deactivate all tokens for this user that may be invalid
              // In production, you'd correlate token to receipt more precisely
            }
          }
        }
      }

      // Clear processed receipt IDs from jobs
      for (const job of recentJobs) {
        job.expoReceiptIds = [];
        await job.save();
      }
    } catch (error) {
      console.error("[NotificationService] Receipt check error:", error);
    }
  }
}

// ─── Cart Abandonment Scanner ────────────────────────────────────────────────

async function scanCartAbandonment() {
  const Bag = require("../models/Bag");
  const Order = require("../models/Order");

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  try {
    // Find users who have bag items updated more than 2 hours ago
    const bagItems = await Bag.aggregate([
      {
        $group: {
          _id: "$userId",
          lastActivity: { $max: "$updatedAt" },
          itemCount: { $sum: 1 },
        },
      },
      {
        $match: {
          lastActivity: { $lte: twoHoursAgo },
          itemCount: { $gt: 0 },
        },
      },
    ]);

    for (const entry of bagItems) {
      const userId = entry._id;

      // Check if we already sent a cart abandonment notification recently (last 24h)
      const recentNotif = await NotificationQueue.findOne({
        userId,
        type: "cart_abandonment",
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      if (recentNotif) continue; // Already notified

      // Check if user placed an order recently
      const recentOrder = await Order.findOne({
        userId,
        createdAt: { $gte: twoHoursAgo },
      });

      if (recentOrder) continue; // User already ordered

      // Enqueue cart abandonment notification
      await enqueue(
        userId,
        "cart_abandonment",
        "You left items in your bag! 🛍️",
        `You have ${entry.itemCount} item(s) waiting in your bag. Complete your purchase before they're gone!`,
        { screen: "bag" }
      );

      console.log(`[NotificationService] Cart abandonment notification scheduled for user ${userId}`);
    }
  } catch (error) {
    console.error("[NotificationService] Cart abandonment scan error:", error);
  }
}

module.exports = {
  enqueue,
  processQueue,
  checkReceipts,
  scanCartAbandonment,
  isRateLimited,
  sendToExpo,
};
