const express = require("express");
const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const router = express.Router();

// Helper to get or create cart
async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [], savedForLater: [] });
    await cart.save();
  }
  return cart;
}

// ─── GET /cart/:userId ───────────────────────────────────────────────────────
router.get("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const cart = await getOrCreateCart(userId);
    // Populate product details for items and saved list
    const populatedCart = await Cart.findById(cart._id)
      .populate("items.productId")
      .populate("savedForLater.productId");

    res.status(200).json(populatedCart);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Error fetching cart" });
  }
});

// ─── POST /cart/add ──────────────────────────────────────────────────────────
router.post("/add", async (req, res) => {
  try {
    const { userId, productId, size, quantity = 1 } = req.body;

    if (!userId || !productId || !size) {
      return res.status(400).json({ message: "userId, productId, and size are required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.isDiscontinued) {
      return res.status(400).json({ message: "Product has been discontinued" });
    }

    const cart = await getOrCreateCart(userId);

    // Check if item already exists in active items
    const existingIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && item.size === size
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        size,
        quantity,
        priceAtAdd: product.price,
        addedAt: new Date(),
      });
    }

    await cart.save();
    const populated = await cart.populate(["items.productId", "savedForLater.productId"]);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: "Error adding item to cart" });
  }
});

// ─── PUT /cart/update-quantity (Optimistic Locking) ─────────────────────────
router.put("/update-quantity", async (req, res) => {
  try {
    const { userId, productId, size, quantity, cartVersion, target } = req.body;

    if (!userId || !productId || !size || quantity === undefined || cartVersion === undefined) {
      return res.status(400).json({ message: "userId, productId, size, quantity, and cartVersion are required" });
    }

    // Find current cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Concurrency Check (Optimistic Locking Check)
    if (cart.__v !== parseInt(cartVersion)) {
      const populatedLatest = await Cart.findById(cart._id)
        .populate("items.productId")
        .populate("savedForLater.productId");

      return res.status(409).json({
        message: "Conflict: Cart was updated by another device. Please refresh.",
        latestCart: populatedLatest,
      });
    }

    // Determine target list: "items" or "savedForLater"
    const listKey = target === "saved" ? "savedForLater" : "items";

    const itemIndex = cart[listKey].findIndex(
      (item) => item.productId.toString() === productId && item.size === size
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Update quantity
    cart[listKey][itemIndex].quantity = quantity;
    
    // Force version increment for optimistic locking
    cart.increment();

    await cart.save();

    const populated = await cart.populate(["items.productId", "savedForLater.productId"]);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res.status(500).json({ message: "Error updating cart quantity" });
  }
});

// ─── DELETE /cart/remove ─────────────────────────────────────────────────────
router.delete("/remove", async (req, res) => {
  try {
    const { userId, productId, size, target } = req.body;

    if (!userId || !productId || !size) {
      return res.status(400).json({ message: "userId, productId, and size are required" });
    }

    const cart = await getOrCreateCart(userId);
    const listKey = target === "saved" ? "savedForLater" : "items";

    cart[listKey] = cart[listKey].filter(
      (item) => !(item.productId.toString() === productId && item.size === size)
    );

    await cart.save();
    const populated = await cart.populate(["items.productId", "savedForLater.productId"]);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error removing item from cart:", error);
    res.status(500).json({ message: "Error removing item" });
  }
});

// ─── POST /cart/save-for-later ───────────────────────────────────────────────
router.post("/save-for-later", async (req, res) => {
  try {
    const { userId, productId, size } = req.body;

    if (!userId || !productId || !size) {
      return res.status(400).json({ message: "userId, productId, and size are required" });
    }

    const cart = await getOrCreateCart(userId);

    // Find in active items
    const activeIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && item.size === size
    );

    if (activeIndex === -1) {
      return res.status(404).json({ message: "Item not found in active cart" });
    }

    const item = cart.items[activeIndex];

    // Remove from active
    cart.items.splice(activeIndex, 1);

    // Check if already in savedForLater
    const savedIndex = cart.savedForLater.findIndex(
      (s) => s.productId.toString() === productId && s.size === size
    );

    if (savedIndex > -1) {
      cart.savedForLater[savedIndex].quantity += item.quantity;
    } else {
      cart.savedForLater.push({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
        savedAt: new Date(),
      });
    }

    await cart.save();
    const populated = await cart.populate(["items.productId", "savedForLater.productId"]);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error moving to saved for later:", error);
    res.status(500).json({ message: "Error moving to Save for Later" });
  }
});

// ─── POST /cart/move-to-cart ─────────────────────────────────────────────────
router.post("/move-to-cart", async (req, res) => {
  try {
    const { userId, productId, size } = req.body;

    if (!userId || !productId || !size) {
      return res.status(400).json({ message: "userId, productId, and size are required" });
    }

    const cart = await getOrCreateCart(userId);

    // Find in saved list
    const savedIndex = cart.savedForLater.findIndex(
      (item) => item.productId.toString() === productId && item.size === size
    );

    if (savedIndex === -1) {
      return res.status(404).json({ message: "Item not found in saved list" });
    }

    const item = cart.savedForLater[savedIndex];

    // Remove from saved
    cart.savedForLater.splice(savedIndex, 1);

    // Check if already in active items
    const activeIndex = cart.items.findIndex(
      (a) => a.productId.toString() === productId && a.size === size
    );

    if (activeIndex > -1) {
      cart.items[activeIndex].quantity += item.quantity;
    } else {
      cart.items.push({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
        addedAt: new Date(),
      });
    }

    await cart.save();
    const populated = await cart.populate(["items.productId", "savedForLater.productId"]);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error moving item to active cart:", error);
    res.status(500).json({ message: "Error moving item to active cart" });
  }
});

// ─── POST /cart/validate-checkout ───────────────────────────────────────────
router.post("/validate-checkout", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(200).json({ valid: true, issues: [], cartVersion: cart?.__v || 0 });
    }

    const issues = [];
    const validItems = [];
    let cartModified = false;

    for (const item of cart.items) {
      const product = item.productId;

      // 1. Check Discontinued Status
      if (!product || product.isDiscontinued) {
        issues.push({
          productId: item.productId?._id || null,
          itemName: product?.name || "Discontinued Product",
          type: "discontinued",
          message: `"${product?.name || "Product"}" has been discontinued and removed from checkout.`,
        });

        // Automatically remove discontinued item from active items
        cart.items = cart.items.filter((i) => i._id.toString() !== item._id.toString());
        cartModified = true;
        continue;
      }

      // 2. Check Stock Availability
      if (product.stock === 0) {
        issues.push({
          productId: product._id,
          itemName: product.name,
          type: "out_of_stock",
          message: `"${product.name}" is completely out of stock.`,
        });
        continue;
      } else if (item.quantity > product.stock) {
        issues.push({
          productId: product._id,
          itemName: product.name,
          type: "stock_drift",
          message: `Requested quantity for "${product.name}" is ${item.quantity}, but only ${product.stock} are available. We've adjusted it to ${product.stock}.`,
          availableStock: product.stock,
        });

        // Adjust quantity to max available stock
        item.quantity = product.stock;
        cartModified = true;
      }

      // 3. Price Drift Check
      if (product.price !== item.priceAtAdd) {
        issues.push({
          productId: product._id,
          itemName: product.name,
          type: "price_changed",
          message: `Price of "${product.name}" changed from ₹${item.priceAtAdd} to ₹${product.price}.`,
          oldPrice: item.priceAtAdd,
          newPrice: product.price,
        });

        // Sync Snapshot price so next try works
        item.priceAtAdd = product.price;
        cartModified = true;
      }

      validItems.push(item);
    }

    if (cartModified) {
      await cart.save();
    }

    res.status(200).json({
      valid: issues.length === 0,
      issues,
      cartVersion: cart.__v,
      validItems,
    });
  } catch (error) {
    console.error("Error during checkout validation:", error);
    res.status(500).json({ message: "Checkout validation failed" });
  }
});

module.exports = router;
