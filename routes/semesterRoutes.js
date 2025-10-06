const express = require('express');
const {
  listSemesters,
  getSemester,
  createSemester,
  updateSemester,
  deleteSemester,
  setActiveSemester,
  getActiveSemester
} = require('../controllers/semesterController');

const router = express.Router();

router.get('/', listSemesters);
router.get('/now', getActiveSemester);
router.get('/:id', getSemester);
router.post('/', createSemester);
router.put('/:id', updateSemester);
router.put('/:id/active', setActiveSemester);
router.delete('/', deleteSemester);
router.delete('/:id', deleteSemester);

module.exports = router;
