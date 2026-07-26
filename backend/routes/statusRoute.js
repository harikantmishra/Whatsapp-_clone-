const express = require("express");
const statusController = require("../controller/statusController");
const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinary");

const router = express.Router();

// Protected routes
router.post("/",authMiddleware,multerMiddleware,statusController.createStatus);

router.get("/", authMiddleware, statusController.getStatus);

router.get("/:statusId/viewers", authMiddleware, statusController.getStatusViewers);

router.put("/:statusId/view", authMiddleware, statusController.viewStatus);

router.delete("/:statusId",authMiddleware,statusController.deleteStatus);

module.exports = router;
 
