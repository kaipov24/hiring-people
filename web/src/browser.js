import { APP_BASE_URL, SESSION_STORAGE_KEY, VISITOR_STORAGE_KEY } from "./config.js";

export const toList = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);

export const contactInfo = (profile) => ({
  email: profile?.contacts?.email || profile?.user?.email || "admin@inclusive-hire.org.kg",
  messengerType: profile?.contacts?.messengerType || "telegram",
  messenger: profile?.contacts?.messenger || "@inclusive_hire"
});

export const externalUrl = (value) => {
  const url = String(value ?? "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};

const digitsOnly = (value) => String(value ?? "").replace(/[^\d]/g, "");

export const messengerUrl = ({ messengerType, messenger }) => {
  const value = String(messenger ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  if (messengerType === "whatsapp") {
    const phone = digitsOnly(value);
    return phone ? `https://wa.me/${phone}` : "";
  }

  const username = value.replace(/^@/, "");
  return username ? `https://t.me/${encodeURIComponent(username)}` : "";
};

export const authUrl = (mode, role = "candidate") => {
  const params = new URLSearchParams();
  if (mode === "register" || role === "hiring_manager") params.set("role", role);
  const query = params.toString();
  return `${APP_BASE_URL}/${mode}${query ? `?${query}` : ""}`;
};

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
  const pathRoute = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  const pathParams = new URLSearchParams(window.location.search);
  const pathToken = pathParams.get("token") ?? "";
  const pathRole = pathParams.get("role") === "hiring_manager" ? "hiring_manager" : "candidate";

  if (pathRoute === "reset-password" && pathToken) return { mode: "reset", token: pathToken };
  if (pathRoute === "verify-email") return { mode: "verify", token: pathToken };
  if (pathRoute === "login" || pathRoute === "register") return { mode: pathRoute, role: pathRole };
  if (pathRoute === "forgot-password") return { mode: "forgot" };

  const hash = window.location.hash;
  const [route, query = ""] = hash.slice(1).split("?");
  const params = new URLSearchParams(query || window.location.search);
  const token = params.get("token") ?? "";
  const role = params.get("role") === "hiring_manager" ? "hiring_manager" : "candidate";

  if (route === "reset-password" && token) return { mode: "reset", token };
  if (route === "verify-email") return { mode: "verify", token };
  if (route === "login" || route === "register") return { mode: route, role };
  return null;
};

export const readCandidateRoute = () => {
  return readEntityRoute("candidates");
};

export const readRecruiterRoute = () => {
  return readEntityRoute("recruiters");
};
