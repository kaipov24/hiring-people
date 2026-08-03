import express from "express";

import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import companyRoutes from "./routes/company.routes.js";
import healthRoutes from "./routes/health.routes.js";

const app = express();

app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/companies", companyRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
