const mongoose = require("mongoose");
const Product = require("../models/product");
const Category = require("../models/category");

const MONGO_URI =
  "mongodb+srv://dsg00:Canibalixftw..1@dsgfinalversion.h6lso0p.mongodb.net/DSG?retryWrites=true&w=majority&";

// Use Unsplash for more realistic placeholder images
const placeholderImages = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", // apples
  "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80", // milk
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", // chips
  "https://images.unsplash.com/photo-1464306076886-debca5e8a6b0?auto=format&fit=crop&w=400&q=80", // juice
  "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80", // baguette
  "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80", // eggs
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", // coffee
  "https://images.unsplash.com/photo-1464306076886-debca5e8a6b0?auto=format&fit=crop&w=400&q=80", // peas
  "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80", // toothpaste
  "https://images.unsplash.com/photo-1464306076886-debca5e8a6b0?auto=format&fit=crop&w=400&q=80", // detergent
];

const products = [
  {
    name: "Red Apples",
    description: "Fresh and juicy red apples.",
    price: 2.99,
    stock: 100,
    categorySlug: "fruits",
    image: placeholderImages[0],
  },
  {
    name: "Whole Milk",
    description: "1L bottle of whole milk.",
    price: 1.49,
    stock: 200,
    categorySlug: "milk-milk-alternatives",
    image: placeholderImages[1],
  },
  {
    name: "Potato Chips",
    description: "Crispy salted potato chips.",
    price: 1.99,
    stock: 150,
    categorySlug: "chips-crisps",
    image: placeholderImages[2],
  },
  {
    name: "Orange Juice",
    description: "Freshly squeezed orange juice.",
    price: 3.49,
    stock: 80,
    categorySlug: "juices-smoothies",
    image: placeholderImages[3],
  },
  {
    name: "Baguette",
    description: "Classic French baguette.",
    price: 2.0,
    stock: 60,
    categorySlug: "bread-rolls",
    image: placeholderImages[4],
  },
  {
    name: "Eggs (12 pack)",
    description: "Farm fresh eggs, pack of 12.",
    price: 2.5,
    stock: 90,
    categorySlug: "eggs",
    image: placeholderImages[5],
  },
  {
    name: "Ground Coffee",
    description: "Premium ground coffee, 250g.",
    price: 4.99,
    stock: 70,
    categorySlug: "coffee-tea",
    image: placeholderImages[6],
  },
  {
    name: "Frozen Peas",
    description: "Green peas, frozen, 500g.",
    price: 1.75,
    stock: 120,
    categorySlug: "frozen-vegetables",
    image: placeholderImages[7],
  },
  {
    name: "Toothpaste",
    description: "Minty fresh toothpaste, 100ml.",
    price: 2.2,
    stock: 110,
    categorySlug: "toothpaste-dental",
    image: placeholderImages[8],
  },
  {
    name: "Laundry Detergent",
    description: "Liquid laundry detergent, 2L.",
    price: 6.5,
    stock: 50,
    categorySlug: "laundry-dish",
    image: placeholderImages[9],
  },
];

async function seedProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Remove all products
    await Product.deleteMany({});
    console.log("Cleared existing products");

    // Find categories by slug
    const categories = await Category.find({});
    const catMap = {};
    categories.forEach((cat) => {
      catMap[cat.slug] = cat._id;
    });

    // Insert products
    for (const prod of products) {
      const category = catMap[prod.categorySlug];
      if (!category) {
        console.warn(
          `Category not found for product: ${prod.name} (slug: ${prod.categorySlug})`,
        );
        continue;
      }
      await Product.create({
        name: prod.name,
        description: prod.description,
        price: prod.price,
        stock: prod.stock,
        category,
        image: prod.image,
      });
      console.log(`Seeded product: ${prod.name}`);
    }

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    console.log("Product seeding complete!");
  } catch (err) {
    console.error("Error seeding products:", err);
    process.exit(1);
  }
}

seedProducts();
