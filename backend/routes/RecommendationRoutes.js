const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const BrowsingHistory = require("../models/BrowsingHistory");
const Wishlist = require("../models/Wishlist");
const Order = require("../models/Order");
const Category = require("../models/Category");
const Product = require("../models/Product");

// ─── Config ──────────────────────────────────────────────────────────────────
const HISTORY_CAP = 50;          // Max unique views per user
const RECOMMENDATION_LIMIT = 12; // Products returned per recommendation call

// ─── POST /recommendations/track-view ────────────────────────────────────────
// Track a product view for a user, capping history to 50 unique entries.
// Uses upsert to refresh viewedAt instead of creating duplicates.
router.post("/track-view", async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "userId and productId are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid userId or productId" });
    }

    // Upsert: if viewed before, update viewedAt; otherwise insert fresh entry.
    await BrowsingHistory.findOneAndUpdate(
      { userId, productId },
      { viewedAt: new Date() },
      { upsert: true, new: true }
    );

    // Prune: keep only the 50 most recent entries by deleting the oldest.
    // Single indexed query: O(log N) lookup + O(1) delete by _id.
    const userHistory = await BrowsingHistory.find({ userId })
      .sort({ viewedAt: -1 })
      .select("_id")
      .lean();

    if (userHistory.length > HISTORY_CAP) {
      const idsToDelete = userHistory
        .slice(HISTORY_CAP)
        .map((h) => h._id);
      await BrowsingHistory.deleteMany({ _id: { $in: idsToDelete } });
    }

    res.status(200).json({ tracked: true });
  } catch (error) {
    console.error("Error tracking view:", error);
    res.status(500).json({ message: "Error tracking view" });
  }
});

// ─── GET /recommendations?userId=xxx ─────────────────────────────────────────
// Returns personalized "You May Also Like" recommendations.
//
// ALGORITHM (single-pass, no N+1 queries):
//   1. Batch-fetch all user signals (history, wishlist, orders) in parallel.
//   2. Collect a deduplicated set of interacted product IDs.
//   3. Find all categories containing any of those product IDs (1 query).
//   4. Score candidate products from those categories by signal type:
//      - Viewed: +1 score per category match
//      - Wishlisted: +2 score per category match (stronger signal)
//      - Purchased: +3 score per category match (strongest signal)
//   5. Filter out already-interacted products, sort by score descending.
//   6. Batch-fetch full product details for top candidates (1 query).
//   COLD-START: If no signals exist, fallback to popularity (most wishlisted).
//   SECONDARY COLD-START: If DB is empty, return newest available products.
router.get("/", async (req, res) => {
  try {
    const { userId, limit = RECOMMENDATION_LIMIT } = req.query;

    // ── Step 1: Batch-Fetch all user signals in parallel ──────────────────
    const [historyDocs, wishlistDocs, orderDocs] = await Promise.all([
      userId && mongoose.Types.ObjectId.isValid(userId)
        ? BrowsingHistory.find({ userId }).sort({ viewedAt: -1 }).limit(HISTORY_CAP).select("productId").lean()
        : Promise.resolve([]),
      userId && mongoose.Types.ObjectId.isValid(userId)
        ? Wishlist.find({ userId }).select("productId").lean()
        : Promise.resolve([]),
      userId && mongoose.Types.ObjectId.isValid(userId)
        ? Order.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("items.productId")
            .lean()
        : Promise.resolve([]),
    ]);

    // Flatten and build signal maps for scoring
    const viewedIds = historyDocs.map((h) => h.productId.toString());
    const wishlistIds = wishlistDocs.map((w) => w.productId.toString());
    const purchasedIds = orderDocs.flatMap((o) =>
      (o.items || []).map((i) => i.productId?.toString()).filter(Boolean)
    );

    // Deduplicated set of all interacted product IDs (to exclude from results)
    const allInteractedIds = new Set([...viewedIds, ...wishlistIds, ...purchasedIds]);

    // ── COLD-START CHECK ──────────────────────────────────────────────────
    if (allInteractedIds.size === 0) {
      return popularityFallback(res, parseInt(limit));
    }

    // ── Step 2: Find matching categories (batch query, no per-item loops) ─
    // One aggregation pipeline to find categories that contain any interacted product.
    const objectIdSet = [...allInteractedIds]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const matchedCategories = await Category.aggregate([
      {
        $match: {
          productId: { $in: objectIdSet },
        },
      },
      {
        $project: {
          productId: 1,
          _id: 0,
        },
      },
    ]);

    if (matchedCategories.length === 0) {
      return popularityFallback(res, parseInt(limit));
    }

    // ── Step 3: Score candidate products from matched categories ──────────
    // Collect all product IDs from matched categories
    const candidateIdSet = new Map(); // productId (string) -> score

    for (const category of matchedCategories) {
      for (const pid of (category.productId || [])) {
        const pidStr = pid.toString();
        if (allInteractedIds.has(pidStr)) continue; // Skip already-seen products

        const currentScore = candidateIdSet.get(pidStr) || 0;
        let addedScore = 0;

        // Check all signal types and assign weighted scores
        if (viewedIds.some((id) => {
          // A viewed product's category contributes +1 for each candidate in same cat
          return matchedCategories.some(
            (c) => c.productId.some((p) => p.toString() === id)
              && c.productId.some((p) => p.toString() === pidStr)
          );
        })) {
          addedScore = Math.max(addedScore, 1);
        }

        if (wishlistIds.some((id) => {
          return matchedCategories.some(
            (c) => c.productId.some((p) => p.toString() === id)
              && c.productId.some((p) => p.toString() === pidStr)
          );
        })) {
          addedScore = Math.max(addedScore, 2);
        }

        if (purchasedIds.some((id) => {
          return matchedCategories.some(
            (c) => c.productId.some((p) => p.toString() === id)
              && c.productId.some((p) => p.toString() === pidStr)
          );
        })) {
          addedScore = Math.max(addedScore, 3);
        }

        candidateIdSet.set(pidStr, currentScore + addedScore);
      }
    }

    // ── Step 4: Sort candidates by score and batch-fetch top N details ────
    const topCandidateIds = [...candidateIdSet.entries()]
      .sort((a, b) => b[1] - a[1]) // Sort by score descending
      .slice(0, parseInt(limit) * 2) // Fetch 2× limit in case some are discontinued
      .map(([id]) => new mongoose.Types.ObjectId(id));

    if (topCandidateIds.length === 0) {
      return popularityFallback(res, parseInt(limit));
    }

    // Single batch query for product details — no N+1 pattern
    const recommendations = await Product.find({
      _id: { $in: topCandidateIds },
      isDiscontinued: { $ne: true },
      stock: { $gt: 0 },
    })
      .select("name brand price discount images stock")
      .lean()
      .limit(parseInt(limit));

    // Preserve score-sort order (MongoDB $in doesn't guarantee order)
    const idOrder = new Map(topCandidateIds.map((id, i) => [id.toString(), i]));
    recommendations.sort(
      (a, b) => (idOrder.get(a._id.toString()) ?? 999) - (idOrder.get(b._id.toString()) ?? 999)
    );

    return res.status(200).json({
      source: "personalized",
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ message: "Error fetching recommendations" });
  }
});

// ─── Fallback: Popularity-Based (Cold-Start) ─────────────────────────────────
async function popularityFallback(res, limit) {
  try {
    // Aggregate wishlists to find most-wished active products
    const popular = await mongoose.model("Wishlist").aggregate([
      {
        $group: {
          _id: "$productId",
          wishlistCount: { $sum: 1 },
        },
      },
      { $sort: { wishlistCount: -1 } },
      { $limit: limit * 2 },
    ]);

    const popularIds = popular.map((p) => p._id);

    let products = [];
    if (popularIds.length > 0) {
      products = await Product.find({
        _id: { $in: popularIds },
        isDiscontinued: { $ne: true },
        stock: { $gt: 0 },
      })
        .select("name brand price discount images stock")
        .lean()
        .limit(limit);

      // Sort by wishlist count order
      const orderMap = new Map(popularIds.map((id, i) => [id.toString(), i]));
      products.sort(
        (a, b) => (orderMap.get(a._id.toString()) ?? 999) - (orderMap.get(b._id.toString()) ?? 999)
      );
    }

    // Secondary fallback: just newest products
    if (products.length === 0) {
      products = await Product.find({
        isDiscontinued: { $ne: true },
        stock: { $gt: 0 },
      })
        .sort({ createdAt: -1 })
        .select("name brand price discount images stock")
        .lean()
        .limit(limit);
    }

    return res.status(200).json({
      source: "popular", // Tells client this is a cold-start fallback
      count: products.length,
      recommendations: products,
    });
  } catch (error) {
    console.error("Popularity fallback error:", error);
    return res.status(500).json({ message: "Error fetching recommendations" });
  }
}

module.exports = router;
