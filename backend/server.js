const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const OTPAuth = require("otpauth");
const QRCode = require("qrcode");
require("dotenv").config();

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: clientOrigin,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/2fa_auth";
const jwtSecret = process.env.JWT_SECRET || "dev_secret_change_me";
const accessTokenExpires = process.env.ACCESS_TOKEN_EXPIRES || "15m";
const refreshTokenExpires = process.env.REFRESH_TOKEN_EXPIRES || "7d";
const twoFaEncryptionKey =
  process.env.TWO_FA_ENCRYPTION_KEY || "dev_2fa_secret";

function getEncryptionKey() {
  return crypto.createHash("sha256").update(twoFaEncryptionKey).digest();
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(payload) {
  const [ivHex, encrypted] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function generatePlainRecoveryCode() {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

async function generateRecoveryCodes(count = 10) {
  const plainCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < count; i++) {
    const code = generatePlainRecoveryCode();
    plainCodes.push(code);

    const codeHash = await bcrypt.hash(code, 10);
    hashedCodes.push({
      codeHash,
      usedAt: null
    });
  }

  return {
    plainCodes,
    hashedCodes
  };
}

function parseDurationMs(value, fallbackMs) {
  if (!value) return fallbackMs;
  const match = /^(\d+)(ms|s|m|h|d)$/i.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  return amount * (multipliers[unit] || 1);
}

const accessTokenMaxAgeMs = parseDurationMs(accessTokenExpires, 15 * 60 * 1000);
const refreshTokenMaxAgeMs = parseDurationMs(refreshTokenExpires, 7 * 24 * 60 * 60 * 1000);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const recoveryCodeSchema = new mongoose.Schema(
  {
    codeHash: { type: String, required: true },
    usedAt: { type: Date, default: null }
  },
  { _id: false }
);
const twoFactorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    // active secret
    secretEnc: {
      type: String,
      default: null
    },
    enabled: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    },

    // pending setup secret
    pendingSecretEnc: {
      type: String,
      default: null
    },
    pendingCreatedAt: {
      type: Date,
      default: null
    },

    lastUsedStep: {
      type: Number,
      default: null
    },

    recoveryCodes: {
      type: [recoveryCodeSchema],
      default: []
    }
  },
  { timestamps: true }
);


const User = mongoose.model("User", userSchema);
const TwoFactor = mongoose.model("TwoFactor", twoFactorSchema);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "2fa-authenticator-backend" });
});

function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: accessTokenExpires });
}

function setAccessCookie(res, token) {
  res.cookie("access_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: accessTokenMaxAgeMs
  });
}

function setRefreshCookie(res, token) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: refreshTokenMaxAgeMs
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRefreshToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function issueTokens(res, user) {
  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken();
  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + refreshTokenMaxAgeMs);
  await user.save();
  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) {
    return res.status(401).json({ message: "unauthorized" });
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.userId = payload.sub;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "unauthorized" });
  }
}

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
    await issueTokens(res, user);

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

    await issueTokens(res, user);

    return res.json({
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ message: "server error" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      const hashed = hashToken(refreshToken);
      await User.updateOne(
        { refreshTokenHash: hashed },
        { $set: { refreshTokenHash: null, refreshTokenExpiresAt: null } }
      );
    }
  } catch (err) {
    console.error("Logout error", err);
  } finally {
    res.clearCookie("access_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    });
    res.clearCookie("refresh_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    });
    res.json({ message: "logged out" });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: "unauthorized" });
    }
    const hashed = hashToken(refreshToken);
    const user = await User.findOne({ refreshTokenHash: hashed });
    if (!user || !user.refreshTokenExpiresAt) {
      return res.status(401).json({ message: "unauthorized" });
    }
    if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
      return res.status(401).json({ message: "refresh token expired" });
    }
    await issueTokens(res, user);
    return res.json({
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error("Refresh error", err);
    return res.status(500).json({ message: "server error" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    return res.json({
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error("Me error", err);
    return res.status(500).json({ message: "server error" });
  }
});

app.get("/api/2fa/status", authMiddleware, async (req, res) => {
  try {
    const record = await TwoFactor.findOne({ userId: req.userId });

    return res.json({
      enabled: !!record?.enabled,
      hasPendingSetup: !!record?.pendingSecretEnc
    });
  } catch (err) {
    console.error("2FA status error", err);
    return res.status(500).json({ message: "server error" });
  }
});

app.post("/api/2fa/setup", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const secret = new OTPAuth.Secret();

    const totp = new OTPAuth.TOTP({
      issuer: "MyApp",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret
    });

    const otpauthUrl = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    await TwoFactor.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          pendingSecretEnc: encrypt(secret.base32),
          pendingCreatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return res.json({
      manualKey: secret.base32,
      otpauthUrl,
      qrDataUrl
    });
  } catch (err) {
    console.error("2FA setup error", err);
    return res.status(500).json({ message: "server error" });
  }
});

app.post("/api/2fa/verify-setup", authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "token is required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const record = await TwoFactor.findOne({ userId: req.userId });
    if (!record || !record.pendingSecretEnc) {
      return res.status(400).json({ message: "2FA setup not found" });
    }

    const secretBase32 = decrypt(record.pendingSecretEnc);

    const totp = new OTPAuth.TOTP({
      issuer: "MyApp",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32)
    });

    const delta = totp.validate({ token, window: 1 });

    if (delta === null) {
      return res.status(400).json({ message: "invalid code" });
    }

    const { plainCodes, hashedCodes } = await generateRecoveryCodes(10);

    record.secretEnc = record.pendingSecretEnc;
    record.pendingSecretEnc = null;
    record.pendingCreatedAt = null;
    record.enabled = true;
    record.verifiedAt = new Date();
    record.lastUsedStep = totp.counter();
    record.recoveryCodes = hashedCodes;

    await record.save();

    return res.json({
      message: "2FA setup completed successfully",
      recoveryCodes: plainCodes
    });
  } catch (err) {
    console.error("2FA verify setup error", err);
    return res.status(500).json({ message: "server error" });
  }
});

app.post("/api/2fa/disable", authMiddleware, async (req, res) => {
  try {
    await TwoFactor.findOneAndUpdate(
      { userId: req.userId },
      {
        $set: {
          secretEnc: null,
          pendingSecretEnc: null,
          pendingCreatedAt: null,
          enabled: false,
          verifiedAt: null,
          lastUsedStep: null,
          recoveryCodes: []
        }
      }
    );

    return res.json({
      message: "2FA disabled successfully"
    });
  } catch (err) {
    console.error("2FA disable error", err);
    return res.status(500).json({ message: "server error" });
  }
});

app.post("/api/2fa/cancel-setup", authMiddleware, async (req, res) => {
  try {
    await TwoFactor.findOneAndUpdate(
      { userId: req.userId },
      {
        $set: {
          pendingSecretEnc: null,
          pendingCreatedAt: null
        }
      }
    );

    return res.json({
      message: "Pending 2FA setup cancelled"
    });
  } catch (err) {
    console.error("2FA cancel setup error", err);
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
