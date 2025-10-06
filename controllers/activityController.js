const { pool } = require("../db");

// Get all activity logs
async function getActivityLogs(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.user_name, u.user_role 
       FROM user_activity a
       JOIN user u ON a.user_id = u.user_id
       ORDER BY a.user_activity_creation_date DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).json({ message: "Server error fetching activity logs" });
  }
}

// Get user activity
async function getUserActivity(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT 
          ua.user_activity_id,
          ua.user_id,
          ua.user_activity_action,
          ua.user_activity_action_type,
          ua.user_activity_creation_date,
          u.user_name
       FROM user_activity ua
       LEFT JOIN user u ON ua.user_id = u.user_id
       WHERE ua.user_id = ?
       ORDER BY ua.user_activity_creation_date DESC`,
      [id]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching user activity:", err);
    res.status(500).json({ message: "Server error fetching user activity." });
  }
}

module.exports = { getActivityLogs, getUserActivity };