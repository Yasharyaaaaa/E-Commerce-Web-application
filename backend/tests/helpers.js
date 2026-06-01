import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { signAccessToken } from "../utils/jwt.utils.js";

let counter = 0;

// Creates a user directly in the DB and returns a signed access token for it —
// avoids the login rate-limiter and keeps role-based tests deterministic.
export const makeUser = async (role = "user") => {
  counter += 1;
  const user = await User.create({
    username: `${role}user${counter}`,
    email: `${role}${counter}@test.com`,
    password: await bcrypt.hash("secret123", 10),
    role,
  });
  const token = signAccessToken({ _id: user._id, role: user.role, email: user.email });
  return { user, token };
};
