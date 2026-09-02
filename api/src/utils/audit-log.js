const sanitize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export const auditLog = (event, fields = {}) => {
  const parts = [`[audit] event=${sanitize(event)}`];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${key}=${sanitize(value)}`);
  }

  console.info(parts.join(" "));
};
