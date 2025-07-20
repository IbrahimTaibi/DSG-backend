const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerDocument = YAML.load("./openapi.yaml");
require("dotenv").config();

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "https://www.dsg-group-tunisie.com",
      "https://dsg-group-tunisie.com",
      "http://localhost:3000",
    ].filter(Boolean),
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan("dev"));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
});
app.use(limiter); // Rate limiting enabled globally. Tune per route for production if needed.

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const categoryRoutes = require("./routes/category");
app.use("/api/categories", categoryRoutes);

const productRoutes = require("./routes/product");
app.use("/api/products", productRoutes);

const orderRoutes = require("./routes/order");
app.use("/api/orders", orderRoutes);

const messageRoutes = require("./routes/message");
app.use("/api/messages", messageRoutes);

const userRoutes = require("./routes/user");
app.use("/api/users", userRoutes);

const reviewRoutes = require("./routes/review");
app.use("/api/reviews", reviewRoutes);

const taxRoutes = require("./routes/tax");
app.use("/api/taxes", taxRoutes);

const invoiceRoutes = require("./routes/invoice");
app.use("/api/invoices", invoiceRoutes);

const companyInfoRoutes = require("./routes/companyInfo");
app.use("/api/company", companyInfoRoutes);

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

module.exports = app;
