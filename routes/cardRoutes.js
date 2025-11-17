const express = require("express");
const router = express.Router();
const cardsController = require("../controllers/cardsController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/generate_card", authMiddleware, cardsController.generateCard);

router.post("/charge_card", authMiddleware, cardsController.chargeCard);

module.exports = router;
