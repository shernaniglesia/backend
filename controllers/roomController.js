// controllers/roomController.js
const { pool } = require('../db');

// List all rooms
async function listRooms(_req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT room_id, room_name, room_desc FROM room ORDER BY room_name'
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching rooms' });
  }
}
async function createRoom(req, res) {
  try{
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO room (room_name, room_desc) VALUES (?, ?)',
      [name, description]
    );
    res.status(201).json({
      message: 'Room created successfully',
      room_id: result.insertId,
    });
  }catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Get detailed room info with days and schedules
async function getRoomDetail(req, res) {
  try {
    const { roomId } = req.params;

    // Fetch room
    const [[room]] = await pool.query('SELECT * FROM room WHERE room_id=?', [roomId]);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ ...room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching room detail' });
  }
}

// Update room
async function updateRoom(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const [result] = await pool.query(
      'UPDATE room SET room_name=?, room_desc=? WHERE room_id=?',
      [name, description, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Room updated successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error updating room' });
  }
}

async function deleteRooms(req, res) {
  try {
    const ids = req.query.ids;
    if (!ids) return res.status(400).json({ message: "No ids provided" });

    const idArray = ids.split(",").map((id) => parseInt(id, 10));
    if (idArray.some(isNaN)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    const [result] = await pool.query(
      `DELETE FROM room WHERE room_id IN (${idArray.map(() => "?").join(",")})`,
      idArray
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No rooms found" });
    }

    res.json({ message: `${result.affectedRows} room(s) deleted successfully` });
  } catch (e) {
    console.error("Error deleting rooms:", e);
    res.status(500).json({ message: "Error deleting rooms" });
  }
}

module.exports = {
  listRooms,
  createRoom,
  getRoomDetail,
  updateRoom,
  deleteRooms,
};