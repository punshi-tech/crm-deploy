const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/preview_cart", authMiddleware, orderController.previewCart);

router.post("/add_order", authMiddleware, orderController.addOrder);
router.get("/get_orders", authMiddleware, orderController.getOrders);
router.patch("/track_order", authMiddleware, orderController.trackingOrder);
router.delete("/delete_order/:id", authMiddleware, orderController.deleteOrder);
module.exports = router;
