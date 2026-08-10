import { Router } from "express";
import { z } from "zod";

import { recordPageView } from "../controllers/activity.controller.js";
import { optionalAuthenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const pageViewSchema = z.object({
  page: z.string().trim().min(1).max(80).default("home"),
  visitorId: z.string().trim().max(120).optional()
});

router.post("/page-view", optionalAuthenticate, validateBody(pageViewSchema), asyncHandler(recordPageView));

export default router;
