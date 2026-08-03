import { Router } from "express";
import { z } from "zod";

import { login, me, register } from "../controllers/auth.controller.js";
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

router.post("/register", validateBody(registerSchema), asyncHandler(register));
router.post("/login", validateBody(loginSchema), asyncHandler(login));
router.get("/me", authenticate, asyncHandler(me));

export default router;
