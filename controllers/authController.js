const { validationResult } = require("express-validator");
const User = require("../models/User");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");

const sendToken = (user, status, res) => {
  const token = generateAccessToken({ id: user._id, email: user.email, role: user.role });
  const refresh = generateRefreshToken({ id: user._id });
  res.status(status)
    .cookie("token", token, { httpOnly: true, secure: false, sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json({ success: true, accessToken: token, refreshToken: refresh, user: user.toJSON() });
};

const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });

  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email }))
      return res.status(409).json({ success: false, message: "Email already registered." });

    const user = await User.create({ name, email, password });
    sendToken(user, 201, res);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error during signup." });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password +loginAttempts +lockUntil");
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password." });

    if (user.isLocked()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${mins} minute(s).` });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    await user.resetLoginAttempts();
    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error during login." });
  }
};

const logout = (req, res) => res.clearCookie("token").json({ success: true, message: "Logged out." });

const getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user: user.toJSON() });
};

module.exports = { signup, login, logout, getMe };