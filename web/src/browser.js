import { APP_BASE_URL, SESSION_STORAGE_KEY, VISITOR_STORAGE_KEY } from "./config.js";

export const toList = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);

export const contactInfo = (profile) => ({
  email: profile?.contacts?.email || profile?.user?.email || "contact@inclusive-hire.local",
  messengerType: profile?.contacts?.messengerType || "telegram",
  messenger: profile?.contacts?.messenger || "@inclusive_hire"
});

export const authUrl = (mode, role = "candidate") => `${APP_BASE_URL}/#${mode}?role=${role}`;

export const readStoredSession = () => {
  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

export const readVisitorId = () => {
  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing) return existing;

  const id = window.crypto?.randomUUID?.() ?? `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(VISITOR_STORAGE_KEY, id);
  return id;
};

export const readEntityRoute = (entity) => {
  const pathMatch = window.location.pathname.match(new RegExp(`^/${entity}/([^/]+)$`));
  if (pathMatch) return decodeURIComponent(pathMatch[1]);

  const route = window.location.hash.slice(1).split("?")[0];
  const hashMatch = route.match(new RegExp(`^${entity}/([^/]+)$`));
  return hashMatch ? decodeURIComponent(hashMatch[1]) : "";
};

export const readAuthLink = () => {
  const hash = window.location.hash;
  const [route, query = ""] = hash.slice(1).split("?");
  const params = new URLSearchParams(query || window.location.search);
  const token = params.get("token") ?? "";
  const role = params.get("role") === "hiring_manager" ? "hiring_manager" : "candidate";

  if (route === "reset-password" && token) return { mode: "reset", token };
  if (route === "verify-email" && token) return { mode: "verify", token };
  if (route === "login" || route === "register") return { mode: route, role };
  return null;
};

export const readCandidateRoute = () => {
  return readEntityRoute("candidates");
};

export const readRecruiterRoute = () => {
  return readEntityRoute("recruiters");
};
