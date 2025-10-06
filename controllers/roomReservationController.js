const { pool } = require("../db");
const { logActivity } = require("../utils/logActivity");

// Get all reservations with room + user details
async function getAllReservations(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT rr.*, r.room_name AS room_name, u.user_name AS user_name, u.user_email, u.user_role
       FROM room_reservation rr
       JOIN room r ON rr.room_id = r.room_id
       JOIN user u ON rr.user_id = u.user_id
       ORDER BY rr.room_reservation_creation_date, rr.room_reservation_start_time DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).json({ message: "Server error fetching reservations." });
  }
};

// checking overlap
function hasOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

// POST a room reservation
async function createReservation(req, res) {
  try {
    const {
      room_id,
      user_id,
      date,
      start_time,
      end_time,
      subject,
      year_section,
    } = req.body;

    if (!room_id || !user_id || !date || !start_time || !end_time || !subject || !year_section) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    
    const [ins] = await pool.execute(
      `INSERT INTO room_reservation 
      (user_id, room_id, room_reservation_subject, room_reservation_year_section,
        room_reservation_date, room_reservation_start_time, room_reservation_end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, room_id, subject, year_section, date, start_time, end_time]
    );

    return res.json({
      message: 'Reservation request submitted (pending approval).',
      reservation_id: ins.insertId,
    });
  } catch (err) {
    console.error('Error creating reservation:', err);
    return res.status(500).json({ message: 'Server error creating reservation.' });
  }
}

// Approve a reservation
async function approveReservation(req, res) {
  const { user_name, user_now } = req.body;
  try {
    const { id } = req.params;

    // Fetch reservation
    const [reservations] = await pool.query(
      `SELECT * FROM room_reservation WHERE room_reservation_id = ?`,
      [id]
    );
    if (reservations.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    const reservation = reservations[0];

    // Check conflicts with existing approved reservations
    const [conflicts] = await pool.query(
      `SELECT * FROM room_reservation 
       WHERE room_id = ? AND room_reservation_date = ? AND room_reservation_status = 'approved' AND room_reservation_id != ?`,
      [reservation.room_id, reservation.room_reservation_date, id]
    );

    for (let r of conflicts) {
      if (hasOverlap(reservation.room_reservation_start_time, reservation.room_reservation_end_time, r.start_time, r.end_time)) {
        return res.status(400).json({
          message: `Conflict with another approved reservation (${r.start_time} - ${r.end_time})`,
        });
      }
    }

    // If no conflict → approve
    await pool.query(
      `UPDATE room_reservation SET room_reservation_status = 'approved' WHERE room_reservation_id = ?`,
      [id]
    );

    // Fetch room name for log
    const [[room]] = await pool.query(
      `SELECT room_name FROM room WHERE room_id = ?`,
      [reservation.room_id]
    );

    await logActivity(
      user_now,
      "ROOM RESERVATION",
      `Approved reservation of "${user_name}" for room "${room.room_name}" on ${reservation.room_reservation_date} (${reservation.room_reservation_start_time} - ${reservation.room_reservation_end_time}).`
    );

    res.json({ message: "Reservation approved successfully." });
  } catch (err) {
    console.error("Error approving reservation:", err);
    res.status(500).json({ message: "Server error approving reservation." });
  }
}

// Reject a reservation
async function rejectReservation(req, res) {
  const { user_name, user_now } = req.body;
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `UPDATE room_reservation SET room_reservation_status = 'rejected' WHERE room_reservation_id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const [[row]] = await pool.query(
      `SELECT r.room_name, rr.room_reservation_date, rr.room_reservation_start_time, rr.room_reservation_end_time
       FROM room_reservation rr 
       JOIN room r ON rr.room_id = r.room_id 
       WHERE rr.room_reservation_id = ?`,
      [id]
    );

    await logActivity(
      user_now,
      "ROOM RESERVATION",
      `Rejected reservation of "${user_name}" for room "${row.room_name}" on ${row.room_reservation_date} (${row.room_reservation_start_time} - ${row.room_reservation_end_time}).`
    );

    res.json({ message: "Reservation rejected successfully." });
  } catch (err) {
    console.error("Error rejecting reservation:", err);
    res.status(500).json({ message: "Server error rejecting reservation." });
  }
}

// Cancel a reservation
async function cancelReservation(req, res) {
  const { user_name, user_now } = req.body;
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `UPDATE room_reservation SET room_reservation_status = 'cancelled' WHERE room_reservation_id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const [[row]] = await pool.query(
      `SELECT r.room_name, rr.room_reservation_date, rr.room_reservation_start_time, rr.room_reservation_end_time
       FROM room_reservation rr 
       JOIN room r ON rr.room_id = r.room_id 
       WHERE rr.room_reservation_id = ?`,
      [id]
    );

    await logActivity(
      user_now,
      "ROOM RESERVATION",
      `Cancelled reservation of "${user_name}" for room "${row.room_name}" on ${row.room_reservation_date} (${row.room_reservation_start_time} - ${row.room_reservation_end_time}).`
    );

    res.json({ message: "Reservation cancelled successfully." });
  } catch (err) {
    console.error("Error cancelling reservation:", err);
    res.status(500).json({ message: "Server error cancelling reservation." });
  }
}

// Delete reservation
async function deleteReservation(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM room_reservation WHERE room_reservation_id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.json({ message: "Reservation deleted successfully" });
  } catch (err) {
    console.error("Error deleting reservation:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

async function deleteMultipleReservations(req, res) {
  try {
    const ids = req.query.ids ? req.query.ids.split(",") : [];
    if (ids.length === 0) {
      return res.status(400).json({ message: "No reservation IDs provided" });
    }

    const [result] = await pool.query(
      "DELETE FROM room_reservation WHERE room_reservation_id IN (?)",
      [ids]
    );

    res.json({ message: `Deleted ${result.affectedRows} reservation(s)` });
  } catch (err) {
    console.error("Error deleting reservations:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

module.exports = {
  getAllReservations,
  createReservation,
  approveReservation,
  rejectReservation,
  cancelReservation,
  deleteReservation,
  deleteMultipleReservations
};