const express = require('express');
const cors = require('cors');
const cron = require("node-cron");
const { pool } = require("./db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const semesterRoutes = require('./routes/semesterRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');

const instructorRoutes = require('./routes/instructorRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const yearSectionRoutes = require('./routes/yearSectionRoutes');

const roomReservationRoutes = require("./routes/roomReservationRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const categoryRoutes = require('./routes/categoryRoutes');
const equipmentReservationRoutes = require("./routes/equipmentReservationRoutes");
const instructorScheduleRoutes = require('./routes/instructorScheduleRoutes');
const activityRoutes = require('./routes/activityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use('/users', userRoutes);
app.use('/rooms', roomRoutes);
app.use("/semesters", semesterRoutes);
app.use("/schedules", scheduleRoutes);

app.use("/instructors", instructorRoutes);
app.use("/subjects", subjectRoutes);
app.use("/year-sections", yearSectionRoutes);

app.use("/room-reservations", roomReservationRoutes);
app.use("/equipment", equipmentRoutes);
app.use("/categories", categoryRoutes);
app.use("/equipment-reservations", equipmentReservationRoutes);

app.use("/instructor-schedule", instructorScheduleRoutes);
app.use("/activities", activityRoutes);
app.use("/dashboard", dashboardRoutes);

// Cleanup expired refresh tokens every hour
cron.schedule("0 * * * *", async () => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const [result] = await pool.execute("DELETE FROM refresh_tokens WHERE expires_at < ?", [now]);
    console.log(`[CLEANUP] Removed ${result.affectedRows} expired tokens`);
  } catch (err) {
    console.error("Cleanup error", err);
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
