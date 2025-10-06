//controllers/scheduleController
const { pool } = require('../db');
const { logActivity } = require("../utils/logActivity");

/* helper: add days to a Date */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/* normalize different day name formats to day index (0 Sun .. 6 Sat) */
function dayNameToIndex(nameOrIndex) {
  if (nameOrIndex == null) return null;
  // allow passing number/string number
  if (!isNaN(Number(nameOrIndex))) return Number(nameOrIndex);

  const key = String(nameOrIndex).trim().toLowerCase();
  const map = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6,
  };
  if (map[key] !== undefined) return map[key];
  // try first 3 chars
  const short = key.slice(0,3);
  return map[short] !== undefined ? map[short] : null;
}

const INDEX_TO_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* overlap check (adjusted to your schema names) */
async function hasOverlap({ room_id, sem_sy_id, schedule_start_time, schedule_end_time, days, excludeId = null }) {
  const params = excludeId ? [room_id, sem_sy_id, excludeId] : [room_id, sem_sy_id];
  const [rows] = await pool.query(
    `
    SELECT s.schedule_id, s.schedule_start_time, s.schedule_end_time, GROUP_CONCAT(spd.schedule_day) as days
    FROM schedule s
    JOIN schedule_per_day spd ON s.schedule_id = spd.schedule_id
    WHERE s.room_id = ? AND s.sem_sy_id = ?
      ${excludeId ? "AND s.schedule_id != ?" : ""}
    GROUP BY s.schedule_id
    `,
    params
  );

  for (let row of rows) {
    const existingDays = row.days ? row.days.split(",") : [];
    // normalize existingDays to indexes
    const existingIdx = existingDays.map(d => dayNameToIndex(d)).filter(x => x !== null);
    const conflictDay = days.some(d => {
      const idx = dayNameToIndex(d);
      return existingIdx.includes(idx);
    });
    if (conflictDay) {
      // compare time strings - ensure both have hh:mm:ss or hh:mm
      // convert to seconds for safe compare:
      const toSec = (t) => {
        if (!t) return 0;
        const parts = String(t).split(":").map(Number);
        return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
      };
      const startSec = toSec(schedule_start_time);
      const endSec = toSec(schedule_end_time);
      const existingStart = toSec(row.schedule_start_time);
      const existingEnd = toSec(row.schedule_end_time);
      if (startSec < existingEnd && endSec > existingStart) {
        return true;
      }
    }
  }
  return false;
}

/* CREATE schedule controller (robust occurrences generation) */
async function createSchedule(req, res) {
  try {
    const {
      room_id,
      sem_sy_id,
      subject_id,
      instructor_id,
      year_section_id,
      schedule_start_time,
      schedule_end_time,
      days,
    } = req.body;

    // basic validation
    if (
      !room_id || !sem_sy_id || !subject_id || !instructor_id || !year_section_id ||
      !schedule_start_time || !schedule_end_time || !Array.isArray(days) || days.length === 0
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // check overlap
    const overlap = await hasOverlap({
      room_id,
      sem_sy_id,
      schedule_start_time,
      schedule_end_time,
      days
    });
    if (overlap) {
      return res.status(400).json({ message: "Conflict: This schedule overlaps with an existing one." });
    }

    // verify semester (use your table sem_sy with sem_sy_start_date / sem_sy_end_date)
    const [semRows] = await pool.query(
      "SELECT sem_sy_start_date, sem_sy_end_date, sem_sy_status, sem_sy_school_year, sem_sy_semester FROM sem_sy WHERE sem_sy_id = ?",
      [sem_sy_id]
    );
    if (!semRows || semRows.length === 0) {
      return res.status(400).json({ message: "Invalid semester id" });
    }
    const sem = semRows[0];
    // You may store active flag in sem_sy_status (0/1) — optionally check:
    if (sem.sem_sy_status !== 1) return res.status(400).json({ message: "Semester not active" });

    // normalize start/end dates to local-midnight to avoid TZ shifts
    const normalizeToMidnight = (raw) => {
      if (!raw) return null;
      if (raw instanceof Date) {
        return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
      }
      // raw likely 'YYYY-MM-DD' -> add T00:00:00 to force correct day
      return new Date(`${raw}T00:00:00`);
    };

    const semStart = normalizeToMidnight(sem.sem_sy_start_date);
    const semEnd = normalizeToMidnight(sem.sem_sy_end_date);
    if (!semStart || !semEnd || isNaN(semStart) || isNaN(semEnd)) {
      console.warn("Semester dates invalid:", sem);
      return res.status(400).json({ message: "Semester has invalid start/end dates" });
    }

    // insert schedule
    const [insertRes] = await pool.query(
      `INSERT INTO schedule 
       (sem_sy_id, room_id, subject_id, instructor_id, year_section_id, schedule_start_time, schedule_end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sem_sy_id, room_id, subject_id, instructor_id, year_section_id, schedule_start_time, schedule_end_time]
    );
    const scheduleId = insertRes.insertId;

    // normalize days -> set of indexes
    const desiredIndexes = new Set();
    for (const d of days) {
      const idx = dayNameToIndex(d);
      if (idx !== null) desiredIndexes.add(idx);
    }

    // build occurrences
    let occurrences = [];
    let cur = new Date(semStart); // already midnight
    while (cur <= semEnd) {
      const dayIdx = cur.getDay(); // 0..6
      if (desiredIndexes.has(dayIdx)) {
        const dateStr = cur.toISOString().split("T")[0]; // YYYY-MM-DD
        occurrences.push([scheduleId, dateStr, INDEX_TO_SHORT[dayIdx]]);
      }
      cur = addDays(cur, 1);
    }

    if (occurrences.length > 0) {
      // bulk insert
      await pool.query(
        `INSERT INTO schedule_per_day (schedule_id, schedule_date, schedule_day) VALUES ?`,
        [occurrences]
      );
    } else {
      console.warn("No occurrences generated — check incoming days payload and semester dates");
    }

    return res.status(201).json({ message: "Schedule created", schedule_id: scheduleId, occurrences_count: occurrences.length });
  } catch (err) {
    console.error("Error createSchedule:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}

async function getSchedulesByRoom(req, res) {
  const { roomId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT s.schedule_id,
              subj.subject_code,
              ins.instructor_name,
              ys.year_section_desc,
              s.schedule_start_time,
              s.schedule_end_time,
              GROUP_CONCAT(spd.schedule_day ORDER BY spd.schedule_date) as days
       FROM schedule s
       LEFT JOIN schedule_per_day spd ON s.schedule_id = spd.schedule_id
       LEFT JOIN subject subj ON s.subject_id = subj.subject_id
       LEFT JOIN instructor ins ON s.instructor_id = ins.instructor_id
       LEFT JOIN year_section ys ON s.year_section_id = ys.year_section_id
       WHERE s.room_id = ?
       GROUP BY s.schedule_id, subj.subject_code, ins.instructor_name, 
                ys.year_section_desc, s.schedule_start_time, s.schedule_end_time
       ORDER BY s.schedule_start_time ASC`,
      [roomId]
    );

    const schedules = rows.map((row) => ({ 
      schedule_id: row.schedule_id,
      subject: row.subject_code,
      instructor: row.instructor_name,
      year_section: row.year_section_desc,
      schedule_start_time: row.schedule_start_time,
      schedule_end_time: row.schedule_end_time,
      days: row.days ? Array.from(new Set(row.days.split(","))) : [],
    }));

    res.json(schedules);
  } catch (err) {
    console.error("Error fetching schedules:", err);
    res.status(500).json({ message: "Server error fetching schedules" });
  }
}

// Get schedules by instructor
async function getSchedulesByInstructor(req, res) {
  const { facultyId } = req.params;
    const [instructorRows] = await pool.query(
      `SELECT instructor_id FROM instructor_schedule WHERE user_id = ? LIMIT 1`,
      [facultyId]
    );

    if (instructorRows.length === 0) {
      return res.status(400).json({ message: "No schedule" });
    }

    const instructorId = instructorRows[0].instructor_id;
  try {
    const [rows] = await pool.query(
      `SELECT s.schedule_id,
              subj.subject_code,
              r.room_id,
              r.room_name, 
              ys.year_section_desc,
              s.schedule_start_time,
              s.schedule_end_time,
              GROUP_CONCAT(spd.schedule_day ORDER BY spd.schedule_date) as days
       FROM schedule s
       LEFT JOIN schedule_per_day spd ON s.schedule_id = spd.schedule_id
       LEFT JOIN subject subj ON s.subject_id = subj.subject_id
       LEFT JOIN room r ON s.room_id = r.room_id
       LEFT JOIN year_section ys ON s.year_section_id = ys.year_section_id
       WHERE s.instructor_id = ?
       GROUP BY s.schedule_id, subj.subject_code, r.room_name, 
                ys.year_section_desc, s.schedule_start_time, s.schedule_end_time
       ORDER BY s.schedule_start_time ASC`,
      [instructorId]
    );
    const schedules = rows.map((row) => ({ 
      schedule_id: row.schedule_id,
      subject: row.subject_code,
      room_id: row.room_id,
      room: row.room_name,
      year_section: row.year_section_desc,
      schedule_start_time: row.schedule_start_time,
      schedule_end_time: row.schedule_end_time,
      days: row.days ? Array.from(new Set(row.days.split(","))) : [],
    }));
    res.json(schedules);
  } catch (err) {
    console.error("Error fetching schedules by instructor:", err);
    res.status(500).json({ message: "Server error fetching schedules" });
  }
}

async function getRoomTimetable(req, res) {
  try {
    const { roomId } = req.params;
    const { weekStart, weekEnd } = req.query; 

    // Get active semester
    const [semesterRows] = await pool.query(
      "SELECT * FROM sem_sy WHERE sem_sy_status = 1 LIMIT 1"
    );

    if (semesterRows.length === 0) {
      return res.status(400).json({ message: "No active semester" });
    }

    const semester = semesterRows[0];

    // Default week range
    const start = weekStart || semester.sem_sy_start_date;
    const end =
      weekEnd ||
      new Date(new Date(start).getTime() + 6 * 24 * 60 * 60 * 1000) // +6 days
        .toISOString()
        .split("T")[0];

    // Fetch fixed schedules
    const [fixedRows] = await pool.query(
    `SELECT 
        s.schedule_id,
        subj.subject_code,
        subj.subject_desc,
        i.instructor_name,
        ys.year_section_desc,
        s.schedule_start_time,
        s.schedule_end_time,
        spd.schedule_per_day_id,
        spd.schedule_date,
        spd.schedule_day
    FROM schedule s
    JOIN subject subj ON s.subject_id = subj.subject_id
    JOIN instructor i ON s.instructor_id = i.instructor_id
    JOIN year_section ys ON s.year_section_id = ys.year_section_id
    JOIN schedule_per_day spd ON s.schedule_id = spd.schedule_id
    WHERE s.room_id = ? 
        AND s.sem_sy_id = ? 
        AND spd.schedule_date BETWEEN ? AND ?
    ORDER BY spd.schedule_date, s.schedule_start_time`,
    [roomId, semester.sem_sy_id, start, end]
    );
  
    //  Fetch approved reservations (temporary schedules)
    const [reservationRows] = await pool.query(
    `SELECT 
        r.room_reservation_id,
        r.room_reservation_subject,
        u.user_name AS instructor_name,
        r.room_reservation_year_section,
        r.room_reservation_start_time,
        r.room_reservation_end_time,
        r.room_reservation_date,
        DAYNAME(r.room_reservation_date) AS day_of_week
    FROM room_reservation r
    JOIN user u ON r.user_id = u.user_id
    WHERE r.room_id = ? 
        AND r.room_reservation_status = 'approved'
        AND r.room_reservation_date BETWEEN ? AND ?
    ORDER BY r.room_reservation_date, r.room_reservation_start_time`,
    [roomId, start, end]
    );
    
    // Merge results into a common format
    const allEvents = [
    ...fixedRows.map((row) => ({
        id: `${row.schedule_per_day_id}`,
        subject_code: `${row.subject_code}`,
        subject_desc: `${row.subject_desc}`,
        instructor: row.instructor_name,
        year_section: row.year_section_desc,
        start_time: row.schedule_start_time,
        end_time: row.schedule_end_time,
        schedule_date: row.schedule_date,
        day_of_week: row.schedule_day,
        type: "schedule",
    })),
    ...reservationRows.map((row) => ({
        id: `${row.room_reservation_id}`,
        subject_code: `${row.room_reservation_subject}`,
        subject_desc: `${row.room_reservation_subject}`,
        instructor: row.instructor_name,
        year_section: row.room_reservation_year_section,
        start_time: row.room_reservation_start_time,
        end_time: row.room_reservation_end_time,
        schedule_date: row.room_reservation_date,
        day_of_week: row.day_of_week.substring(0, 3),
        type: "reservation",
    })),
    ];

    // Group by day
    const grouped = {};
    allEvents.forEach((row) => {
    if (!grouped[row.day_of_week]) grouped[row.day_of_week] = [];
    grouped[row.day_of_week].push(row);
    });

    res.json({
      semester: {
        id: semester.sem_sy_id,
        semester: semester.sem_sy_semester,
        school_year: semester.sem_sy_school_year,
      },
      week_range: { start, end },
      timetable: grouped,
    });
  } catch (err) {
    console.error("Error fetching timetable:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

async function deleteMultipleSchedules(req, res) {
  const { ids } = req.query; 
  if (!ids) return res.status(400).json({ message: "No schedule IDs provided" });

  try {
    const idList = ids.split(",");
    await pool.query(`DELETE FROM schedule WHERE schedule_id IN (?)`, [idList]);
    res.json({ message: "Selected schedules deleted successfully" });
  } catch (err) {
    console.error("Error bulk deleting schedules:", err);
    res.status(500).json({ message: "Server error deleting schedules" });
  }
}

async function deleteOccurrence(req, res) {
  const { id } = req.params;
  const { user_id } = req.body;
  try {

    const [rows] = await pool.query(
      `SELECT spd.*, s.schedule_start_time, s.schedule_end_time,
              subj.subject_code, r.room_name
       FROM schedule_per_day spd
       JOIN schedule s ON spd.schedule_id = s.schedule_id
       JOIN subject subj ON s.subject_id = subj.subject_id
       JOIN room r ON s.room_id = r.room_id
       WHERE spd.schedule_per_day_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Occurrence not found" });
    }

    const occurrence = rows[0];

    await pool.query(
      `DELETE FROM schedule_per_day WHERE schedule_per_day_id = ?`, [id]
    );

    await logActivity(
      user_id,
      "REMOVE_SCHEDULE",
      `Removed schedule for subject "${occurrence.subject_code}" in room "${occurrence.room_name}" on ${occurrence.schedule_date} (${occurrence.schedule_start_time} - ${occurrence.schedule_end_time}).`
    );

    return res.json({ message: "Schedule occurrence removed successfully." });
  } catch (err) {
    console.error("Error deleting occurrence:", err);
    return res.status(500).json({ message: "Server error while deleting occurrence." });
  }
};

module.exports = {
  createSchedule,
  getSchedulesByRoom,
  getSchedulesByInstructor,
  getRoomTimetable,
  deleteMultipleSchedules,
  deleteOccurrence
};