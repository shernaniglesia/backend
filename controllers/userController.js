const { pool } = require('../db');
const bcrypt = require('bcryptjs');

async function listUsers(_req, res) {
  try {
    const [rows] = await pool.query('SELECT user_id, user_name, user_email, user_role FROM user ORDER BY user_id DESC');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching users' });
  }
}

async function getUser(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT user_id, user_name, user_email, user_role FROM user WHERE user_id=?', [id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: 'Not found' });

    const [activityRows] = await pool.query(
      'SELECT user_activity_action, user_activity_creation_date FROM user_activity WHERE user_id = ? ORDER BY user_activity_creation_date DESC LIMIT 20',
      [id]
    );
    user.activity = activityRows;

    res.json(user);
  } catch (e) {
    res.status(500).json({ message: 'Error' });
  }
}

async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ message: 'Missing fields' });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      'INSERT INTO user (user_name, user_email, user_password, user_role) VALUES (?, ?, ?, ?)',
      [name, email, hash, role]
    );
    res.json({ message: 'User added successfully', user_id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error adding user' });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    await pool.query('UPDATE user SET user_name=?, user_email=?, user_role=? WHERE user_id=?', [name, email, role, id]);
    res.json({ message: 'User updated successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error updating user' });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.query.ids) {
      const ids = req.query.ids.split(',').map(Number).filter(Boolean);
      if (!ids.length) return res.status(400).json({ message: 'Invalid ids' });
      await pool.query('DELETE FROM user WHERE user_id IN (?)', [ids]);
      return res.json({ message: `${ids.length} user(s) deleted successfully` });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM user WHERE user_id=?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error deleting user' });
  }
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };