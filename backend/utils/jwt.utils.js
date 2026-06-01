import jwt from "jsonwebtoken";

// Centralised token helpers. Access tokens are short-lived and signed with
// JWT_SECRET (verified by the HTTP middleware and the Socket.io handshake).
// Refresh tokens are long-lived, signed with REFRESH_SECRET, and only ever
// travel in an httpOnly cookie.
export const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_EXPIRES_IN || "15m",
  });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.REFRESH_EXPIRES_IN || "7d",
  });

// Throws if the token is missing/invalid/expired. Returns the decoded payload
// (shape: { _id, role, email }).
export const verifyAccessToken = (token) => {
  if (!token) throw new Error("No token provided");
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
  if (!token) throw new Error("No refresh token provided");
  return jwt.verify(token, process.env.REFRESH_SECRET || process.env.JWT_SECRET);
};
