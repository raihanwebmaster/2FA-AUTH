const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 4000;
const mongoUri =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/twofa_authenticator";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "2fa-authenticator-backend" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "password must be at least 6 characters" });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ message: "username or email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash });

    return res.status(201).json({
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error("Register error", err);
    return res.status(500).json({ message: "server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    return res.json({
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ message: "server error" });
  }
});

async function start() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
