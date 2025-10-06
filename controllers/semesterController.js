const { pool } = require('../db');

// List all semesters
async function listSemesters(_req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM sem_sy ORDER BY sem_sy_id DESC'
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching semesters' });
  }
}

// Get single semester
async function getSemester(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM sem_sy WHERE sem_sy_id=?', [id]);
    const sem = rows[0];
    if (!sem) return res.status(404).json({ message: 'Not found' });
    res.json(sem);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching semester' });
  }
}

// Get active semester
async function getActiveSemester(_req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT sem_sy_id, sem_sy_semester, sem_sy_school_year, sem_sy_start_date, sem_sy_end_date, sem_sy_status FROM sem_sy WHERE sem_sy_status = 1 LIMIT 1'
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'No active semester' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching active semester:', err);
    res.status(500).json({ message: 'Error fetching active semester' });
  }
}

// Create new semester
async function createSemester(req, res) {
  try {
    const { semester, school_year, start_date, end_date } = req.body;

    // validate fields
    if (!semester || !school_year || !start_date || !end_date) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const [result] = await pool.query(
      `INSERT INTO sem_sy (sem_sy_semester, sem_sy_school_year, sem_sy_start_date, sem_sy_end_date, sem_sy_status)
       VALUES (?, ?, ?, ?, 0)`,
      [semester, school_year, start_date, end_date]
    );

    res.json({ message: 'Semester created successfully', semester_id: result.insertId });
  } catch (err) {
    console.error('Error creating semester:', err);
    res.status(500).json({ message: 'Error creating semester' });
  }
}

// Update semester
async function updateSemester(req, res) {
  try {
    const { id } = req.params;
    const { semester, school_year, start_date, end_date } = req.body;
    await pool.query(
      'UPDATE sem_sy SET sem_sy_semester=?, sem_sy_school_year=?, sem_sy_start_date=?, sem_sy_end_date=? WHERE sem_sy_id=?',
      [semester, school_year, start_date, end_date, id]
    );

    res.json({ message: 'Semester updated successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error updating semester' });
  }
}

// Delete semester
async function deleteSemester(req, res) {
  try {
    if (req.query.ids) {
      const ids = req.query.ids.split(',').map(Number).filter(Boolean);
      if (!ids.length) return res.status(400).json({ message: 'Invalid ids' });
      await pool.query('DELETE FROM sem_sy WHERE sem_sy_id IN (?)', [ids]);
      return res.json({ message: `${ids.length} semester(s) deleted successfully` });
    }

    res.json({ message: 'Semester deleted successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error deleting semester' });
  }
}

// Set active semester
async function setActiveSemester(req, res) {
  try {
    const { id } = req.params;
    //Deactivate all
    await pool.query('UPDATE sem_sy SET sem_sy_status = 0');

    //Activate selected one
    await pool.query('UPDATE sem_sy SET sem_sy_status = 1 WHERE sem_sy_id = ?', [id]);

    res.json({ message: 'Active semester updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error setting active semester' });
  }
}

module.exports = {
  listSemesters,
  getSemester,
  createSemester,
  updateSemester,
  deleteSemester,
  setActiveSemester,
  getActiveSemester,
};