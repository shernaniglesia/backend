// utils/logActivity.js
const { pool } = require("../db");

async function logActivity(userId, actionType, actionDescription) {
  try {
    await pool.query(
      `INSERT INTO user_activity (user_id, user_activity_action, user_activity_action_type) 
       VALUES (?, ?, ?)`,
      [userId, actionDescription, actionType]
    );
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}

module.exports = { logActivity };
