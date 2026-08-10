import crypto from "node:crypto";

export const createEmailVerificationToken = () => ({
  emailVerificationToken: crypto.randomBytes(24).toString("hex"),
  emailVerificationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
});

export const createPasswordResetToken = () => ({
  passwordResetToken: crypto.randomBytes(24).toString("hex"),
  passwordResetExpiresAt: new Date(Date.now() + 1000 * 60 * 30)
});
