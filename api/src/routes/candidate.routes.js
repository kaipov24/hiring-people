import { Router } from "express";
import { z } from "zod";

import {
  downloadCandidateCv,
  getCandidate,
  getMyCandidateProfile,
  listMyProfileViews,
  listCandidates,
  uploadMyCv,
  updateCandidateStatus,
  upsertMyCandidateProfile
} from "../controllers/candidate.controller.js";
import { cvUpload } from "../config/uploads.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const profileSchema = z.object({
  headline: z.string().trim().max(160).optional(),
  summary: z.string().trim().max(3000).optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  languages: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  accessibilityPreferences: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(160).optional()
});

const statusSchema = z.object({
  status: z.enum(["Viewed", "Contacted", "Hired"])
});

router.get("/", authenticate, authorizeRoles("hiring_manager"), asyncHandler(listCandidates));
router.get("/me", authenticate, authorizeRoles("candidate"), asyncHandler(getMyCandidateProfile));
router.put("/me", authenticate, authorizeRoles("candidate"), validateBody(profileSchema), asyncHandler(upsertMyCandidateProfile));
router.post("/me/cv", authenticate, authorizeRoles("candidate"), cvUpload.single("cv"), asyncHandler(uploadMyCv));
router.get("/me/views", authenticate, authorizeRoles("candidate"), asyncHandler(listMyProfileViews));
router.get("/:id", authenticate, authorizeRoles("hiring_manager"), asyncHandler(getCandidate));
router.get("/:id/cv", authenticate, authorizeRoles("hiring_manager"), asyncHandler(downloadCandidateCv));
router.patch("/:id/status", authenticate, authorizeRoles("hiring_manager"), validateBody(statusSchema), asyncHandler(updateCandidateStatus));

export default router;
