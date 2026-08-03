import bcrypt from "bcryptjs";

import { User } from "../models/user.model.js";
import { signAccessToken } from "../utils/jwt.js";

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role
});

export const register = async (req, res) => {
  const { email, password, role, name } = req.body;
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const error = new Error("An account with this email already exists");
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email,
    passwordHash,
    role,
    name
  });

  res.status(201).json({
    user: publicUser(user),
    token: signAccessToken(user)
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  res.status(200).json({
    user: publicUser(user),
    token: signAccessToken(user)
  });
};

export const me = async (req, res) => {
  res.status(200).json({
    user: publicUser(req.user)
  });
};
