import bcrypt from "bcryptjs";

import { isConfiguredAdmin } from "../config/admin.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../config/email.js";
import { User } from "../models/user.model.js";
import { signAccessToken } from "../utils/jwt.js";
import { createEmailVerificationToken, createPasswordResetToken } from "../utils/tokens.js";

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: isConfiguredAdmin(user.email) ? "admin" : user.role,
  emailVerified: user.emailVerified !== false,
  disabled: Boolean(user.disabledAt)
});

export const register = async (req, res) => {
  const { email, password, role, name } = req.body;
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const error = new Error("Аккаунт с таким email уже существует");
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verification = createEmailVerificationToken();
  const user = await User.create({
    email,
    passwordHash,
    role,
    name,
    emailVerified: false,
    ...verification
  });
  await sendVerificationEmail({ to: email, name, token: verification.emailVerificationToken });

  res.status(201).json({
    user: publicUser(user),
    emailVerificationRequired: true,
    message: "Мы отправили ссылку для подтверждения email."
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("Неверный email или пароль");
    error.status = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    const error = new Error("Неверный email или пароль");
    error.status = 401;
    throw error;
  }

  if (user.emailVerified === false) {
    const error = new Error("Подтвердите email перед входом");
    error.status = 403;
    throw error;
  }

  if (user.disabledAt) {
    const error = new Error("Аккаунт отключен. Обратитесь к администратору.");
    error.status = 403;
    throw error;
  }

  res.status(200).json({
    user: publicUser(user),
    token: signAccessToken(user)
  });
};

export const verifyEmail = async (req, res) => {
  const token = String(req.query.token ?? req.body.token ?? "").trim();

  if (!token) {
    const error = new Error("Токен подтверждения обязателен");
    error.status = 400;
    throw error;
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    const error = new Error("Ссылка подтверждения недействительна или устарела");
    error.status = 400;
    throw error;
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  res.status(200).json({
    user: publicUser(user),
    token: signAccessToken(user)
  });
};

export const resendVerification = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user || user.emailVerified !== false) {
    res.status(200).json({ message: "Если аккаунт требует подтверждения, ссылка будет отправлена." });
    return;
  }

  const verification = createEmailVerificationToken();
  user.emailVerificationToken = verification.emailVerificationToken;
  user.emailVerificationExpiresAt = verification.emailVerificationExpiresAt;
  await user.save();
  await sendVerificationEmail({ to: user.email, name: user.name, token: verification.emailVerificationToken });

  res.status(200).json({
    message: "Если аккаунт требует подтверждения, ссылка будет отправлена."
  });
};

export const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    res.status(200).json({
      message: "Если аккаунт существует, ссылка для смены пароля будет отправлена на email."
    });
    return;
  }

  const reset = createPasswordResetToken();
  user.passwordResetToken = reset.passwordResetToken;
  user.passwordResetExpiresAt = reset.passwordResetExpiresAt;
  await user.save();
  await sendPasswordResetEmail({ to: user.email, name: user.name, token: reset.passwordResetToken });

  res.status(200).json({
    message: "Если аккаунт существует, ссылка для смены пароля будет отправлена на email."
  });
};

export const resetPassword = async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: req.body.token,
    passwordResetExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    const error = new Error("Ссылка для смены пароля недействительна или устарела");
    error.status = 400;
    throw error;
  }

  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  res.status(200).json({
    message: "Пароль обновлен. Теперь можно войти."
  });
};

export const me = async (req, res) => {
  res.status(200).json({
    user: publicUser(req.user)
  });
};

export const updateMe = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      $set: {
        name: req.body.name
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    user: publicUser(user)
  });
};
