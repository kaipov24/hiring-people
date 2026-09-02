export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
export const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL ?? window.location.origin).replace(/\/+$/, "");
export const DEPLOY_TARGET = import.meta.env.VITE_DEPLOY_TARGET ?? "app";
export const IS_LANDING = DEPLOY_TARGET === "landing";
export const APP_BASE_URL = (import.meta.env.VITE_APP_BASE_URL || PUBLIC_SITE_URL).replace(/\/+$/, "");
export const YEAR = new Date().getFullYear();
export const SESSION_STORAGE_KEY = "inclusive-hire-session";
export const VISITOR_STORAGE_KEY = "inclusive-hire-visitor";

export const publicSeo = {
  title: "Найм людей с инвалидностью в Бишкеке | inclusive-hire",
  description: "inclusive-hire Бишкек — некоммерческая платформа инклюзивного найма в Кыргызстане: работодатели могут нанять человека с инвалидностью, соискатели загружают резюме и показывают навыки.",
  robots: IS_LANDING ? "index,follow,max-image-preview:large" : "noindex,nofollow",
  canonicalPath: "/"
};

export const statusLabels = {
  Viewed: "Просмотрен",
  Contacted: "Связались",
  Hired: "Нанят"
};

export const statuses = Object.keys(statusLabels);

export const availabilityOptions = [
  "Готов(а) к предложениям",
  "Открыт(а) к проектной работе",
  "Рассматриваю предложения",
  "Не ищу работу сейчас"
];

export const employmentFormatLabels = {
  remote: "Онлайн",
  office: "Офлайн",
  hybrid: "Гибрид"
};

export const roleLabels = {
  candidate: "Соискатель",
  hiring_manager: "Работодатель",
  admin: "Админ"
};

export const emptyAuthForm = { name: "", email: "", password: "", role: "candidate" };
export const emptyResetForm = { email: "", token: "", password: "" };
export const emptyAccountForm = { name: "" };
export const emptyProfileForm = {
  headline: "",
  summary: "",
  skills: "",
  languages: "",
  accessibilityPreferences: "",
  location: "",
  portfolio: "",
  availability: "Готов(а) к предложениям",
  employmentFormat: "remote",
  contactEmail: "",
  messengerType: "telegram",
  messenger: ""
};
export const emptyRecruiterForm = {
  name: "",
  description: "",
  website: "",
  contactEmail: "",
  phone: "",
  messenger: "",
  accessibilityCommitments: ""
};
export const emptyFilters = { query: "", location: "", employmentFormat: "", skills: "", languages: "" };

export const sampleCandidates = [
  {
    name: "Айжан М.",
    headline: "UX-исследователь доступных сервисов",
    location: "Бишкек",
    skills: ["исследования", "интервью", "аналитика"],
    languages: ["кыргызча", "русский", "English"]
  },
  {
    name: "Тимур К.",
    headline: "Frontend-разработчик",
    location: "Удаленно",
    skills: ["React", "TypeScript", "доступность"],
    languages: ["русский", "English"]
  },
  {
    name: "Салтанат Р.",
    headline: "HR-координатор инклюзивного найма",
    location: "Ош",
    skills: ["найм", "адаптация", "документы"],
    languages: ["кыргызча", "русский"]
  }
];
