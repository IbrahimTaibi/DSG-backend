require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/order");
const Invoice = require("../models/invoice");
const Tax = require("../models/tax");

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateExistingInvoices() {
  try {
    console.log(
      "Starting to update existing invoices with correct TTC calculation...",
    );

    // Find all invoices
    const invoices = await Invoice.find({});
    console.log(`Found ${invoices.length} invoices to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const invoice of invoices) {
      try {
        // Get the order to recalculate
        const order = await Order.findById(invoice.order);
        if (!order) {
          console.log(`Invoice ${invoice._id}: Order not found, skipping`);
          skippedCount++;
          continue;
        }

        console.log(`Invoice ${invoice._id}: Updating calculation...`);

        // Populate products and store
        await order.populate({
          path: "products.product",
          populate: { path: "tax" },
        });
        await order.populate("store");

        let subtotal = 0;
        let totalTax = 0;
        const products = order.products.map((op) => {
          const taxRate = op.product.tax ? op.product.tax.rate : 0;
          const lineTotal = op.price * op.quantity; // This is already TTC
          const taxAmount =
            taxRate > 0 ? (lineTotal * taxRate) / (100 + taxRate) : 0;
          const lineSubtotal = lineTotal - taxAmount;
          subtotal += lineSubtotal;
          totalTax += taxAmount;
          return {
            product: op.product._id,
            name: op.product.name,
            quantity: op.quantity,
            price: op.price,
            tax: taxAmount, // Store tax amount as number
            total: lineTotal,
          };
        });

        // Update the invoice
        invoice.products = products;
        invoice.subtotal = subtotal;
        invoice.totalTax = totalTax;
        invoice.total = subtotal + totalTax;

        await invoice.save();
        console.log(`Invoice ${invoice._id}: Successfully updated`);
        updatedCount++;
      } catch (error) {
        console.error(`Invoice ${invoice._id}: Error updating:`, error.message);
      }
    }

    console.log(`\nSummary:`);
    console.log(`- Total invoices: ${invoices.length}`);
    console.log(`- Invoices updated: ${updatedCount}`);
    console.log(`- Invoices skipped: ${skippedCount}`);
  } catch (error) {
    console.error("Error in updateExistingInvoices:", error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
updateExistingInvoices();
