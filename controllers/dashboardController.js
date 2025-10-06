const { pool } = require("../db");

async function getDashboardStats(req, res) {
  try {
    const [[roomTotal]] = await pool.query(`SELECT COUNT(*) AS total FROM room_reservation`);
    const [[roomApproved]] = await pool.query(`SELECT COUNT(*) AS total FROM room_reservation WHERE room_reservation_status='approved'`);
    const [[roomPending]] = await pool.query(`SELECT COUNT(*) AS total FROM room_reservation WHERE room_reservation_status='pending'`);

    const [[equipTotal]] = await pool.query(`SELECT COUNT(*) AS total FROM equipment_reservation`);
    const [[equipApproved]] = await pool.query(`SELECT COUNT(*) AS total FROM equipment_reservation WHERE equipment_reservation_status='approved'`);
    const [[equipPending]] = await pool.query(`SELECT COUNT(*) AS total FROM equipment_reservation WHERE equipment_reservation_status='pending'`);

    const [[totalUsers]] = await pool.query(`SELECT COUNT(*) AS total FROM user`);
    const [[totalFaculty]] = await pool.query(`SELECT COUNT(*) AS total FROM user WHERE user_role='faculty'`);
    const [[totalStudents]] = await pool.query(`SELECT COUNT(*) AS total FROM user WHERE user_role='student'`);

    res.json({
      room: {
        total: roomTotal.total,
        approved: roomApproved.total,
        pending: roomPending.total,
      },
      equipment: {
        total: equipTotal.total,
        approved: equipApproved.total,
        pending: equipPending.total,
      },
      users: {
        total: totalUsers.total,
        faculty: totalFaculty.total,
        students: totalStudents.total,
      }
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ message: "Server error fetching dashboard stats" });
  }
}

// get stats by user_id
async function getUserReservationStats(req, res) {
  try {
    const { id } = req.params;

    // Room reservations per user
    const [[roomTotal]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM room_reservation 
       WHERE user_id = ?`,
      [id]
    );

    const [[roomApproved]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM room_reservation 
       WHERE user_id = ? AND room_reservation_status='approved'`,
      [id]
    );

    const [[roomPending]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM room_reservation 
       WHERE user_id = ? AND room_reservation_status='pending'`,
      [id]
    );

    // Equipment reservations per user
    const [[equipTotal]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM equipment_reservation 
       WHERE user_id = ?`,
      [id]
    );

    const [[equipApproved]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM equipment_reservation 
       WHERE user_id = ? AND equipment_reservation_status='approved'`,
      [id]
    );

    const [[equipPending]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM equipment_reservation 
       WHERE user_id = ? AND equipment_reservation_status='pending'`,
      [id]
    );

    res.json({
      room: {
        total: roomTotal.total,
        approved: roomApproved.total,
        pending: roomPending.total,
      },
      equipment: {
        total: equipTotal.total,
        approved: equipApproved.total,
        pending: equipPending.total,
      },
    });
  } catch (err) {
    console.error("Error fetching user reservation stats:", err);
    res.status(500).json({ message: "Server error fetching reservation stats." });
  }
}

// get stats by user
async function getStudentReservationStats(req, res) {
  try {
    const { id } = req.params;
  
    // Equipment reservations per user
    const [[equipTotal]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM equipment_reservation 
       WHERE user_id = ?`,
      [id]
    );

    const [[equipApproved]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM equipment_reservation 
       WHERE user_id = ? AND equipment_reservation_status='approved'`,
      [id]
    );

    const [[equipPending]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM equipment_reservation 
       WHERE user_id = ? AND equipment_reservation_status='pending'`,
      [id]
    );

    res.json({
      equipment: {
        total: equipTotal.total,
        approved: equipApproved.total,
        pending: equipPending.total,
      },
    });
  } catch (err) {
    console.error("Error fetching user reservation stats:", err);
    res.status(500).json({ message: "Server error fetching reservation stats." });
  }
}

module.exports = { getDashboardStats, getUserReservationStats,getStudentReservationStats };