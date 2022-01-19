const express = require("express");
const { check, validationResult } = require("express-validator/check");

const authController = require("../controllers/auth");

const router = express.Router();
// login
router.get("/login", authController.getLogin);
router.post("/login", authController.postLogin);

// logout
router.post("/logout", authController.postLogout);

// for signup
router.post("/signup", check("email").isEmail(), authController.postSignup);
router.get("/signup", authController.getSignup);

// for reset password

router.get("/reset", authController.getReset);
router.post("/reset", authController.postReset);

// new password

router.get("/reset/:token", authController.getNewPassword);
router.post("/new-password", authController.postNewPassword);

module.exports = router;
