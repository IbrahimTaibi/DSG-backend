const express = require("express");
const router = express.Router();
const taxController = require("../controllers/taxController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

// Public: Get all taxes, get by id
router.get("/", taxController.getAll);
router.get("/:id", taxController.getById);

// Admin only: Create, update, delete
router.post("/", auth, role("admin"), taxController.create);
router.put("/:id", auth, role("admin"), taxController.update);
router.delete("/:id", auth, role("admin"), taxController.remove);

module.exports = router;
