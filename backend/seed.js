const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("./models/Product");
const Category = require("./models/Category");
const fs = require("fs");
const path = require("path");

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("Connected to MongoDB...");

    // Clear existing data
    await Product.deleteMany({});
    await Category.deleteMany({});
    console.log("Cleared existing products and categories.");

    // Load JSONs
    const productsData = JSON.parse(fs.readFileSync(path.join(__dirname, "product.json"), "utf8"));
    const categoriesData = JSON.parse(fs.readFileSync(path.join(__dirname, "category.json"), "utf8"));

    // Insert Products
    // We will clean the 'id' field to avoid confusion, or let Mongoose handle it
    const productsToInsert = productsData.map(({ id, ...rest }) => rest);
    const createdProducts = await Product.insertMany(productsToInsert);
    console.log(`Successfully seeded ${createdProducts.length} products.`);

    // Map categories productIds to newly created products
    // Since category.json contains hardcoded productIds, we will just assign the seeded product IDs dynamically
    const categoriesToInsert = categoriesData.map((category, index) => {
      // Just assign one of the seeded products to this category
      const assignedProduct = createdProducts[index % createdProducts.length];
      return {
        name: category.name,
        subcategory: category.subcategory,
        image: category.image,
        productId: [assignedProduct._id]
      };
    });

    const createdCategories = await Category.insertMany(categoriesToInsert);
    console.log(`Successfully seeded ${createdCategories.length} categories.`);

    await mongoose.disconnect();
    console.log("Seeding complete and disconnected.");
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seed();
