const express = require("express");
const router = express.Router();
const companyInfoController = require("../controllers/companyInfoController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.get("/", companyInfoController.get);
router.put("/", auth, role("admin"), companyInfoController.update);

module.exports = router;
