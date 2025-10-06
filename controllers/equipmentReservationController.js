const { pool } = require("../db");
const { logActivity } = require("../utils/logActivity");

// check time overlap
function hasOverlap(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
}

// GET all reservations
async function getEquipmentReservations(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT er.*, e.equipment_name AS equipment_name, u.user_name AS user_name
       FROM equipment_reservation er
       JOIN equipment e ON er.equipment_id = e.equipment_id
       JOIN user u ON er.user_id = u.user_id
       ORDER BY er.equipment_reservation_creation_date DESC`
    );
    res.json(rows); 
  } catch (err) {
    console.error("Error fetching equipment reservations:", err);
    res.status(500).json({ message: "Server error fetching reservations" });
  }
}

// POST create reservation request
async function createEquipmentReservation(req, res) {
  const { equipment_id, user_id, start_time, end_time, purpose } = req.body;
  if (!equipment_id || !user_id || !start_time || !end_time || !purpose) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const mysqlDateTimeString = "2025-09-28 18:27:00";
  const date = new Date(mysqlDateTimeString);
  try {
    // Check conflicts with APPROVED reservations
    const [existing] = await pool.execute(
      `SELECT * FROM equipment_reservation 
       WHERE equipment_id=? AND equipment_reservation_creation_date=? AND equipment_reservation_status='approved'`,
      [equipment_id, date]
    );

    for (let r of existing) {
      if (hasOverlap(start_time, end_time, r.start_time, r.end_time)) {
        return res.status(400).json({
          message: `Conflict with another reservation (${r.start_time}-${r.end_time})`,
        });
      }
    }

    // Insert as PENDING
    const [result] = await pool.execute(
      `INSERT INTO equipment_reservation
            (equipment_id, user_id, equipment_reservation_start_time,
             equipment_reservation_end_time, equipment_reservation_purpose,
             equipment_reservation_status) VALUES (?,?,?,?,?, 'pending')`,
      [equipment_id, user_id, start_time, end_time, purpose]
    );

    // Get equipment name for log
    const [[equip]] = await pool.query(`SELECT equipment_name FROM equipment WHERE equipment_id=?`, [equipment_id]);

    await logActivity(
      user_id,
      "EQUIPMENT_RESERVATION",
      `Requested reservation for equipment "${equip.equipment_name}."`
    );

    res.json({ message: "Reservation request submitted.", id: result.insertId });
  } catch (err) {
    console.error("Error creating equipment reservation:", err);
    res.status(500).json({ message: "Server error creating reservation." });
  }
}

// Approve reservation
async function approveEquipmentReservation(req, res) {
  const { user_name, user_now } = req.body;
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      `UPDATE equipment_reservation SET equipment_reservation_status='approved' WHERE equipment_reservation_id=?`,
      [id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Reservation not found" });

    const [rows] =  await pool.execute(
      `SELECT equipment_id FROM equipment_reservation WHERE equipment_reservation_id=?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Equipment not found for reservation" });
    }
    const equipmentId = rows[0].equipment_id;

    await pool.execute(
      `UPDATE equipment SET equipment_status='reserved' WHERE equipment_id=?`,
      [equipmentId]
    );

    // Get equipment name for log
    const [[equip]] = await pool.query(`SELECT equipment_name FROM equipment WHERE equipment_id=?`, [equipmentId]);

    await logActivity(
      user_now,
      "EQUIPMENT RESERVATION",
      `Approved reservation of "${user_name}" for equipment "${equip.equipment_name}."`
    );

    res.json({ message: "Reservation approved." });
  } catch (err) {
    console.error("Error approving reservation:", err);
    res.status(500).json({ message: "Server error approving reservation." });
  }
}

// Reject reservation
async function rejectEquipmentReservation(req, res) {
  const { user_name, user_now } = req.body;
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      `UPDATE equipment_reservation SET equipment_reservation_status='rejected' WHERE equipment_reservation_id=?`,
      [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Reservation not found" });

    // Get equipment for log
    const [[row]] = await pool.query(
      `SELECT e.equipment_name 
       FROM equipment_reservation er 
       JOIN equipment e ON er.equipment_id=e.equipment_id 
       WHERE er.equipment_reservation_id=?`, 
      [id]
    );

    await logActivity(
      user_now,
      "EQUIPMENT RESERVATION",
      `Rejected reservation of "${user_name}" for equipment "${row.equipment_name}."`
    );

    res.json({ message: "Reservation rejected." });
  } catch (err) {
    console.error("Error rejecting reservation:", err);
    res.status(500).json({ message: "Server error rejecting reservation." });
  }
}

// Cancel reservation
async function cancelEquipmentReservation(req, res) {
  const { user_name, user_now } = req.body;
  try {
    const { id } = req.params;

    const [rows] =  await pool.execute(
      `SELECT equipment_reservation_status, equipment_id 
       FROM equipment_reservation WHERE equipment_reservation_id=?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Error" });
    }
    const status = rows[0].equipment_reservation_status;
    const eid = rows[0].equipment_id;

    if(status == "approved"){
      await pool.execute(
        `UPDATE equipment SET equipment_status='available' WHERE equipment_id=?`,
        [eid]
      );
    }

    const [result] = await pool.execute(
      `UPDATE equipment_reservation SET equipment_reservation_status='cancelled' WHERE equipment_reservation_id=?`,
      [id]
    );
    
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Reservation not found" });

    const [[equip]] = await pool.query(
      `SELECT equipment_name FROM equipment WHERE equipment_id=?`, 
      [eid]
    );

    await logActivity(
      user_now,
      "EQUIPMENT RESERVATION",
      `Cancelled reservation for equipment "${equip.equipment_name}."`
    );

    res.json({ message: "Reservation cancelled." });
  } catch (err) {
    console.error("Error cancelling reservation:", err);
    res.status(500).json({ message: "Server error cancelling reservation." });
  }
}

// Borrow equipment
async function borrowEquipmentReservation(req, res) {
  const { user_name, user_now } = req.body;
  try {
    const { id } = req.params;

    const [rows] =  await pool.execute(
      `SELECT equipment_reservation_status, equipment_id 
       FROM equipment_reservation WHERE equipment_reservation_id=?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Error" });
    }
    const status = rows[0].equipment_reservation_status;
    const eid = rows[0].equipment_id;

    if(status == "approved"){
      await pool.execute(
        `UPDATE equipment SET equipment_status='borrowed' WHERE equipment_id=?`,
        [eid]
      );
    }

    const [result] = await pool.execute(
      `UPDATE equipment_reservation SET equipment_reservation_status='borrowed' WHERE equipment_reservation_id=?`,
      [id]
    );
    
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Reservation not found" });

    const [[equip]] = await pool.query(
      `SELECT equipment_name FROM equipment WHERE equipment_id=?`, 
      [eid]
    );

    await logActivity(
      user_now,
      "EQUIPMENT RESERVATION",
      `Marked as borrowed: reservation of "${user_name}" for equipment "${equip.equipment_name}."`
    );

    res.json({ message: "Equipment borrowed." });
  } catch (err) {
    console.error("Error borrowing equipment:", err);
    res.status(500).json({ message: "Server error borrowing equipment." });
  }
}

// Return equipment
async function returnEquipmentReservation(req, res) {
  const { user_name, user_now } = req.body;
  console.log(user_name,user_now);
  try {
    const { id } = req.params;

    const [rows] =  await pool.execute(
      `SELECT equipment_reservation_status, equipment_id 
       FROM equipment_reservation WHERE equipment_reservation_id=?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Error" });
    }
    const status = rows[0].equipment_reservation_status;
    const eid = rows[0].equipment_id;

    if(status == "borrowed"){
      await pool.execute(
        `UPDATE equipment SET equipment_status='available' WHERE equipment_id=?`,
        [eid]
      );
    }

    const [result] = await pool.execute(
      `UPDATE equipment_reservation SET equipment_reservation_status='returned' WHERE equipment_reservation_id=?`,
      [id]
    );
    
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Reservation not found" });

    const [[equip]] = await pool.query(
      `SELECT equipment_name FROM equipment WHERE equipment_id=?`, 
      [eid]
    );

    await logActivity(
      user_now,
      "EQUIPMENT RESERVATION",
      `Returned equipment "${equip.equipment_name}" for reservation of "${user_name}."`
    );

    res.json({ message: "Equipment returned." });
  } catch (err) {
    console.error("Error returning equipment:", err);
    res.status(500).json({ message: "Server error returning equipment." });
  }
}

async function deleteEquipmentReservations(req, res) {
  const ids = req.query.ids ? req.query.ids.split(",") : [];
  if (ids.length === 0) return res.status(400).json({ message: "No IDs provided" });
  const [result] = await pool.query(
    `DELETE FROM equipment_reservation WHERE equipment_reservation_id IN (${ids.map(() => "?").join(",")})`,
    ids
  );
  res.json({ message: `${result.affectedRows} equipment deleted` });
}

module.exports = { getEquipmentReservations, createEquipmentReservation,
   approveEquipmentReservation, rejectEquipmentReservation, cancelEquipmentReservation,
   borrowEquipmentReservation, returnEquipmentReservation, deleteEquipmentReservations };