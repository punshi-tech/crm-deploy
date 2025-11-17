const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/employee_register", userController.employeeRegister);
router.post("/employee_login", userController.employeeLogin);
router.post("/client_register", userController.clientRegister);
router.post("/client_login", userController.clientLogin);

router.post("/refresh_token", userController.refreshTokenFunction);

module.exports = router;
