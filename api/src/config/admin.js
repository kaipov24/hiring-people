export const configuredAdminEmails = () => {
  return String(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

export const isConfiguredAdmin = (email) => {
  return configuredAdminEmails().includes(String(email ?? "").toLowerCase());
};
