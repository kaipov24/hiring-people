import { Router } from "express";
import { z } from "zod";

import { getActivitySummary, getEmailStatus, listUsers, sendAdminTestEmail, sendUserPasswordReset } from "../controllers/admin.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const testEmailSchema = z.object({
  email: z.string().email().trim().toLowerCase()
});

router.use(authenticate, authorizeRoles("admin"));

router.get("/users", asyncHandler(listUsers));
router.post("/users/:id/password-reset", asyncHandler(sendUserPasswordReset));
router.get("/activity", asyncHandler(getActivitySummary));
router.get("/email/status", asyncHandler(getEmailStatus));
router.post("/email/test", validateBody(testEmailSchema), asyncHandler(sendAdminTestEmail));

export default router;
