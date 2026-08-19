import { sendPasswordResetEmail, sendTestEmail, verifyEmailTransport } from "../config/email.js";
import { ActivityEvent } from "../models/activity-event.model.js";
import { CandidateProfile } from "../models/candidate-profile.model.js";
import { Recruiter } from "../models/recruiter.model.js";
import { User } from "../models/user.model.js";
import { deleteUserAndRelatedData } from "../services/user-cleanup.service.js";
import { createPasswordResetToken } from "../utils/tokens.js";

const testUserEmailPatterns = [
  /^seed\./,
  /^recruiter\./,
  /^walkthrough\./,
  /\+e2e@/,
  /@example\.com$/
];

const isTestUser = (user) => {
  return testUserEmailPatterns.some((pattern) => pattern.test(user.email));
};

const userPayload = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isTestUser: isTestUser(user),
  emailVerified: user.emailVerified !== false,
  disabled: Boolean(user.disabledAt),
  disabledReason: user.disabledReason || "",
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const listUsers = async (_req, res) => {
  const users = await User.find({})
    .sort({ createdAt: -1 })
    .limit(500);

  res.status(200).json({
    users: users.map(userPayload)
  });
};

export const sendUserPasswordReset = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    const error = new Error("Пользователь не найден");
    error.status = 404;
    throw error;
  }

  const reset = createPasswordResetToken();
  user.passwordResetToken = reset.passwordResetToken;
  user.passwordResetExpiresAt = reset.passwordResetExpiresAt;
  await user.save();
  await sendPasswordResetEmail({ to: user.email, name: user.name, token: user.passwordResetToken });

  res.status(200).json({
    message: "Ссылка для смены пароля отправлена на email пользователя."
  });
};

export const verifyUserEmail = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    const error = new Error("Пользователь не найден");
    error.status = 404;
    throw error;
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  res.status(200).json({
    user: userPayload(user),
    message: "Email пользователя подтвержден."
  });
};

export const setUserDisabled = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    const error = new Error("Пользователь не найден");
    error.status = 404;
    throw error;
  }

  if (String(user.id) === String(req.user.id)) {
    const error = new Error("Нельзя отключить свой аккаунт.");
    error.status = 400;
    throw error;
  }

  if (req.body.disabled) {
    user.disabledAt = user.disabledAt ?? new Date();
    user.disabledReason = req.body.reason || "Отключено администратором";
  } else {
    user.disabledAt = undefined;
    user.disabledReason = undefined;
  }

  await user.save();

  res.status(200).json({
    user: userPayload(user),
    message: req.body.disabled ? "Пользователь отключен." : "Пользователь включен."
  });
};

export const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    const error = new Error("Пользователь не найден");
    error.status = 404;
    throw error;
  }

  if (String(user.id) === String(req.user.id)) {
    const error = new Error("Нельзя удалить свой аккаунт.");
    error.status = 400;
    throw error;
  }

  await deleteUserAndRelatedData(user.id);

  res.status(200).json({
    message: "Пользователь и связанные данные удалены."
  });
};

export const getActivitySummary = async (_req, res) => {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const [totalUsers, newUsers, candidates, employers, recruiters, anonymousMainViews, authenticatedMainViews] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: since } }),
    CandidateProfile.countDocuments(),
    User.countDocuments({ role: "hiring_manager" }),
    Recruiter.countDocuments(),
    ActivityEvent.countDocuments({ type: "page_view", page: "home", authenticated: false }),
    ActivityEvent.countDocuments({ type: "page_view", page: "home", authenticated: true })
  ]);

  res.status(200).json({
    summary: {
      totalUsers,
      newUsersLast7Days: newUsers,
      candidates,
      employers,
      recruiters,
      mainPageViewsBeforeLogin: anonymousMainViews,
      mainPageViewsAfterLogin: authenticatedMainViews
    }
  });
};

export const getEmailStatus = async (_req, res) => {
  const status = await verifyEmailTransport();

  res.status(200).json({
    email: status
  });
};

export const sendAdminTestEmail = async (req, res) => {
  await sendTestEmail({ to: req.body.email });

  res.status(200).json({
    message: "Тестовое письмо отправлено."
  });
};
