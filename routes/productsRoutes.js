const express = require("express");
const router = express.Router();
const productsController = require("../controllers/productsController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const { route } = require("./userRoutes");
const upload = multer({ storage: multer.memoryStorage() });

// add Product  (((((((((Original Route)))))))))
// router.post(
//   "/add_product",
//   authMiddleware,
//   upload.fields([
//     { name: "mainImage", maxCount: 1 },
//     { name: "galleryImages", maxCount: 5 },
//   ]),
//   productsController.addProduct
// );


// add Product  (((((((((Test Route)))))))))
router.post(
  "/add_product",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 5 },
  ]),
  productsController.addProduct
);

// get (ALL or speciefic) proucts (((((ORIGINAL ROUTE)))))
// router.get("/get_Products", authMiddleware, productsController.getProducts);



// ((((((TESTING ONE))))))
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

module.exports = router;
