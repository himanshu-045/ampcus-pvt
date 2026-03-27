const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { signup, login, logout, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests. Try again in 15 minutes." }
});

const signupRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2 }),
  body("email").trim().isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("Min 8 characters")
    .matches(/[A-Z]/).withMessage("Need uppercase")
    .matches(/[0-9]/).withMessage("Need a number")
    .matches(/[^A-Za-z0-9]/).withMessage("Need a special character"),
];

const loginRules = [
  body("email").trim().isEmail().normalizeEmail(),
  body("password").notEmpty().withMessage("Password required"),
];

router.post("/signup", limiter, signupRules, signup);
router.post("/login", limiter, loginRules, login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

module.exports = router;