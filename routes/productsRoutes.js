const express = require("express");
const router = express.Router();
const productsController = require("../controllers/productsController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const { route } = require("./userRoutes");
const upload = multer({ storage: multer.memoryStorage() });

// add Product ((((((((((Original Route))))))))))
// router.post(
//   "/add_product",
//   authMiddleware,
//   upload.fields([
//     { name: "mainImage", maxCount: 1 },
//     { name: "galleryImages", maxCount: 5 },
//   ]),
//   productsController.addProduct
// );


// add Product ((((((((((Test Route))))))))))
router.post(
  "/add_product",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 5 },
  ]),
  productsController.addProduct
);

// get (ALL or speciefic) proucts ((((((((((Original Route))))))))))
// router.get("/get_Products", authMiddleware, productsController.getProducts);


// get (ALL or speciefic) proucts ((((((((((Test Route))))))))))
router.get("/get_Products", productsController.getProducts);

// Delete Product
router.delete(
  "/delete_product/:id",
  authMiddleware,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 5 },
  ]),
  productsController.deleteProduct
);

router.patch(
  "/edit_product/:id",
  authMiddleware,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 5 },
  ]),
  productsController.editProduct
);

// New Routes ((((((((((In MAlaysia))))))))))
router.get("/get_product_by_id/:id", productsController.getProductById)



module.exports = router;
