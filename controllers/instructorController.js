const { pool } = require('../db');

// GET all instructors
async function getInstructors(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM instructor ORDER BY instructor_name ASC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching instructors:", err);
    res.status(500).json({ message: "Server error while fetching instructors" });
  }
};

// CREATE instructor
async function createInstructor(req, res) {
  const { instructor_name } = req.body;
  if (!instructor_name) {
    return res.status(400).json({ message: "Instructor name is required" });
  }
  try {
    await pool.query("INSERT INTO instructor (instructor_name) VALUES (?)", [instructor_name]);
    res.json({ message: "Instructor added successfully" });
  } catch (err) {
    console.error("Error creating instructor:", err);
    res.status(500).json({ message: "Server error while adding instructor" });
  }
};

// UPDATE instructor
async function updateInstructor(req, res) {
  const { id } = req.params;
  const { instructor_name } = req.body;
  if (!instructor_name) {
    return res.status(400).json({ message: "Instructor name is required" });
  }
  try {
    const [result] = await pool.query(
      "UPDATE instructor SET instructor_name = ? WHERE instructor_id = ?",
      [instructor_name, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Instructor not found" });
    }
    res.json({ message: "Instructor updated successfully" });
  } catch (err) {
    console.error("Error updating instructor:", err);
    res.status(500).json({ message: "Server error while updating instructor" });
  }
};

// DELETE multiple instructors
async function deleteInstructors(req, res) {
  const ids = req.query.ids?.split(",").map((id) => parseInt(id)) || [];
  if (ids.length === 0) {
    return res.status(400).json({ message: "No instructor IDs provided" });
  }
  try {
    const [result] = await pool.query(
      `DELETE FROM instructor WHERE instructor_id IN (${ids.map(() => "?").join(",")})`,
      ids
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No instructors found to delete" });
    }
    res.json({ message: "Instructors deleted successfully" });
  } catch (err) {
    console.error("Error deleting instructors:", err);
    res.status(500).json({ message: "Server error while deleting instructors" });
  }
};

module.exports = {
  getInstructors,
  createInstructor,
  updateInstructor,
  deleteInstructors
};