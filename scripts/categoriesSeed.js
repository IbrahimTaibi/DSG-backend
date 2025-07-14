const mongoose = require("mongoose");
const Category = require("../models/category");
const slugify = require("slugify");

const MONGO_URI =
  "mongodb+srv://dsg00:Canibalixftw..1@dsgfinalversion.h6lso0p.mongodb.net/DSG?retryWrites=true&w=majority&appName=DSGFINALVERSION";

function makeCat(name, parent) {
  return {
    name,
    parent: parent || undefined,
    slug: slugify(name, { lower: true, strict: true }),
  };
}

async function seedCategories() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear existing categories
    await Category.deleteMany({});
    console.log("Cleared existing categories");

    // Create main categories (Level 1)
    const freshProduce = await Category.create(makeCat("Fresh Produce"));
    const dairyEggs = await Category.create(makeCat("Dairy & Eggs"));
    const meatSeafood = await Category.create(makeCat("Meat & Seafood"));
    const pantry = await Category.create(makeCat("Pantry"));
    const beverages = await Category.create(makeCat("Beverages"));
    const frozen = await Category.create(makeCat("Frozen Foods"));
    const bakery = await Category.create(makeCat("Bakery"));
    const snacks = await Category.create(makeCat("Snacks"));
    const household = await Category.create(makeCat("Household"));
    const personalCare = await Category.create(makeCat("Personal Care"));

    // Create subcategories (Level 2)
    // Fresh Produce subcategories
    const fruits = await Category.create(makeCat("Fruits", freshProduce._id));
    const vegetables = await Category.create(
      makeCat("Vegetables", freshProduce._id),
    );
    const herbs = await Category.create(
      makeCat("Fresh Herbs", freshProduce._id),
    );

    // Dairy & Eggs subcategories
    const milk = await Category.create(
      makeCat("Milk & Milk Alternatives", dairyEggs._id),
    );
    const cheese = await Category.create(makeCat("Cheese", dairyEggs._id));
    const yogurt = await Category.create(
      makeCat("Yogurt & Dairy Desserts", dairyEggs._id),
    );
    const eggs = await Category.create(makeCat("Eggs", dairyEggs._id));

    // Meat & Seafood subcategories
    const beef = await Category.create(makeCat("Beef", meatSeafood._id));
    const pork = await Category.create(makeCat("Pork", meatSeafood._id));
    const poultry = await Category.create(makeCat("Poultry", meatSeafood._id));
    const fish = await Category.create(
      makeCat("Fish & Seafood", meatSeafood._id),
    );

    // Pantry subcategories
    const grains = await Category.create(makeCat("Grains & Pasta", pantry._id));
    const canned = await Category.create(makeCat("Canned Goods", pantry._id));
    const condiments = await Category.create(
      makeCat("Condiments & Sauces", pantry._id),
    );
    const baking = await Category.create(
      makeCat("Baking Supplies", pantry._id),
    );
    const spices = await Category.create(
      makeCat("Spices & Seasonings", pantry._id),
    );

    // Beverages subcategories
    const softDrinks = await Category.create(
      makeCat("Soft Drinks", beverages._id),
    );
    const juices = await Category.create(
      makeCat("Juices & Smoothies", beverages._id),
    );
    const coffee = await Category.create(
      makeCat("Coffee & Tea", beverages._id),
    );
    const water = await Category.create(makeCat("Water", beverages._id));

    // Frozen Foods subcategories
    const frozenMeals = await Category.create(
      makeCat("Frozen Meals", frozen._id),
    );
    const frozenVegetables = await Category.create(
      makeCat("Frozen Vegetables", frozen._id),
    );
    const iceCream = await Category.create(
      makeCat("Ice Cream & Desserts", frozen._id),
    );

    // Bakery subcategories
    const bread = await Category.create(makeCat("Bread & Rolls", bakery._id));
    const pastries = await Category.create(
      makeCat("Pastries & Cakes", bakery._id),
    );
    const cookies = await Category.create(
      makeCat("Cookies & Biscuits", bakery._id),
    );

    // Snacks subcategories
    const chips = await Category.create(makeCat("Chips & Crisps", snacks._id));
    const nuts = await Category.create(makeCat("Nuts & Seeds", snacks._id));
    const candy = await Category.create(
      makeCat("Candy & Chocolate", snacks._id),
    );

    // Household subcategories
    const cleaning = await Category.create(
      makeCat("Cleaning Supplies", household._id),
    );
    const paper = await Category.create(
      makeCat("Paper & Plastic", household._id),
    );
    const laundry = await Category.create(
      makeCat("Laundry & Dish", household._id),
    );

    // Personal Care subcategories
    const hygiene = await Category.create(
      makeCat("Personal Hygiene", personalCare._id),
    );
    const beauty = await Category.create(
      makeCat("Beauty & Cosmetics", personalCare._id),
    );
    const health = await Category.create(
      makeCat("Health & Wellness", personalCare._id),
    );

    // Create Level 3 subcategories
    // Fruits subcategories
    await Category.create(makeCat("Apples & Pears", fruits._id));
    await Category.create(makeCat("Citrus Fruits", fruits._id));
    await Category.create(makeCat("Berries", fruits._id));
    await Category.create(makeCat("Tropical Fruits", fruits._id));

    // Vegetables subcategories
    await Category.create(makeCat("Leafy Greens", vegetables._id));
    await Category.create(makeCat("Root Vegetables", vegetables._id));
    await Category.create(makeCat("Tomatoes & Peppers", vegetables._id));
    await Category.create(makeCat("Onions & Garlic", vegetables._id));

    // Cheese subcategories
    await Category.create(makeCat("Hard Cheese", cheese._id));
    await Category.create(makeCat("Soft Cheese", cheese._id));
    await Category.create(makeCat("Shredded Cheese", cheese._id));

    // Grains & Pasta subcategories
    await Category.create(makeCat("Rice", grains._id));
    await Category.create(makeCat("Pasta", grains._id));
    await Category.create(makeCat("Bread & Cereal", grains._id));
    await Category.create(makeCat("Quinoa & Grains", grains._id));

    // Canned Goods subcategories
    await Category.create(makeCat("Canned Vegetables", canned._id));
    await Category.create(makeCat("Canned Fruits", canned._id));
    await Category.create(makeCat("Canned Beans", canned._id));
    await Category.create(makeCat("Canned Meat & Fish", canned._id));

    // Condiments & Sauces subcategories
    await Category.create(makeCat("Ketchup & Mustard", condiments._id));
    await Category.create(makeCat("Mayonnaise & Dressings", condiments._id));
    await Category.create(makeCat("Hot Sauces", condiments._id));
    await Category.create(makeCat("Soy Sauce & Asian", condiments._id));

    // Coffee & Tea subcategories
    await Category.create(makeCat("Coffee Beans & Ground", coffee._id));
    await Category.create(makeCat("Instant Coffee", coffee._id));
    await Category.create(makeCat("Tea Bags", coffee._id));
    await Category.create(makeCat("Herbal Tea", coffee._id));

    // Bread & Rolls subcategories
    await Category.create(makeCat("White Bread", bread._id));
    await Category.create(makeCat("Whole Wheat Bread", bread._id));
    await Category.create(makeCat("Buns & Rolls", bread._id));
    await Category.create(makeCat("Bagels", bread._id));

    // Chips & Crisps subcategories
    await Category.create(makeCat("Potato Chips", chips._id));
    await Category.create(makeCat("Tortilla Chips", chips._id));
    await Category.create(makeCat("Popcorn", chips._id));
    await Category.create(makeCat("Pretzels", chips._id));

    // Cleaning Supplies subcategories
    await Category.create(makeCat("All-Purpose Cleaners", cleaning._id));
    await Category.create(makeCat("Bathroom Cleaners", cleaning._id));
    await Category.create(makeCat("Kitchen Cleaners", cleaning._id));
    await Category.create(makeCat("Floor Cleaners", cleaning._id));

    // Personal Hygiene subcategories
    await Category.create(makeCat("Soap & Body Wash", hygiene._id));
    await Category.create(makeCat("Shampoo & Conditioner", hygiene._id));
    await Category.create(makeCat("Toothpaste & Dental", hygiene._id));
    await Category.create(makeCat("Deodorant", hygiene._id));

    console.log("Categories seeded successfully!");
    console.log("Created hierarchical grocery categories with 3+ levels");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding categories:", error);
    process.exit(1);
  }
}

seedCategories();
