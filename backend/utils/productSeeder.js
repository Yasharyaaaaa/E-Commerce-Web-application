import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../models/product.model.js";
import connectDB from "../config/db.config.js";
import { redisClient, connectRedis } from "../config/redis.config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../env/.env") });

const seedProducts = async () => {
  try {
    await connectDB();

    // Clear existing products
    await Product.deleteMany();
    console.log("Existing products cleared");

    // Fetch products from DummyJSON
    console.log("Fetching products from dummyjson.com...");
    const response = await fetch("https://dummyjson.com/products");
    const data = await response.json();

    if (!data.products || !Array.isArray(data.products)) {
      throw new Error("Invalid data format from DummyJSON");
    }

    // Map DummyJSON products to our Product model.
    // DummyJSON prices are USD-scale; convert to realistic INR (~83x) since the
    // store charges in INR via Razorpay.
    const USD_TO_INR = 83;
    const mappedProducts = data.products.map((p) => ({
      name: p.title,
      description: p.description,
      price: Math.round(p.price * USD_TO_INR),
      category: p.category,
      stock: p.stock,
      image: p.thumbnail, // Using thumbnail as main image
    }));

    // Insert new products
    await Product.insertMany(mappedProducts);
    console.log(`Successfully seeded ${mappedProducts.length} products from DummyJSON!`);

    // Invalidate the products cache so the API doesn't keep serving a stale list.
    try {
      await connectRedis();
      if (redisClient.isOpen) {
        await redisClient.del("products:all");
        console.log("Cleared products:all cache");
        await redisClient.quit();
      }
    } catch (cacheError) {
      console.error("Cache invalidation skipped:", cacheError.message);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error seeding products:", error.message);
    process.exit(1);
  }
};

seedProducts();