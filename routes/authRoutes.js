const express = require('express');
const {
  signup,
  login,
  refresh,
  logout,
} = require ("../controllers/authController");
// const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Auth routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refresh);
// router.post("/logout", requireAuth, logout);
router.post("/logout", logout);
module.exports = router;
