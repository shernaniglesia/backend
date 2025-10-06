const { pool } = require("../db");

async function getCategories(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM category ORDER BY category_name ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

async function createCategory(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });

  const [result] = await pool.query("INSERT INTO category (category_name) VALUES (?)", [name]);
  res.json({ message: "Category added", id: result.insertId });
}

async function updateCategory(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  const [result] = await pool.query("UPDATE category SET category_name=? WHERE category_id=?", [name, id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Category updated" });
}

async function deleteCategory(req, res) {
  const ids = req.query.ids ? req.query.ids.split(",") : [];
  if (ids.length === 0) return res.status(400).json({ message: "No IDs provided" });
  const [result] = await pool.query(
    `DELETE FROM category WHERE category_id IN (${ids.map(() => "?").join(",")})`,
    ids
  );
  res.json({ message: `${result.affectedRows} categories deleted` });
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};