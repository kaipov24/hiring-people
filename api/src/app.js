import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";
import activityRoutes from "./routes/activity.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import recruiterRoutes from "./routes/recruiter.routes.js";
import healthRoutes from "./routes/health.routes.js";

const app = express();

const rateLimitMessage = {
  error: {
    message: "Слишком много запросов. Попробуйте позже.",
    status: 429
  }
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: rateLimitMessage
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      message: "Слишком много попыток. Попробуйте снова через несколько минут.",
      status: 429
    }
  }
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      message: "Слишком много email-запросов. Попробуйте позже.",
      status: 429
    }
  }
});

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

app.use("/health", healthRoutes);
app.use("/api/health", healthRoutes);
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", emailLimiter);
app.use("/api/auth/resend-verification", emailLimiter);
app.use("/api/auth/forgot-password", emailLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/activity", activityRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/recruiters", recruiterRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
