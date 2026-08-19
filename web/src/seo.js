import { PUBLIC_SITE_URL, publicSeo } from "./config.js";

const setMetaContent = (selector, content) => {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute("content", content);
};

const setCanonical = (url) => {
  let canonical = document.head.querySelector("link[rel='canonical']");
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.append(canonical);
  }
  canonical.setAttribute("href", url);
};

export const setDocumentSeo = ({ title, description, robots, canonicalPath }) => {
  const canonicalUrl = `${PUBLIC_SITE_URL}${canonicalPath}`;
  document.title = title;
  setMetaContent("meta[name='description']", description);
  setMetaContent("meta[name='robots']", robots);
  setMetaContent("meta[property='og:title']", title);
  setMetaContent("meta[property='og:description']", description);
  setMetaContent("meta[property='og:url']", canonicalUrl);
  setMetaContent("meta[name='twitter:title']", title);
  setMetaContent("meta[name='twitter:description']", description);
  setCanonical(canonicalUrl);
};

export const seoForAppState = ({ user, page, selectedProfile, selectedRecruiter }) => {
  if (!user) return publicSeo;

  if (selectedProfile) {
    return {
      title: `${selectedProfile.user?.name ?? "Профиль соискателя"} | inclusive-hire`,
      description: "Полный профиль соискателя доступен зарегистрированным пользователям inclusive-hire.",
      robots: "noindex,nofollow",
      canonicalPath: "/"
    };
  }

  if (selectedRecruiter) {
    return {
      title: `${selectedRecruiter.name ?? "Профиль рекрутера"} | inclusive-hire`,
      description: "Профиль рекрутера доступен зарегистрированным пользователям inclusive-hire.",
      robots: "noindex,nofollow",
      canonicalPath: "/"
    };
  }

  const privateTitles = {
    adminActivity: "Администрирование активности | inclusive-hire",
    adminUsers: "Администрирование пользователей | inclusive-hire",
    candidates: "Профили соискателей | inclusive-hire",
    recruiter: "Профиль рекрутера | inclusive-hire",
    recruiters: "Рекрутеры | inclusive-hire",
    directory: "Профили соискателей | inclusive-hire",
    profile: "Мой профиль соискателя | inclusive-hire"
  };

  return {
    title: privateTitles[page] ?? "inclusive-hire",
    description: "Рабочий раздел inclusive-hire доступен после входа в аккаунт.",
    robots: "noindex,nofollow",
    canonicalPath: "/"
  };
};
