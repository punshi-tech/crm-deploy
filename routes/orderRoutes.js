const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middleware/authMiddleware");


// (((((((((((Original Route)))))))))))
// router.post("/preview_cart", authMiddleware, orderController.previewCart);


// ((((((((((((((Test Route))))))))))))))
router.post("/preview_cart", orderController.previewCart);

// ((((((((((Original Route))))))))))
router.post("/add_order", authMiddleware, orderController.addOrder);


// ((((((((((TestRoute))))))))))
// router.post("/add_order", orderController.addOrder);


// ((((((((((Original Route))))))))))
router.get("/get_orders", authMiddleware, orderController.getOrders);


router.patch("/track_order", authMiddleware, orderController.trackingOrder);
router.delete("/delete_order/:id", authMiddleware, orderController.deleteOrder);
module.exports = router;
