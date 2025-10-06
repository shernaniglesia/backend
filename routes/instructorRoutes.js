const express = require('express');
const { getInstructors, createInstructor, updateInstructor, deleteInstructors } = 
require('../controllers/instructorController');

const router = express.Router();

router.get("/", getInstructors);
router.post("/", createInstructor);
router.put("/:id", updateInstructor);
router.delete("/", deleteInstructors);
 
module.exports = router;