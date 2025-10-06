const express = require('express');
const {
  getYearSections,
  createYearSection,
  updateYearSection,
  deleteYearSections,
} = require ("../controllers/yearSectionController");

const router = express.Router();

router.get("/", getYearSections);
router.post("/", createYearSection);
router.put("/:id", updateYearSection);
router.delete("/", deleteYearSections);

module.exports = router;
