 const express = require("express");
const { getDashboardStats, getUserReservationStats,getStudentReservationStats } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", getDashboardStats);
router.get("/:id", getUserReservationStats);
router.get("/:id/student", getStudentReservationStats);

module.exports = router; 
