const express = require('express');
const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubjects,
} = require ("../controllers/subjectController");

const router = express.Router();

router.get("/", getSubjects);
router.post("/", createSubject);
router.put("/:id", updateSubject);
router.delete("/", deleteSubjects);

module.exports = router;