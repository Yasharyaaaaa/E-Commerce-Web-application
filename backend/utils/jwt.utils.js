import jwt from "jsonwebtoken";

// Centralised access-token helpers. The HTTP middleware and the Socket.io
// handshake both verify tokens the same way through verifyAccessToken().
export const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

// Throws if the token is missing/invalid/expired. Returns the decoded payload
// (shape: { _id, role, email }).
export const verifyAccessToken = (token) => {
  if (!token) throw new Error("No token provided");
  return jwt.verify(token, process.env.JWT_SECRET);
};
