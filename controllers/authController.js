const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const { pool } = require("../db");
require('dotenv').config();

// generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { user_id: user.user_id, user_email: user.user_email, user_role: user.user_role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user.user_id, email: user.user_email },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

// Save refresh token
const saveRefreshToken = async (userId, token) => {
  const decoded = jwt.decode(token);
  const expiresAt = decoded.exp;
  await pool.execute(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expiresAt]
  );
};

// Remove refresh token
const revokeRefreshToken = async (token) => {
  await pool.execute("DELETE FROM refresh_tokens WHERE token = ?", [token]);
};

// Signup
async function signup(req, res) {
  const { name, email, password, role } = req.body;
  if (!email.endsWith("@cbsua.edu.ph")) {
    return res.status(400).json({ message: "Email must end with @cbsua.edu.ph" });
  }

  const hashed = await bcrypt.hash(password, 10);

  try {
    const [rows] = await pool.execute("SELECT user_id FROM user WHERE user_email = ?", [email]);
    if (rows.length > 0) return res.status(400).json({ message: "Email already exists" });

    const [result] = await pool.execute(
      "INSERT INTO user (user_name, user_email, user_password, user_role) VALUES (?, ?, ?, ?)",
      [name, email, hashed, role]
    );
    res.json({ message: "User registered successfully", userId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
  }
};

// Login
async function login(req, res) {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.execute("SELECT * FROM user WHERE user_email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ message: "User not found" });
    
    const user = rows[0];
    const match = await bcrypt.compare(password, user.user_password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });
    const { accessToken, refreshToken } = generateTokens(user);
    await saveRefreshToken(user.user_id, refreshToken);
    res.json({ accessToken, refreshToken,user: {
        id: user.user_id,
        email: user.user_email,
        role: user.user_role   
      } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
};

// Refresh
async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

  try {
    const [rows] = await pool.execute("SELECT * FROM refresh_tokens WHERE token = ?", [refreshToken]);
    if (rows.length === 0) return res.status(403).json({ message: "Invalid refresh token" });

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, user) => {
      if (err) return res.status(403).json({ message: "Expired refresh token" });

      const newTokens = generateTokens(user);
      await revokeRefreshToken(refreshToken);
      await saveRefreshToken(user.id, newTokens.refreshToken);

      res.json(newTokens);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Refresh failed" });
  }
};

// Logout
async function logout(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.sendStatus(204);
  await revokeRefreshToken(refreshToken);
  res.json({ message: "Logged out" });
};

module.exports = { signup, login, refresh, logout };