const mongoose = require("mongoose");
const User = require("../models/user");
const Product = require("../models/product");
const Category = require("../models/category");
const Order = require("../models/order");
const Message = require("../models/message");
const slugify = require("slugify");

const MONGO_URI =
  "mongodb+srv://dsg00:Canibalixftw..1@dsgfinalversion.h6lso0p.mongodb.net/DSG?retryWrites=true&w=majority&appName=DSGFINALVERSION";

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // Delete all documents from all relevant collections
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Order.deleteMany({}),
    Message.deleteMany({}),
  ]);
  console.log("All collections wiped.");

  // Seed categories
  const catChips = await Category.create({
    name: "Chips",
    slug: slugify("Chips", { lower: true, strict: true }),
  });
  const catWater = await Category.create({
    name: "Water",
    slug: slugify("Water", { lower: true, strict: true }),
  });
  const catChocolat = await Category.create({
    name: "Chocolat",
    slug: slugify("Chocolat", { lower: true, strict: true }),
  });
  const catMiniCakes = await Category.create({
    name: "Mini Cakes",
    slug: slugify("Mini Cakes", { lower: true, strict: true }),
  });
  const catGroceries = await Category.create({
    name: "Groceries",
    slug: slugify("Groceries", { lower: true, strict: true }),
  });

  // Seed users
  const users = await User.insertMany([
    {
      name: "Admin User",
      mobile: "1000000000",
      password: "adminpass",
      email: "admin@example.com",
      role: "admin",
      address: "Admin HQ",
    },
    {
      name: "Store User",
      mobile: "2000000000",
      password: "storepass",
      email: "store@example.com",
      role: "store",
      address: "123 Main St",
    },
    {
      name: "Delivery Guy",
      mobile: "3000000000",
      password: "deliverypass",
      email: "delivery@example.com",
      role: "delivery",
      address: "456 Delivery Rd",
    },
  ]);

  // Seed products
  await Product.insertMany([
    {
      name: "Lays Classic",
      description: "Classic salted potato chips.",
      price: 2.5,
      stock: 100,
      category: catChips._id,
      image:
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Evian Water 1L",
      description: "Fresh mineral water bottle.",
      price: 1.2,
      stock: 200,
      category: catWater._id,
      image:
        "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Milka Chocolat",
      description: "Delicious milk chocolate bar.",
      price: 3.0,
      stock: 50,
      category: catChocolat._id,
      image:
        "https://images.unsplash.com/photo-1505250469679-203ad9ced0cb?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Mini Cakes Pack",
      description: "Assorted mini cakes for snacks.",
      price: 4.5,
      stock: 30,
      category: catMiniCakes._id,
      image:
        "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Grocery Basket",
      description: "Mixed groceries for your daily needs.",
      price: 20.0,
      stock: 10,
      category: catGroceries._id,
      image:
        "https://images.unsplash.com/photo-1464306076886-debca5e8a6b0?auto=format&fit=crop&w=400&q=80",
    },
  ]);

  console.log("Database seeded!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
