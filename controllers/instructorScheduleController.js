const { pool } = require('../db');

// Assign instructor to faculty
async function assignInstructor(req, res) {
  try {
    const { user_id, instructor_id } = req.body;

    if (!user_id || !instructor_id) {
      return res.status(400).json({ message: "Both user_id and instructor_id are required." });
    }

    // Check if this faculty already has an instructor
    const [userRows] = await pool.query(
      "SELECT * FROM instructor_schedule WHERE user_id = ?",
      [user_id]
    );
    if (userRows.length > 0) {
      return res.status(409).json({ message: "This faculty already has an assigned instructor." });
    }

    // Check if this instructor is already assigned to another faculty
    const [instructorRows] = await pool.query(
      "SELECT * FROM instructor_schedule WHERE instructor_id = ?",
      [instructor_id]
    );
    if (instructorRows.length > 0) {
      return res.status(409).json({ message: "This instructor is already assigned to another faculty." });
    }

    // New assignment
    const [result] = await pool.query(
      "INSERT INTO instructor_schedule (user_id, instructor_id) VALUES (?, ?)",
      [user_id, instructor_id]
    );

    return res.status(201).json({
      message: "Instructor assigned successfully!",
      instructor_schedule_id: result.insertId,
      user_id,
      instructor_id
    });
  } catch (err) {
    console.error("Error assigning instructor:", err);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
}

// Assign instructor to faculty
async function unAssignInstructor (req, res){
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "user_id is required" });
  }

  try {
    await pool.query(
      "DELETE FROM instructor_schedule WHERE user_id=?",
      [id]
    );
      return res.json({ message: "It's okay" });
    
  } catch (err) {
    console.error("Error assigning instructor:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get my assigned instructor for a faculty 
async function getMyAssignedInstructor (req, res){
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT i.instructor_name FROM instructor i 
      JOIN instructor_schedule isch
      ON i.instructor_id = isch.instructor_id
      WHERE isch.user_id = ?`, [id]
    );

    if (rows.length === 0) {
      return res.json({ message: "No instructor assigned yet" });
    }

    res.json(rows[0]); 
  } catch (err) {
    console.error("Error fetching assigned instructor:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  assignInstructor,
  unAssignInstructor,
  getMyAssignedInstructor,
};