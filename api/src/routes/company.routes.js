import { Router } from "express";
import { z } from "zod";

import { getCompany, getMyCompany, listCompanies, upsertMyCompany } from "../controllers/company.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const companySchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  website: z.string().trim().url().max(300).optional(),
  contacts: z.object({
    email: z.string().trim().email().max(160).optional(),
    phone: z.string().trim().max(80).optional(),
    messenger: z.string().trim().max(160).optional()
  }).optional(),
  accessibilityCommitments: z.array(z.string().trim().min(1).max(200)).max(20).default([])
});

router.get("/", authenticate, asyncHandler(listCompanies));
router.get("/me", authenticate, authorizeRoles("hiring_manager"), asyncHandler(getMyCompany));
router.put("/me", authenticate, authorizeRoles("hiring_manager"), validateBody(companySchema), asyncHandler(upsertMyCompany));
router.get("/:id", authenticate, asyncHandler(getCompany));

export default router;
