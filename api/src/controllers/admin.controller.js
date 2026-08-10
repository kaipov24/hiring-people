import { sendPasswordResetEmail, sendTestEmail, verifyEmailTransport } from "../config/email.js";
import { ActivityEvent } from "../models/activity-event.model.js";
import { CandidateProfile } from "../models/candidate-profile.model.js";
import { Company } from "../models/company.model.js";
import { User } from "../models/user.model.js";
import { createPasswordResetToken } from "../utils/tokens.js";

const testUserEmailPatterns = [
  /^seed\./,
  /^company\./,
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

export const getActivitySummary = async (_req, res) => {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const [totalUsers, newUsers, candidates, employers, companies, anonymousMainViews, authenticatedMainViews] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: since } }),
    CandidateProfile.countDocuments(),
    User.countDocuments({ role: "hiring_manager" }),
    Company.countDocuments(),
    ActivityEvent.countDocuments({ type: "page_view", page: "home", authenticated: false }),
    ActivityEvent.countDocuments({ type: "page_view", page: "home", authenticated: true })
  ]);

  res.status(200).json({
    summary: {
      totalUsers,
      newUsersLast7Days: newUsers,
      candidates,
      employers,
      companies,
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
