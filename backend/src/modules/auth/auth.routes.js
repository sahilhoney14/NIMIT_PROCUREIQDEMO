const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const { validateLogin } = require("./auth.validation");
const { loginRateLimiter } = require("../../middleware/security.middleware");

router.get("/login", authController.renderLogin);
router.post("/login", loginRateLimiter, validateLogin, authController.login);
router.get("/verify", authController.verify);
router.post("/refresh", authController.refresh);
router.get("/logout", authController.logout);
router.post("/logout", authController.logout);

module.exports = router;
