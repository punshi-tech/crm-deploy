const express = require("express");
const router = express.Router();
const categoriesController = require("../controllers/categoriesController.js");


// Get All Product Categories
router.get("/get_categories", categoriesController.getCategories)

module.exports = router;