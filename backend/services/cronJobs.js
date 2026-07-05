const cron = require("node-cron");
const notificationService = require("./notificationService");

function startCronJobs() {
  console.log("[CronJobs] Starting notification cron jobs...");

  // ─── Process Queue: every 30 seconds ─────────────────────────────────────
  // Polls for pending/retry-ready notifications and sends them
  cron.schedule("*/30 * * * * *", async () => {
    try {
      await notificationService.processQueue();
    } catch (error) {
      console.error("[CronJobs] processQueue error:", error);
    }
  });
  console.log("[CronJobs] ✅ Queue processor: every 30 seconds");

  // ─── Check Receipts: every 5 minutes ─────────────────────────────────────
  // Fetches Expo push receipts, detects invalid tokens
  cron.schedule("*/5 * * * *", async () => {
    try {
      await notificationService.checkReceipts();
    } catch (error) {
      console.error("[CronJobs] checkReceipts error:", error);
    }
  });
  console.log("[CronJobs] ✅ Receipt checker: every 5 minutes");

  // ─── Cart Abandonment Scanner: every hour ────────────────────────────────
  // Finds users with stale bag items and schedules reminder notifications
  cron.schedule("0 * * * *", async () => {
    try {
      await notificationService.scanCartAbandonment();
    } catch (error) {
      console.error("[CronJobs] scanCartAbandonment error:", error);
    }
  });
  console.log("[CronJobs] ✅ Cart abandonment scanner: every hour");
}

module.exports = { startCronJobs };
