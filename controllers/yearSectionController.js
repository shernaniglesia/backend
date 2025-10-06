const { pool } = require('../db');

// Get all year & sections
  async function getYearSections (req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM year_section ORDER BY year_section_id DESC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching year sections:", err);
    res.status(500).json({ message: "Server error while fetching year sections" });
  }
};

// Create new year & section
  async function createYearSection (req, res) {
  try {
    const { year_section_desc } = req.body;
    if (!year_section_desc) {
      return res.status(400).json({ message: "Year & Section description is required" });
    }

    await pool.query("INSERT INTO year_section (year_section_desc) VALUES (?)", [year_section_desc]);
    res.json({ message: "Year & Section added successfully" });
  } catch (err) {
    console.error("Error creating year section:", err);
    res.status(500).json({ message: "Server error while creating year section" });
  }
};

// Update year & section
  async function updateYearSection (req, res) {
  try {
    const { id } = req.params;
    const { year_section_desc } = req.body;
    if (!year_section_desc) {
      return res.status(400).json({ message: "Year & Section description is required" });
    }

    const [result] = await pool.query(
      "UPDATE year_section SET year_section_desc = ? WHERE year_section_id = ?",
      [year_section_desc, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Year & Section not found" });
    }

    res.json({ message: "Year & Section updated successfully" });
  } catch (err) {
    console.error("Error updating year section:", err);
    res.status(500).json({ message: "Server error while updating year section" });
  }
};

// Delete multiple year & sections
  async function deleteYearSections (req, res) {
  try {
    const { ids } = req.query; // e.g. ids=1,2,3
    if (!ids) {
      return res.status(400).json({ message: "No IDs provided" });
    }

    const idArray = ids.split(",").map((id) => parseInt(id, 10));
    await pool.query("DELETE FROM year_section WHERE year_section_id IN (?)", [idArray]);

    res.json({ message: "Year & Section(s) deleted successfully" });
  } catch (err) {
    console.error("Error deleting year sections:", err);
    res.status(500).json({ message: "Server error while deleting year sections" });
  }
};

module.exports = {
  getYearSections,
  createYearSection,
  updateYearSection,
  deleteYearSections
};