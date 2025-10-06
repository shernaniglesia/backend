const express = require("express");
const {
  createSchedule,
  getSchedulesByRoom,
  getSchedulesByInstructor,
  getRoomTimetable,
  deleteMultipleSchedules,
  deleteOccurrence
} = require("../controllers/scheduleController");

const router = express.Router();

router.post("/", createSchedule);
router.get("/room/:roomId", getSchedulesByRoom);
router.get("/:facultyId", getSchedulesByInstructor);
router.get("/:roomId/timetable", getRoomTimetable);
router.delete("/", deleteMultipleSchedules);
router.delete("/:id/occurrence", deleteOccurrence);

module.exports = router;
