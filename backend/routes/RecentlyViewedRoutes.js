const express = require("express");
const mongoose = require("mongoose");
const RecentlyViewed = require("../models/RecentlyViewed");
const router = express.Router();

const MAX_ITEMS = 20;

// POST /recently-viewed/view
// Record a single product view. Atomic dedup + cap.
router.post("/view", async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ message: "userId and productId are required" });
    }

    const userOid = new mongoose.Types.ObjectId(userId);
    const productOid = new mongoose.Types.ObjectId(productId);
    const now = new Date();

    // Step 1: Remove any existing entry for this product (atomic per-document)
    await RecentlyViewed.findOneAndUpdate(
      { userId: userOid },
      { $pull: { items: { productId: productOid } } }
    );

    // Step 2: Push new entry, sort by viewedAt DESC, slice to MAX_ITEMS
    const doc = await RecentlyViewed.findOneAndUpdate(
      { userId: userOid },
      {
        $push: {
          items: {
            $each: [{ productId: productOid, viewedAt: now }],
            $sort: { viewedAt: -1 },
            $slice: MAX_ITEMS,
          },
        },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "View recorded", count: doc.items.length });
  } catch (error) {
    console.error("Error recording view:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// GET /recently-viewed/:userId
// Fetch the user's recently viewed list, populated with product details.
router.get("/:userId", async (req, res) => {
  try {
    const doc = await RecentlyViewed.findOne({
      userId: req.params.userId,
    }).populate("items.productId");

    if (!doc) {
      return res.status(200).json([]);
    }

    // Return items sorted most-recent-first (already sorted in DB, but ensure)
    const items = doc.items
      .filter((item) => item.productId != null) // filter out deleted products
      .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));

    res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching recently viewed:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// POST /recently-viewed/sync
// Login merge endpoint: merge local items with server items.
// Body: { userId, localItems: [{ productId, viewedAt }] }
router.post("/sync", async (req, res) => {
  try {
    const { userId, localItems } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const userOid = new mongoose.Types.ObjectId(userId);

    // Fetch existing server items
    const existingDoc = await RecentlyViewed.findOne({ userId: userOid });
    const serverItems = existingDoc ? existingDoc.items : [];

    // Merge algorithm: build map keyed by productId string
    const mergedMap = new Map();

    // Add server items first
    for (const item of serverItems) {
      const key = item.productId.toString();
      mergedMap.set(key, {
        productId: item.productId,
        viewedAt: new Date(item.viewedAt),
      });
    }

    // Merge local items: "most recent timestamp wins"
    const safeLocalItems = Array.isArray(localItems) ? localItems : [];
    for (const item of safeLocalItems) {
      if (!item.productId) continue;
      const key = item.productId.toString();
      const localTime = new Date(item.viewedAt || Date.now());

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        if (localTime > existing.viewedAt) {
          existing.viewedAt = localTime;
        }
      } else {
        mergedMap.set(key, {
          productId: new mongoose.Types.ObjectId(item.productId),
          viewedAt: localTime,
        });
      }
    }

    // Sort by viewedAt DESC, cap at MAX_ITEMS
    const mergedItems = Array.from(mergedMap.values())
      .sort((a, b) => b.viewedAt - a.viewedAt)
      .slice(0, MAX_ITEMS);

    // Atomic replace: overwrite the entire items array
    const updatedDoc = await RecentlyViewed.findOneAndUpdate(
      { userId: userOid },
      { $set: { items: mergedItems } },
      { upsert: true, new: true }
    ).populate("items.productId");

    const items = updatedDoc.items
      .filter((item) => item.productId != null)
      .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));

    res.status(200).json(items);
  } catch (error) {
    console.error("Error syncing recently viewed:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
