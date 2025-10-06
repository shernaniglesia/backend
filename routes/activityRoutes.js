const express = require("express");
const { getActivityLogs, getUserActivity } = require("../controllers/activityController");

const router = express.Router();

router.get("/", getActivityLogs);
router.get("/:id", getUserActivity);

module.exports = router; 
