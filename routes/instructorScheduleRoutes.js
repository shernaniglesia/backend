const express = require('express');
const {
  assignInstructor,
  unAssignInstructor,
  getMyAssignedInstructor,
} = require("../controllers/instructorScheduleController");

const router = express.Router();

router.post("/assign", assignInstructor);
router.delete("/unassign/:id", unAssignInstructor);
router.get("/:id", getMyAssignedInstructor);

module.exports = router;
