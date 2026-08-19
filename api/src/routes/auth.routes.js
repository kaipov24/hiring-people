import { Router } from "express";
import { z } from "zod";

import { deleteMe, forgotPassword, login, me, register, resendVerification, resetPassword, updateMe, verifyEmail } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const email = z.string().email().trim().toLowerCase();
const password = z.string().min(8).max(128);

const registerSchema = z.object({
  email,
  password,
  role: z.enum(["candidate", "hiring_manager"]),
  name: z.string().trim().min(1).max(120)
});

const loginSchema = z.object({
  email,
  password
});

const emailSchema = z.object({
  email
});

const verifyEmailSchema = z.object({
  token: z.string().trim().min(1)
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password
});

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(120)
});

router.post("/register", validateBody(registerSchema), asyncHandler(register));
router.post("/login", validateBody(loginSchema), asyncHandler(login));
router.post("/verify-email", validateBody(verifyEmailSchema), asyncHandler(verifyEmail));
router.get("/verify-email", asyncHandler(verifyEmail));
router.post("/resend-verification", validateBody(emailSchema), asyncHandler(resendVerification));
router.post("/forgot-password", validateBody(emailSchema), asyncHandler(forgotPassword));
router.post("/reset-password", validateBody(resetPasswordSchema), asyncHandler(resetPassword));
router.get("/me", authenticate, asyncHandler(me));
router.patch("/me", authenticate, validateBody(updateMeSchema), asyncHandler(updateMe));
router.delete("/me", authenticate, asyncHandler(deleteMe));

export default router;
