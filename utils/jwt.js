const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "fallback_secret";

const generateAccessToken = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, SECRET + "_refresh", { expiresIn: "30d" });

const verifyAccessToken = (token) => jwt.verify(token, SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, SECRET + "_refresh");

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };