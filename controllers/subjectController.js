const { pool } = require('../db');

// Get all subjects
 async function getSubjects (req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM subject ORDER BY subject_code ASC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching subjects:", err);
    res.status(500).json({ message: "Server error fetching subjects" });
  }
};

// Create new subject
 async function createSubject (req, res) {
  const { subject_code, subject_desc } = req.body;
  if (!subject_code || !subject_desc) {
    return res.status(400).json({ message: "Subject code and description are required" });
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO subject (subject_code, subject_desc) VALUES (?, ?)",
      [subject_code, subject_desc]
    );
    res.status(201).json({ message: "Subject added successfully", subject_id: result.insertId });
  } catch (err) {
    console.error("Error adding subject:", err);
    res.status(500).json({ message: "Server error adding subject" });
  }
};

// Update subject
 async function updateSubject (req, res) {
  const { id } = req.params;
  const { subject_code, subject_desc } = req.body;
  if (!subject_code || !subject_desc) {
    return res.status(400).json({ message: "Subject code and description are required" });
  }
  try {
    const [result] = await pool.query(
      "UPDATE subject SET subject_code = ?, subject_desc = ? WHERE subject_id = ?",
      [subject_code, subject_desc, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.json({ message: "Subject updated successfully" });
  } catch (err) {
    console.error("Error updating subject:", err);
    res.status(500).json({ message: "Server error updating subject" });
  }
};

// Delete single or multiple subjects
 async function deleteSubjects (req, res) {
  const { ids } = req.query; // ?ids=1,2,3
  if (!ids) {
    return res.status(400).json({ message: "No subject IDs provided" });
  }
  const idsArray = ids.split(",").map((id) => parseInt(id));
  try {
    const [result] = await pool.query("DELETE FROM subject WHERE subject_id IN (?)", [idsArray]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No subjects deleted" });
    }
    res.json({ message: `Deleted ${result.affectedRows} subject(s)` });
  } catch (err) {
    console.error("Error deleting subjects:", err);
    res.status(500).json({ message: "Server error deleting subjects" });
  }
};

module.exports = {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubjects
};