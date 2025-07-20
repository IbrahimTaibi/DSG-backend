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

async function generateNextInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const lastInvoice = await Invoice.findOne({
    invoiceNumber: { $regex: `^${prefix}` },
  }).sort({ invoiceNumber: -1 });
  let nextNumber = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/INV-\d{4}-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  return `${prefix}${String(nextNumber).padStart(5, "0")}`;
}

async function generateMissingInvoices() {
  try {
    console.log("Starting to generate missing invoices...");

    // Find all delivered orders
    const deliveredOrders = await Order.find({ status: "delivered" });
    console.log(`Found ${deliveredOrders.length} delivered orders`);

    let generatedCount = 0;
    let skippedCount = 0;

    for (const order of deliveredOrders) {
      // Check if invoice already exists
      const existingInvoice = await Invoice.findOne({ order: order._id });

      if (existingInvoice) {
        console.log(
          `Order ${order._id}: Invoice already exists (${existingInvoice.invoiceNumber})`,
        );
        skippedCount++;
        continue;
      }

      console.log(`Order ${order._id}: Generating invoice...`);

      try {
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

        const invoiceNumber = await generateNextInvoiceNumber();
        const invoice = new Invoice({
          order: order._id,
          products,
          subtotal,
          totalTax,
          total: subtotal + totalTax,
          customer: {
            id: order.store._id,
            name: order.store.name,
            email: order.store.email,
            address: order.address || order.store.address,
          },
          invoiceNumber,
          issuedAt: new Date(),
          status: "issued",
        });

        await invoice.save();
        console.log(
          `Order ${order._id}: Successfully created invoice ${invoiceNumber}`,
        );
        generatedCount++;
      } catch (error) {
        console.error(
          `Order ${order._id}: Error creating invoice:`,
          error.message,
        );
      }
    }

    console.log(`\nSummary:`);
    console.log(`- Total delivered orders: ${deliveredOrders.length}`);
    console.log(`- Invoices generated: ${generatedCount}`);
    console.log(`- Invoices skipped (already exist): ${skippedCount}`);
  } catch (error) {
    console.error("Error in generateMissingInvoices:", error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
generateMissingInvoices();
