const { pool } = require("../db");

// GET all equipment with category name
async function getAllEquipment(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT e.equipment_id, e.equipment_name, e.equipment_desc, e.equipment_status, 
              e.category_id, c.category_name AS category_name
       FROM equipment e
       LEFT JOIN category c ON e.category_id = c.category_id
       ORDER BY e.equipment_id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching equipment:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// CREATE equipment
async function createEquipment(req, res) {
  try {
    const {  name, description, status, category_id } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    await pool.query(
      `INSERT INTO equipment ( category_id, equipment_name, equipment_desc, equipment_status)
       VALUES (?, ?, ?, ?)`,
      [category_id, name, description, status || null]
    );

    res.json({ message: "Equipment added successfully" });
  } catch (err) {
    console.error("Error creating equipment:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// UPDATE equipment
async function updateEquipment(req, res) {
  try {
    const { id } = req.params;
    const { name, description, status, category_id } = req.body;

    const [result] = await pool.query(
      `UPDATE equipment 
       SET  equipment_name=?, equipment_desc=?, equipment_status=?, category_id=?
       WHERE equipment_id=?`,
      [name, description, status, category_id || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Equipment not found" });
    }

    res.json({ message: "Equipment updated successfully" });
  } catch (err) {
    console.error("Error updating equipment:", err);
    res.status(500).json({ message: "Server error" });
  }
}


//  DELETE multiple equipment
async function deleteEquipment(req, res) {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ message: "No IDs provided" });
    }

    const idArray = ids.split(",").map((id) => parseInt(id));
    await pool.query(`DELETE FROM equipment WHERE equipment_id IN (?)`, [idArray]);

    res.json({ message: `Deleted ${idArray.length} equipment item(s)` });
  } catch (err) {
    console.error("Error deleting equipment:", err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getAllEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
};