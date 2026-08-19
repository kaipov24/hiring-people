const shouldLog = (req, statusCode, durationMs) => {
  if (req.path === "/health") return false;
  return statusCode >= 400 || durationMs >= 1000;
};

export const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    if (!shouldLog(req, res.statusCode, durationMs)) return;

    const level = res.statusCode >= 500 ? "error" : "warn";
    const message = [
      `request ${req.method} ${req.originalUrl}`,
      `status=${res.statusCode}`,
      `durationMs=${durationMs.toFixed(1)}`,
      `ip=${req.ip}`
    ].join(" ");

    console[level](message);
  });

  next();
};
