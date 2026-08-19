import { Router } from "express";
import { z } from "zod";

import {
  deleteUser,
  getActivitySummary,
  getEmailStatus,
  listUsers,
  sendAdminTestEmail,
  sendUserPasswordReset,
  setUserDisabled,
  verifyUserEmail
} from "../controllers/admin.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const testEmailSchema = z.object({
  email: z.string().email().trim().toLowerCase()
});

const disabledSchema = z.object({
  disabled: z.boolean(),
  reason: z.string().trim().max(300).optional()
});

router.use(authenticate, authorizeRoles("admin"));

router.get("/users", asyncHandler(listUsers));
router.post("/users/:id/password-reset", asyncHandler(sendUserPasswordReset));
router.post("/users/:id/verify-email", asyncHandler(verifyUserEmail));
router.patch("/users/:id/disabled", validateBody(disabledSchema), asyncHandler(setUserDisabled));
router.delete("/users/:id", asyncHandler(deleteUser));
router.get("/activity", asyncHandler(getActivitySummary));
router.get("/email/status", asyncHandler(getEmailStatus));
router.post("/email/test", validateBody(testEmailSchema), asyncHandler(sendAdminTestEmail));

export default router;
