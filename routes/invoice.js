const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/invoiceController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

// Admin only: List all invoices, get by ID
router.get("/", auth, role("admin"), invoiceController.getAll);
router.get("/:id", auth, role("admin"), invoiceController.getById);
router.put("/:id", auth, role("admin"), invoiceController.update);
router.delete("/:id", auth, role("admin"), invoiceController.remove);

module.exports = router;
