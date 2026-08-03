import { Router } from "express";
import { z } from "zod";

import { getMyCompany, listHiredCompanies, upsertMyCompany } from "../controllers/company.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const companySchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  website: z.string().trim().url().max(300).optional(),
  accessibilityCommitments: z.array(z.string().trim().min(1).max(200)).max(20).default([])
});

router.get("/hired", asyncHandler(listHiredCompanies));
router.get("/me", authenticate, authorizeRoles("hiring_manager"), asyncHandler(getMyCompany));
router.put("/me", authenticate, authorizeRoles("hiring_manager"), validateBody(companySchema), asyncHandler(upsertMyCompany));

export default router;
