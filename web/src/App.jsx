import React, { useEffect, useMemo, useState } from "react";

import { authHeaders, request } from "./api.js";
import { authUrl, contactInfo, externalUrl, messengerUrl, readAuthLink, readCandidateRoute, readRecruiterRoute, readStoredSession, readVisitorId, toList } from "./browser.js";
import {
  API_BASE_URL,
  APP_BASE_URL,
  availabilityOptions,
  emptyAccountForm,
  emptyAuthForm,
  emptyFilters,
  emptyProfileForm,
  emptyRecruiterForm,
  emptyResetForm,
  employmentFormatLabels,
  IS_LANDING,
  PUBLIC_SITE_URL,
  roleLabels,
  sampleCandidates,
  SESSION_STORAGE_KEY,
  statusLabels,
  statuses,
  YEAR
} from "./config.js";
import { seoForAppState, setDocumentSeo } from "./seo.js";

function App() {
  const initialAuthLink = !IS_LANDING ? readAuthLink() : null;
  const [session, setSession] = useState(IS_LANDING ? null : readStoredSession);
  const [page, setPageState] = useState("home");
  const [appHealth, setAppHealth] = useState(IS_LANDING ? "checking" : "online");
  const [authOpen, setAuthOpen] = useState(Boolean(initialAuthLink));
  const [authMode, setAuthMode] = useState(initialAuthLink?.mode ?? "login");
  const [authForm, setAuthForm] = useState({ ...emptyAuthForm, role: initialAuthLink?.role ?? "candidate" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [verificationToken, setVerificationToken] = useState(initialAuthLink?.mode === "verify" ? initialAuthLink.token : "");
  const [resetForm, setResetForm] = useState(initialAuthLink?.mode === "reset" ? { ...emptyResetForm, token: initialAuthLink.token } : emptyResetForm);
  const [formNotice, setFormNotice] = useState("");
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [profileViews, setProfileViews] = useState([]);
  const [profileViewsLoaded, setProfileViewsLoaded] = useState(false);
  const [profileViewsLoading, setProfileViewsLoading] = useState(false);
  const [recruiterForm, setRecruiterForm] = useState(emptyRecruiterForm);
  const [recruiterProfile, setRecruiterProfile] = useState(null);
  const [recruiterEditing, setRecruiterEditing] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const [employees, setEmployees] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminActivity, setAdminActivity] = useState(null);
  const [adminNotice, setAdminNotice] = useState("");
  const [adminActionState, setAdminActionState] = useState({});

  const user = session?.user;
  const token = session?.token;
  const isCandidate = user?.role === "candidate";
  const isManager = user?.role === "hiring_manager";
  const isAdmin = user?.role === "admin";
  const showAuthPage = !IS_LANDING && authOpen && !user;
  const publicSiteHref = new URL(PUBLIC_SITE_URL, window.location.href).href;
  const shouldRedirectLoggedOut = !IS_LANDING && !user && !authOpen && !readAuthLink() && publicSiteHref !== window.location.href;
  const profileLists = useMemo(
    () => ({
      skills: toList(profileForm.skills),
      languages: toList(profileForm.languages)
    }),
    [profileForm.skills, profileForm.languages]
  );

  const setPage = (nextPage) => {
    setPageState(nextPage);
    window.history.replaceState(null, "", nextPage === "home" ? "/" : `/#${nextPage}`);
    setSelectedProfile(null);
    setSelectedRecruiter(null);
    setFormNotice("");
  };

  useEffect(() => {
    document.documentElement.lang = "ru";

    const syncAuthRoute = () => {
      const authLink = readAuthLink();
      if (!authLink || IS_LANDING) {
        setAuthOpen(false);
        return;
      }

      setAuthError("");
      setAuthNotice("");

      if (authLink.mode === "reset") {
        setVerificationToken("");
        setResetForm({ ...emptyResetForm, token: authLink.token });
        setAuthMode("reset");
      } else if (authLink.mode === "verify") {
        setResetForm(emptyResetForm);
        setVerificationToken(authLink.token);
        setAuthMode("verify");
      } else {
        setVerificationToken("");
        setResetForm(emptyResetForm);
        setAuthForm({ ...emptyAuthForm, role: authLink.role ?? "candidate" });
        setAuthMode(authLink.mode);
      }

      setAuthOpen(true);
    };

    syncAuthRoute();
    window.addEventListener("popstate", syncAuthRoute);
    window.addEventListener("hashchange", syncAuthRoute);

    return () => {
      window.removeEventListener("popstate", syncAuthRoute);
      window.removeEventListener("hashchange", syncAuthRoute);
    };
  }, []);

  useEffect(() => {
    if (!shouldRedirectLoggedOut) return;
    window.location.replace(publicSiteHref);
  }, [shouldRedirectLoggedOut, publicSiteHref]);

  useEffect(() => {
    if (IS_LANDING) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 3500);

      fetch(`${APP_BASE_URL}/health`, { signal: controller.signal })
        .then((response) => setAppHealth(response.ok ? "online" : "offline"))
        .catch(() => setAppHealth("offline"))
        .finally(() => window.clearTimeout(timeout));

      return () => {
        window.clearTimeout(timeout);
        controller.abort();
      };
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);

    fetch("/health", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) window.location.replace(PUBLIC_SITE_URL);
      })
      .catch(() => window.location.replace(PUBLIC_SITE_URL))
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    setDocumentSeo(seoForAppState({ user, page, selectedProfile, selectedRecruiter }));
  }, [user?.id, page, selectedProfile?.id, selectedRecruiter?.id]);

  useEffect(() => {
    if (session) window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }, [session]);

  useEffect(() => {
    if (!user) {
      setPageState("home");
      return;
    }

    setAccountForm({ name: user.name ?? "" });
    setPageState(readRecruiterRoute() ? "recruiters" : isManager && readCandidateRoute() ? "candidate" : isAdmin ? "adminActivity" : isManager ? "directory" : "profile");
  }, [user?.id, user?.role, isAdmin, isManager]);

  useEffect(() => {
    if ((!isManager && !isCandidate) || !token) return;

    const loadCandidateRoute = async () => {
      const candidateId = readCandidateRoute();
      if (!candidateId) return;

      try {
        const data = await request(`/api/candidates/${candidateId}`, { headers: authHeaders(token) });
        setSelectedProfile(data.candidate);
        setPageState("candidate");
      } catch (error) {
        setFormNotice(error.message);
        setPage(isManager ? "directory" : "candidates");
      }
    };

    loadCandidateRoute();
    window.addEventListener("hashchange", loadCandidateRoute);
    window.addEventListener("popstate", loadCandidateRoute);
    return () => {
      window.removeEventListener("hashchange", loadCandidateRoute);
      window.removeEventListener("popstate", loadCandidateRoute);
    };
  }, [isManager, isCandidate, token]);

  useEffect(() => {
    if (!isManager || !token) return;
    loadEmployees(undefined, filters);
    request("/api/recruiters/me", { headers: authHeaders(token) })
      .then((data) => {
        const recruiter = data.recruiter;
        setRecruiterProfile(recruiter);
        setRecruiterForm({
          name: recruiter.name ?? "",
          description: recruiter.description ?? "",
          website: recruiter.website ?? "",
          contactEmail: recruiter.contacts?.email ?? "",
          phone: recruiter.contacts?.phone ?? "",
          messenger: recruiter.contacts?.messenger ?? "",
          accessibilityCommitments: (recruiter.accessibilityCommitments ?? []).join(", ")
        });
        setRecruiterEditing(false);
      })
      .catch(() => {
        setRecruiterProfile(null);
        setRecruiterForm(emptyRecruiterForm);
        setRecruiterEditing(true);
      });
  }, [isManager, token]);

  useEffect(() => {
    if (!isCandidate || !token) return;

    request("/api/candidates/me", { headers: authHeaders(token) })
      .then((data) => {
        const profile = data.candidate;
        setCandidateProfile(profile);
        setProfileForm({
          headline: profile.headline ?? "",
          summary: profile.summary ?? "",
          skills: (profile.skills ?? []).join(", "),
          languages: (profile.languages ?? []).join(", "),
          accessibilityPreferences: profile.accessibilityPreferences ?? "",
          location: profile.location ?? "",
          portfolio: profile.portfolio ?? "",
          availability: profile.availability ?? "Готов(а) к предложениям",
          employmentFormat: profile.employmentFormat ?? "remote",
          contactEmail: profile.contacts?.email ?? user.email ?? "",
          messengerType: profile.contacts?.messengerType ?? "telegram",
          messenger: profile.contacts?.messenger ?? ""
        });
      })
      .catch((error) => {
        if (handleAuthExpired(error)) return;
        setCandidateProfile(null);
        setProfileForm(emptyProfileForm);
      });
  }, [isCandidate, token]);

  useEffect(() => {
    if (!isCandidate || !token || page !== "profile") return;
    loadProfileViews();
  }, [isCandidate, token, page]);

  useEffect(() => {
    if (!user || !token) return;
    if (isCandidate && page === "candidates") loadEmployees(undefined, filters);
    if (page === "recruiters") loadRecruiters();
  }, [user?.id, isCandidate, token, page]);

  useEffect(() => {
    if (!user || !token) return;

    const loadRecruiterRoute = async () => {
      const recruiterId = readRecruiterRoute();
      if (!recruiterId) return;

      try {
        const data = await request(`/api/recruiters/${recruiterId}`, { headers: authHeaders(token) });
        setSelectedRecruiter(data.recruiter);
        setPageState("recruiters");
      } catch (error) {
        setFormNotice(error.message);
        setPage(isCandidate ? "recruiters" : isManager ? "directory" : "home");
      }
    };

    loadRecruiterRoute();
    window.addEventListener("hashchange", loadRecruiterRoute);
    window.addEventListener("popstate", loadRecruiterRoute);
    return () => {
      window.removeEventListener("hashchange", loadRecruiterRoute);
      window.removeEventListener("popstate", loadRecruiterRoute);
    };
  }, [user?.id, token]);

  useEffect(() => {
    if (IS_LANDING) return;
    if (user || page !== "home") return;
    recordPageView("home");
  }, [page, user?.id]);

  useEffect(() => {
    if (IS_LANDING) return;
    if (!user) return;
    recordPageView("home");
  }, [user?.id]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    if (page === "adminUsers") loadAdminUsers();
    if (page === "adminActivity") loadAdminActivity();
  }, [isAdmin, token, page]);

  const recordPageView = async (viewPage) => {
    try {
      await fetch(`${API_BASE_URL}/api/activity/page-view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? authHeaders(token) : {})
        },
        body: JSON.stringify({ page: viewPage, visitorId: readVisitorId() })
      });
    } catch {
      // Analytics should never block the user flow.
    }
  };

  const authPath = (mode, role = "candidate") => {
    if (mode === "forgot") return "/forgot-password";
    if (mode === "register") return `/register?role=${role}`;
    return `/${mode}`;
  };

  const showAuth = (mode, role = "candidate", options = {}) => {
    setAuthMode(mode);
    setAuthForm({ ...emptyAuthForm, role });
    setAuthError("");
    setAuthLoading(false);
    setAuthNotice("");
    setVerificationToken("");
    setResetForm({ ...emptyResetForm, email: authForm.email });
    setAuthOpen(true);
    if (options.writeHistory !== false) {
      window.history.pushState(null, "", authPath(mode, role));
    }
  };

  const closeAuth = () => {
    setAuthOpen(false);
    setAuthError("");
    setAuthLoading(false);
    setAuthNotice("");
    window.history.pushState(null, "", "/");
  };

  const clearPrivateState = () => {
    setCandidateProfile(null);
    setProfileViews([]);
    setProfileViewsLoaded(false);
    setProfileViewsLoading(false);
    setEmployees([]);
    setRecruiters([]);
    setSelectedProfile(null);
    setSelectedRecruiter(null);
    setAdminUsers([]);
    setAdminActivity(null);
    setAdminActionState({});
  };

  const handleAuthExpired = (error) => {
    if (error.status !== 401 && error.status !== 403) return false;

    setSession(null);
    clearPrivateState();
    setFormNotice("Сессия истекла. Войдите снова.");
    showAuth("login", user?.role === "hiring_manager" ? "hiring_manager" : "candidate");
    return true;
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const path = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = authMode === "login"
        ? { email: authForm.email, password: authForm.password }
        : authForm;
      const data = await request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (data.emailVerificationRequired) {
        setVerificationToken("");
        setAuthNotice(data.message ?? "Мы отправили ссылку для подтверждения email. Проверьте входящие и папку Спам.");
        setAuthMode("verify");
        window.history.replaceState(null, "", "/verify-email");
        return;
      }

      setSession(data);
      closeAuth();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyEmail = async () => {
    setAuthError("");
    setAuthNotice("");
    setAuthLoading(true);

    try {
      const data = await request("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken })
      });
      setSession(data);
      closeAuth();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const requestPasswordReset = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");
    setAuthLoading(true);

    try {
      const data = await request("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetForm.email })
      });
      setAuthNotice("Если такой email зарегистрирован, мы отправили ссылку для установки нового пароля.");
      setResetForm({ ...resetForm, token: data.passwordResetToken ?? "" });
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");
    setAuthLoading(true);

    try {
      const data = await request("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetForm.token, password: resetForm.password })
      });
      setAuthNotice(data.message);
      setAuthForm({ ...authForm, email: resetForm.email, password: "" });
      setAuthMode("login");
      setResetForm(emptyResetForm);
      window.history.replaceState(null, "", "/login");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = () => {
    setSession(null);
    clearPrivateState();
    setPage("home");
  };

  const deleteOwnAccount = async () => {
    setFormNotice("");
    setDeleteAccountLoading(true);
    try {
      await request("/api/auth/me", {
        method: "DELETE",
        headers: authHeaders(token)
      });
      setDeleteAccountOpen(false);
      setSession(null);
      clearPrivateState();
      setPage("home");
      setFormNotice("Аккаунт удален.");
    } catch (error) {
      if (handleAuthExpired(error)) return;
      setFormNotice(error.message);
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setFormNotice("");

    try {
      const [accountData, profileData] = await Promise.all([
        request("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders(token) },
          body: JSON.stringify(accountForm)
        }),
        request("/api/candidates/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders(token) },
          body: JSON.stringify({
            ...profileForm,
            skills: profileLists.skills,
            languages: profileLists.languages,
            employmentFormat: profileForm.employmentFormat,
            contacts: {
              email: profileForm.contactEmail || undefined,
              messengerType: profileForm.messengerType,
              messenger: profileForm.messenger || undefined
            }
          })
        })
      ]);

      setSession({ ...session, user: accountData.user });
      setCandidateProfile(profileData.candidate);
      setFormNotice("Профиль сохранен.");
    } catch (error) {
      if (handleAuthExpired(error)) return;
      setFormNotice(error.message);
    }
  };

  const uploadCv = async (event) => {
    event.preventDefault();
    setFormNotice("");
    const file = event.currentTarget.elements.cv.files[0];

    if (!file) {
      setFormNotice("Выберите файл резюме.");
      return;
    }

    const formData = new FormData();
    formData.append("cv", file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/candidates/me/cv`, {
        method: "POST",
        headers: authHeaders(token),
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.error?.message ?? "Резюме не загружено");
        error.status = response.status;
        throw error;
      }
      setCandidateProfile(data.candidate);
      setFormNotice("Резюме загружено.");
    } catch (error) {
      if (handleAuthExpired(error)) return;
      setFormNotice(error.message);
    }
  };

  const downloadCandidateCv = async (profile) => {
    if (!profile?.cv?.originalName) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/candidates/${profile.id}/cv`, {
        headers: authHeaders(token)
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleAuthExpired({ status: response.status });
          return;
        }
        setFormNotice("Не удалось скачать резюме.");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = profile.cv.originalName;
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setFormNotice("Не удалось скачать резюме.");
    }
  };

  const loadProfileViews = async () => {
    setFormNotice("");
    setProfileViewsLoading(true);
    try {
      const data = await request("/api/candidates/me/views", { headers: authHeaders(token) });
      setProfileViews(data.views ?? []);
      setProfileViewsLoaded(true);
    } catch (error) {
      if (handleAuthExpired(error)) return;
      setFormNotice(error.message);
      setProfileViewsLoaded(true);
    } finally {
      setProfileViewsLoading(false);
    }
  };

  const saveRecruiter = async (event) => {
    event.preventDefault();
    setFormNotice("");

    try {
      await request("/api/recruiters/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          ...recruiterForm,
          website: recruiterForm.website || undefined,
          contacts: {
            email: recruiterForm.contactEmail || undefined,
            phone: recruiterForm.phone || undefined,
            messenger: recruiterForm.messenger || undefined
          },
          accessibilityCommitments: toList(recruiterForm.accessibilityCommitments)
        })
      });
      const recruiter = await request("/api/recruiters/me", { headers: authHeaders(token) });
      setRecruiterProfile(recruiter.recruiter);
      setRecruiterEditing(false);
      loadEmployees(undefined, filters);
    } catch (error) {
      if (handleAuthExpired(error)) return;
      setFormNotice(error.message);
    }
  };

  const loadEmployees = async (event, nextFilters = filters) => {
    event?.preventDefault();
    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });

    try {
      const data = await request(`/api/candidates${params.toString() ? `?${params}` : ""}`, {
        headers: authHeaders(token)
      });
      setEmployees(data.candidates ?? []);
      if (page !== "candidate") setSelectedProfile(null);
    } catch (error) {
      if (handleAuthExpired(error)) return;
      setFormNotice(error.message);
    }
  };

  const openEmployeeProfile = async (employee) => {
    try {
      const data = await request(`/api/candidates/${employee.id}`, { headers: authHeaders(token) });
      setSelectedProfile(data.candidate);
      setPageState("candidate");
      window.history.pushState(null, "", `/candidates/${employee.id}`);
    } catch (error) {
      setFormNotice(error.message);
    }
  };

  const loadRecruiters = async () => {
    try {
      const data = await request("/api/recruiters", { headers: authHeaders(token) });
      setRecruiters(data.recruiters ?? []);
    } catch (error) {
      setFormNotice(error.message);
    }
  };

  const openRecruiter = async (recruiter) => {
    try {
      const data = await request(`/api/recruiters/${recruiter.id}`, { headers: authHeaders(token) });
      setSelectedRecruiter(data.recruiter);
      setPageState("recruiters");
      window.history.pushState(null, "", `/recruiters/${recruiter.id}`);
    } catch (error) {
      setFormNotice(error.message);
    }
  };

  const updateStatus = async (candidateId, status) => {
    try {
      await request(`/api/candidates/${candidateId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ status })
      });
      setFormNotice(`Статус: ${statusLabels[status]}`);
    } catch (error) {
      setFormNotice(error.message);
    }
  };

  const loadAdminUsers = async () => {
    setAdminNotice("");
    setAdminActionState({});
    try {
      const data = await request("/api/admin/users", { headers: authHeaders(token) });
      setAdminUsers(data.users ?? []);
    } catch (error) {
      setAdminNotice(error.message);
    }
  };

  const loadAdminActivity = async () => {
    setAdminNotice("");
    try {
      const data = await request("/api/admin/activity", { headers: authHeaders(token) });
      setAdminActivity(data.summary);
    } catch (error) {
      setAdminNotice(error.message);
    }
  };

  const sendAdminPasswordReset = async (userId) => {
    setAdminNotice("");
    setAdminActionState((current) => ({
      ...current,
      [userId]: { status: "loading", message: "Отправляем ссылку..." }
    }));
    try {
      const data = await request(`/api/admin/users/${userId}/password-reset`, {
        method: "POST",
        headers: authHeaders(token)
      });
      setAdminActionState((current) => ({
        ...current,
        [userId]: { status: "success", message: data.message ?? "Ссылка отправлена на email." }
      }));
    } catch (error) {
      setAdminActionState((current) => ({
        ...current,
        [userId]: { status: "error", message: error.message }
      }));
    }
  };

  const updateAdminUser = (updatedUser) => {
    setAdminUsers((current) => current.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
  };

  const verifyAdminUserEmail = async (userId) => {
    setAdminNotice("");
    setAdminActionState((current) => ({
      ...current,
      [userId]: { status: "loading", message: "Подтверждаем email..." }
    }));
    try {
      const data = await request(`/api/admin/users/${userId}/verify-email`, {
        method: "POST",
        headers: authHeaders(token)
      });
      updateAdminUser(data.user);
      setAdminActionState((current) => ({
        ...current,
        [userId]: { status: "success", message: data.message ?? "Email подтвержден." }
      }));
    } catch (error) {
      setAdminActionState((current) => ({
        ...current,
        [userId]: { status: "error", message: error.message }
      }));
    }
  };

  const toggleAdminUserDisabled = async (targetUser) => {
    setAdminNotice("");
    setAdminActionState((current) => ({
      ...current,
      [targetUser.id]: { status: "loading", message: targetUser.disabled ? "Включаем аккаунт..." : "Отключаем аккаунт..." }
    }));
    try {
      const data = await request(`/api/admin/users/${targetUser.id}/disabled`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          disabled: !targetUser.disabled,
          reason: "Отключено администратором"
        })
      });
      updateAdminUser(data.user);
      setAdminActionState((current) => ({
        ...current,
        [targetUser.id]: { status: "success", message: data.message }
      }));
    } catch (error) {
      setAdminActionState((current) => ({
        ...current,
        [targetUser.id]: { status: "error", message: error.message }
      }));
    }
  };

  const deleteAdminUser = async (targetUser) => {
    if (!window.confirm(`Удалить пользователя ${targetUser.email}? Это действие нельзя отменить.`)) return;

    setAdminNotice("");
    setAdminActionState((current) => ({
      ...current,
      [targetUser.id]: { status: "loading", message: "Удаляем пользователя..." }
    }));
    try {
      const data = await request(`/api/admin/users/${targetUser.id}`, {
        method: "DELETE",
        headers: authHeaders(token)
      });
      setAdminUsers((current) => current.filter((item) => item.id !== targetUser.id));
      setAdminActionState((current) => ({
        ...current,
        [targetUser.id]: { status: "success", message: data.message ?? "Пользователь удален." }
      }));
    } catch (error) {
      setAdminActionState((current) => ({
        ...current,
        [targetUser.id]: { status: "error", message: error.message }
      }));
    }
  };

  if (shouldRedirectLoggedOut) {
    return <div className="public-auth-shell" />;
  }

  if (showAuthPage) {
    return (
      <div className="public-auth-shell">
        <a className="skip-link" href="#main-content">К содержанию</a>
        <main id="main-content">
          <AuthPage
            authForm={authForm}
            authMode={authMode}
            authError={authError}
            authLoading={authLoading}
            authNotice={authNotice}
            verificationToken={verificationToken}
            resetForm={resetForm}
            setAuthForm={setAuthForm}
            setResetForm={setResetForm}
            showAuth={showAuth}
            closeAuth={closeAuth}
            setAuthError={setAuthError}
            setAuthNotice={setAuthNotice}
            submitAuth={submitAuth}
            verifyEmail={verifyEmail}
            requestPasswordReset={requestPasswordReset}
            resetPassword={resetPassword}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">К содержанию</a>
      <Header
        user={user}
        page={page}
        isCandidate={isCandidate}
        isManager={isManager}
        isAdmin={isAdmin}
        setPage={setPage}
        showAuth={showAuth}
        signOut={signOut}
        appHealth={appHealth}
      />

      <main id="main-content">
        <>
          {page !== "candidate" && <Hero user={user} isCandidate={isCandidate} isManager={isManager} isAdmin={isAdmin} page={page} showAuth={showAuth} setPage={setPage} appHealth={appHealth} />}
          {!user && <PublicHome />}
            {isAdmin && (page === "adminUsers" || page === "adminActivity") && (
              <AdminPage
                page={page}
                users={adminUsers}
                activity={adminActivity}
                notice={adminNotice}
                actionState={adminActionState}
                loadUsers={loadAdminUsers}
                loadActivity={loadAdminActivity}
                sendPasswordReset={sendAdminPasswordReset}
                verifyUserEmail={verifyAdminUserEmail}
                toggleUserDisabled={toggleAdminUserDisabled}
                deleteUser={deleteAdminUser}
              />
            )}
            {isManager && (page === "directory" || page === "candidate") && (
              <DirectoryPage
                page={page}
                filters={filters}
                setFilters={setFilters}
                loadEmployees={loadEmployees}
                employees={employees}
                selectedProfile={selectedProfile}
                setSelectedProfile={setSelectedProfile}
                openEmployeeProfile={openEmployeeProfile}
                downloadCandidateCv={downloadCandidateCv}
                updateStatus={updateStatus}
                setPage={setPage}
                canManageCandidates
              />
            )}
            {isManager && page === "recruiter" && (
              <RecruiterPage
                recruiterForm={recruiterForm}
                setRecruiterForm={setRecruiterForm}
                recruiterProfile={recruiterProfile}
                recruiterEditing={recruiterEditing}
                setRecruiterEditing={setRecruiterEditing}
                saveRecruiter={saveRecruiter}
                notice={formNotice}
              />
            )}
            {isCandidate && page === "profile" && (
              <ProfilePage
                user={user}
                accountForm={accountForm}
                setAccountForm={setAccountForm}
                profileForm={profileForm}
                setProfileForm={setProfileForm}
                profileLists={profileLists}
                candidateProfile={candidateProfile}
                saveProfile={saveProfile}
                uploadCv={uploadCv}
                profileViews={profileViews}
                profileViewsLoaded={profileViewsLoaded}
                profileViewsLoading={profileViewsLoading}
                loadProfileViews={loadProfileViews}
                downloadCandidateCv={downloadCandidateCv}
                openDeleteAccount={() => setDeleteAccountOpen(true)}
                notice={formNotice}
              />
            )}
            {isCandidate && (page === "candidates" || page === "candidate") && (
              <DirectoryPage
                page={page}
                filters={filters}
                setFilters={setFilters}
                loadEmployees={loadEmployees}
                employees={employees}
                selectedProfile={selectedProfile}
                setSelectedProfile={setSelectedProfile}
                openEmployeeProfile={openEmployeeProfile}
                downloadCandidateCv={downloadCandidateCv}
                setPage={setPage}
                returnPage="candidates"
                canManageCandidates={false}
              />
            )}
            {user && page === "recruiters" && (
              <RecruitersPage
                recruiters={recruiters}
                selectedRecruiter={selectedRecruiter}
                setSelectedRecruiter={setSelectedRecruiter}
                openRecruiter={openRecruiter}
                loadRecruiters={loadRecruiters}
                setPage={setPage}
                notice={formNotice}
              />
            )}
            <LegalNote />
        </>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <span>{YEAR}</span>
          <span>Некоммерческий сайт для поддержки инклюзивного трудоустройства.</span>
        </div>
      </footer>

      {!IS_LANDING && deleteAccountOpen && (
        <DeleteAccountModal
          loading={deleteAccountLoading}
          onCancel={() => setDeleteAccountOpen(false)}
          onConfirm={deleteOwnAccount}
        />
      )}
    </div>
  );
}

function Header({ user, page, isCandidate, isManager, isAdmin, setPage, showAuth, signOut, appHealth }) {
  const openStartPage = () => setPage(isAdmin ? "adminActivity" : isManager ? "directory" : isCandidate ? "profile" : "home");
  return (
    <header className="site-header">
      <button className="brand-button" type="button" onClick={openStartPage}>inclusive-hire</button>
      <nav aria-label="Главная навигация">
        {isManager && <button type="button" className={page === "directory" ? "nav-active" : ""} onClick={() => setPage("directory")}>Кандидаты</button>}
        {isManager && <button type="button" className={page === "recruiter" ? "nav-active" : ""} onClick={() => setPage("recruiter")}>Профиль рекрутера</button>}
        {isAdmin && <button type="button" className={page === "adminActivity" ? "nav-active" : ""} onClick={() => setPage("adminActivity")}>Активность</button>}
        {isAdmin && <button type="button" className={page === "adminUsers" ? "nav-active" : ""} onClick={() => setPage("adminUsers")}>Пользователи</button>}
        {isCandidate && <button type="button" className={page === "profile" ? "nav-active" : ""} onClick={() => setPage("profile")}>Мой профиль</button>}
        {isCandidate && <button type="button" className={page === "candidates" || page === "candidate" ? "nav-active" : ""} onClick={() => setPage("candidates")}>Кандидаты</button>}
        {isCandidate && <button type="button" className={page === "recruiters" ? "nav-active" : ""} onClick={() => setPage("recruiters")}>Рекрутеры</button>}
      </nav>
      <div className="header-actions">
        {user ? (
          <>
            <span className="account-chip">{user.name}</span>
            <button className="button secondary" type="button" onClick={signOut}>Выйти</button>
          </>
        ) : (
          <>
            <LandingAwareAction mode="login" label="Войти" variant="secondary" role="candidate" appHealth={appHealth} showAuth={showAuth} />
            <LandingAwareAction mode="register" label="Регистрация" variant="primary" role="candidate" appHealth={appHealth} showAuth={showAuth} />
          </>
        )}
      </div>
    </header>
  );
}

function Hero({ user, isCandidate, isManager, isAdmin, page, showAuth, setPage, appHealth }) {
  const publicHero = !user;
  const title = publicHero
    ? "Найм людей с инвалидностью в Бишкеке"
    : isAdmin
      ? page === "adminUsers"
        ? "Пользователи"
        : "Активность платформы"
    : isManager
      ? page === "recruiter"
        ? "Профиль рекрутера"
        : "Профили соискателей"
      : page === "candidates"
        ? "Профили соискателей"
        : page === "recruiters"
          ? "Рекрутеры"
      : "Ваш профиль соискателя";
  const text = publicHero
    ? "Работодатели находят сильных специалистов, соискатели показывают опыт, навыки и удобный формат работы."
    : isAdmin
      ? page === "adminUsers"
        ? "Просматривайте аккаунты и отправляйте ссылки для смены пароля."
        : "Следите за пользователями, регистрациями и просмотрами главной страницы."
    : isManager
      ? page === "recruiter"
        ? "Заполните описание, контакты и условия работы, чтобы соискатели понимали, с кем они будут общаться."
        : "Используйте поиск, фильтры и карточки кандидатов, чтобы быстро найти человека под роль и открыть полный профиль."
      : page === "candidates"
        ? "Смотрите примеры профилей, навыки и форматы работы других соискателей."
        : page === "recruiters"
          ? "Изучайте рекрутеров, контакты, условия и подход к инклюзивному найму."
      : "Заполните профиль так, чтобы работодатель сразу понял ваш опыт, формат работы и условия доступности.";

  return (
    <section className={`hero hero-${publicHero ? "public" : page}`}>
      <div className="hero-content">
        <p className="eyebrow">Инклюзивный найм</p>
        <h1>{title}</h1>
        <p>{text}</p>
        {publicHero && (
          <>
            <div className="hero-actions">
              <LandingAwareAction mode="login" label="Найти сотрудника" variant="primary" role="hiring_manager" appHealth={appHealth} showAuth={showAuth} />
              <LandingAwareAction mode="login" label="Загрузить резюме" variant="secondary" role="candidate" appHealth={appHealth} showAuth={showAuth} />
            </div>
            {IS_LANDING && appHealth === "offline" && (
              <p className="hero-offline-note">
                Сервер сейчас офлайн, потому что DevOps спит. Попробуйте зайти снова с 09:00 до 23:00 UTC+6.
              </p>
            )}
          </>
        )}
        {isCandidate && <button className="button primary" type="button" onClick={() => setPage("profile")}>Редактировать профиль</button>}
      </div>
    </section>
  );
}

function LandingAwareAction({ mode, label, variant, role, appHealth, showAuth }) {
  const className = `button ${variant}`;

  if (!IS_LANDING) {
    return <button className={className} type="button" onClick={() => showAuth(mode, role)}>{label}</button>;
  }

  if (appHealth === "online") {
    return <a className={className} href={authUrl(mode, role)}>{label}</a>;
  }

  return (
    <button className={className} type="button" disabled>
      {appHealth === "checking" ? "Проверяем доступ" : label}
    </button>
  );
}

function AdminPage({ page, users, activity, notice, actionState, loadUsers, loadActivity, sendPasswordReset, verifyUserEmail, toggleUserDisabled, deleteUser }) {
  const metrics = activity
    ? [
        ["Всего пользователей", activity.totalUsers],
        ["Новые за 7 дней", activity.newUsersLast7Days],
        ["Профили соискателей", activity.candidates],
        ["Работодатели", activity.employers],
        ["Рекрутеры", activity.recruiters],
        ["Главная до входа", activity.mainPageViewsBeforeLogin],
        ["Главная после входа", activity.mainPageViewsAfterLogin]
      ]
    : [];

  if (page === "adminUsers") {
    return (
      <section className="admin-page">
        <div className="results-top">
          <div>
            <p className="eyebrow">Администрирование</p>
            <h2>Пользователи</h2>
          </div>
          <button className="button quiet" type="button" onClick={loadUsers}>Обновить</button>
        </div>
        {notice && <p className="inline-notice" role="status">{notice}</p>}
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <AdminUserRow
                  key={item.id}
                  user={item}
                  actionState={actionState[item.id]}
                  sendPasswordReset={sendPasswordReset}
                  verifyUserEmail={verifyUserEmail}
                  toggleUserDisabled={toggleUserDisabled}
                  deleteUser={deleteUser}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="results-top">
        <div>
          <p className="eyebrow">Администрирование</p>
          <h2>Активность</h2>
        </div>
        <button className="button quiet" type="button" onClick={loadActivity}>Обновить</button>
      </div>
      {notice && <p className="inline-notice" role="status">{notice}</p>}
      <div className="admin-metrics-grid">
        {metrics.map(([label, value]) => (
          <article className="admin-metric-card" key={label}>
            <span>{label}</span>
            <strong>{value ?? 0}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminUserRow({ user, actionState, sendPasswordReset, verifyUserEmail, toggleUserDisabled, deleteUser }) {
  const isBusy = actionState?.status === "loading";
  const isError = actionState?.status === "error";

  return (
    <tr>
      <td>
        <div className="admin-user-cell">
          <span>{user.name}</span>
          {user.isTestUser && <span className="test-user-tag">Тестовый пользователь</span>}
        </div>
      </td>
      <td className="admin-email-cell">{user.email}</td>
      <td>{roleLabels[user.role] ?? user.role}</td>
      <td>
        <div className="admin-status-cell">
          <span>{user.emailVerified ? "Подтвержден" : "Email не подтвержден"}</span>
          {user.disabled && <span className="disabled-user-tag">Отключен</span>}
        </div>
      </td>
      <td>{new Date(user.createdAt).toLocaleDateString("ru-RU")}</td>
      <td>
        <div className="admin-action-cell">
          <button
            className="button quiet compact"
            type="button"
            disabled={isBusy}
            onClick={() => sendPasswordReset(user.id)}
          >
            Сбросить пароль
          </button>
          {!user.emailVerified && (
            <button
              className="button quiet compact"
              type="button"
              disabled={isBusy}
              onClick={() => verifyUserEmail(user.id)}
            >
              Подтвердить email
            </button>
          )}
          <button
            className="button quiet compact"
            type="button"
            disabled={isBusy}
            onClick={() => toggleUserDisabled(user)}
          >
            {user.disabled ? "Включить" : "Отключить"}
          </button>
          <button
            className="button danger compact"
            type="button"
            disabled={isBusy}
            onClick={() => deleteUser(user)}
          >
            Удалить
          </button>
          {actionState?.message && (
            <span className={isError ? "row-status error" : "row-status"} role="status">
              {actionState.message}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function PublicHome() {
  return (
    <section className="public-section">
      <div className="section-heading">
        <p className="eyebrow">Профили соискателей</p>
        <h2>Профили соискателей</h2>
        <p>Для того чтобы посмотреть профили всех кандидатов, необходимо зарегистрироваться или войти как работодатель.</p>
      </div>
      <div className="listing-grid">
        {sampleCandidates.map((candidate) => <CandidateCard key={candidate.name} candidate={candidate} preview />)}
      </div>
    </section>
  );
}

function LegalNote() {
  return (
    <section className="legal-note" aria-label="Правовая информация">
      <p>
        В Кыргызстане организации с численностью от 25 сотрудников обязаны выделять не менее 4% рабочих мест для людей с инвалидностью. Это требование закреплено в{" "}
        <a href="https://cbd.minjust.gov.kg/3-45/edition/25298/ru" target="_blank" rel="noreferrer">
          статье 155 Трудового кодекса Кыргызской Республики
        </a>{" "}
        и направлено на обеспечение равных возможностей при трудоустройстве.
      </p>
    </section>
  );
}

function DirectoryPage({ page, filters, setFilters, loadEmployees, employees, selectedProfile, setSelectedProfile, openEmployeeProfile, downloadCandidateCv, updateStatus, setPage, returnPage = "directory", canManageCandidates = true }) {
  if (selectedProfile) {
    return (
      <CandidateProfilePage
        profile={selectedProfile}
        onBack={() => {
          setSelectedProfile(null);
          setPage(returnPage);
        }}
        downloadCandidateCv={downloadCandidateCv}
        canManageCandidates={canManageCandidates}
      />
    );
  }

  if (page === "candidate") {
    return (
      <section className="candidate-profile-page">
        <p className="empty-state">Профиль загружается.</p>
      </section>
    );
  }

  return (
    <section className="jobs-page">
      <div className="results-top">
        <div>
          <p className="eyebrow">Поиск сотрудников</p>
          <h2>Профили соискателей</h2>
        </div>
        <span className="result-count">{employees.length} профилей</span>
      </div>
      <div className="jobs-layout seeker-layout">
        <form className="filters-panel" onSubmit={loadEmployees}>
          <h3>Фильтры</h3>
          <Field id="query" label="Поиск по навыкам" value={filters.query} onChange={(value) => setFilters({ ...filters, query: value, skills: value })} placeholder="Frontend, React" />
          <Field id="location" label="Локация" value={filters.location} onChange={(value) => setFilters({ ...filters, location: value })} placeholder="Бишкек, Ош, удаленно" />
          <div>
            <label htmlFor="filterEmploymentFormat">Формат работы</label>
            <select id="filterEmploymentFormat" value={filters.employmentFormat} onChange={(event) => setFilters({ ...filters, employmentFormat: event.target.value })}>
              <option value="">Любой</option>
              {Object.entries(employmentFormatLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <Field id="skills" label="Навыки" value={filters.skills} onChange={(value) => setFilters({ ...filters, skills: value, query: value })} placeholder="SQL, QA, Node.js" />
          <Field id="languages" label="Языки" value={filters.languages} onChange={(value) => setFilters({ ...filters, languages: value })} placeholder="русский, кыргызча" />
          <div className="filters-actions">
            <button className="button primary full" type="submit">Показать</button>
            <button className="button quiet full" type="button" onClick={() => { setFilters(emptyFilters); loadEmployees(undefined, emptyFilters); }}>Сбросить</button>
          </div>
        </form>
        <div className="listing-stack">
          {employees.length === 0 ? (
            <p className="empty-state">По выбранным фильтрам кандидатов нет.</p>
          ) : (
            employees.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} onClick={() => openEmployeeProfile(candidate)} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function RecruiterPage({ recruiterForm, setRecruiterForm, recruiterProfile, recruiterEditing, setRecruiterEditing, saveRecruiter, notice }) {
  return (
    <section className="recruiter-profile-page">
      <div className="profile-title">
        <div>
          <p className="eyebrow">Рекрутер</p>
          <h2>{recruiterProfile && !recruiterEditing ? "Профиль рекрутера" : "Создать профиль рекрутера"}</h2>
          <p>Эта информация будет доступна соискателям на странице рекрутера.</p>
        </div>
        {recruiterProfile && !recruiterEditing && (
          <button className="button secondary" type="button" onClick={() => setRecruiterEditing(true)}>Редактировать</button>
        )}
      </div>
      {notice && <p className="inline-notice error" role="alert">{notice}</p>}
      <RecruiterPanel
        recruiterForm={recruiterForm}
        setRecruiterForm={setRecruiterForm}
        recruiterProfile={recruiterProfile}
        recruiterEditing={recruiterEditing}
        saveRecruiter={saveRecruiter}
      />
    </section>
  );
}

function RecruiterPanel({ recruiterForm, setRecruiterForm, recruiterProfile, recruiterEditing, saveRecruiter }) {
  if (recruiterProfile && !recruiterEditing) {
    return (
      <article className="recruiter-panel recruiter-page-card recruiter-overview-card">
        <div className="recruiter-overview-header">
          <div className="logo-mark recruiter-logo">{recruiterProfile.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <h3>{recruiterProfile.name}</h3>
            {recruiterProfile.website && (
              <a className="recruiter-website" href={recruiterProfile.website} target="_blank" rel="noreferrer">
                {recruiterProfile.website}
              </a>
            )}
          </div>
        </div>
        {recruiterProfile.description && <p className="recruiter-description">{recruiterProfile.description}</p>}
        <div className="recruiter-overview-grid">
          <section className="recruiter-info-block">
            <h4>Контакты</h4>
            <RecruiterContacts recruiter={recruiterProfile} />
          </section>
          <section className="recruiter-info-block">
            <h4>Условия работы</h4>
            <TagList items={recruiterProfile.accessibilityCommitments ?? []} empty="Условия пока не указаны." />
          </section>
        </div>
      </article>
    );
  }

  return (
    <article className="recruiter-panel recruiter-page-card">
      <form onSubmit={saveRecruiter}>
        <h3>Рекрутер</h3>
        <div className="recruiter-form-grid">
          <Field id="recruiterName" label="Имя или организация" value={recruiterForm.name} onChange={(value) => setRecruiterForm({ ...recruiterForm, name: value })} required className="span-2" />
          <Field id="website" label="Сайт" type="url" value={recruiterForm.website} onChange={(value) => setRecruiterForm({ ...recruiterForm, website: value })} className="span-2" />
          <Field id="recruiterContactEmail" label="Email для связи" type="email" value={recruiterForm.contactEmail} onChange={(value) => setRecruiterForm({ ...recruiterForm, contactEmail: value })} />
          <Field id="recruiterPhone" label="Телефон" value={recruiterForm.phone} onChange={(value) => setRecruiterForm({ ...recruiterForm, phone: value })} />
          <Field id="recruiterMessenger" label="Мессенджер" value={recruiterForm.messenger} onChange={(value) => setRecruiterForm({ ...recruiterForm, messenger: value })} placeholder="@username или номер" className="span-2" />
          <TextField id="recruiterDescription" label="Описание" value={recruiterForm.description} onChange={(value) => setRecruiterForm({ ...recruiterForm, description: value })} rows="4" className="span-2" />
          <TextField id="commitments" label="Инклюзивные условия" value={recruiterForm.accessibilityCommitments} onChange={(value) => setRecruiterForm({ ...recruiterForm, accessibilityCommitments: value })} rows="4" className="span-2" />
        </div>
        <button className="button secondary full" type="submit">Сохранить профиль рекрутера</button>
      </form>
    </article>
  );
}

function RecruitersPage({ recruiters, selectedRecruiter, setSelectedRecruiter, openRecruiter, loadRecruiters, setPage, notice }) {
  if (selectedRecruiter) {
    return (
      <section className="recruiters-section">
        <div className="profile-title">
          <div>
            <p className="eyebrow">Рекрутер</p>
            <h2>{selectedRecruiter.name}</h2>
            {selectedRecruiter.website && <p><a href={selectedRecruiter.website} target="_blank" rel="noreferrer">{selectedRecruiter.website}</a></p>}
          </div>
          <button className="button secondary" type="button" onClick={() => { setSelectedRecruiter(null); setPage("recruiters"); }}>Назад к рекрутерам</button>
        </div>
        {notice && <p className="inline-notice error" role="alert">{notice}</p>}
        <article className="recruiter-detail-card">
          {selectedRecruiter.description && <p>{selectedRecruiter.description}</p>}
          <RecruiterContacts recruiter={selectedRecruiter} />
          <h3>Инклюзивные условия</h3>
          <TagList items={selectedRecruiter.accessibilityCommitments ?? []} empty="Условия пока не указаны." />
        </article>
      </section>
    );
  }

  return (
    <section className="recruiters-section">
      <div className="results-top">
        <div>
          <p className="eyebrow">Работодатели</p>
          <h2>Рекрутеры</h2>
          <p>Посмотрите описание рекрутера, контакты и условия для инклюзивной работы.</p>
        </div>
        <button className="button quiet" type="button" onClick={loadRecruiters}>Обновить</button>
      </div>
      {notice && <p className="inline-notice error" role="alert">{notice}</p>}
      <div className="recruiter-list-grid">
        {recruiters.length === 0 ? (
          <p className="empty-state">Рекрутеры пока не добавлены.</p>
        ) : (
          recruiters.map((recruiter) => <RecruiterCard key={recruiter.id} recruiter={recruiter} onClick={() => openRecruiter(recruiter)} />)
        )}
      </div>
    </section>
  );
}

function RecruiterCard({ recruiter, onClick }) {
  return (
    <article className="recruiter-card compact">
      <div className="logo-mark recruiter-logo">{recruiter.name.slice(0, 2).toUpperCase()}</div>
      <div className="recruiter-card-body">
        <h3>{recruiter.name}</h3>
        {recruiter.website && <p>{recruiter.website}</p>}
        {recruiter.description && <p>{recruiter.description}</p>}
        <RecruiterContacts recruiter={recruiter} compact />
        <button className="button primary card-action" type="button" onClick={onClick}>Подробнее</button>
      </div>
    </article>
  );
}

function RecruiterContacts({ recruiter, compact = false }) {
  const contacts = recruiter?.contacts ?? {};
  const items = [
    contacts.email && ["Email", contacts.email, `mailto:${contacts.email}`],
    contacts.phone && ["Телефон", contacts.phone, `tel:${contacts.phone}`],
    contacts.messenger && ["Мессенджер", contacts.messenger]
  ].filter(Boolean);

  if (items.length === 0) {
    return compact ? null : <p className="empty-inline">Контакты пока не указаны.</p>;
  }

  return (
    <ul className="contact-list">
      {items.map(([label, value, href]) => (
        <li key={label}>
          <span>{label}</span>
          {href ? <a href={href}>{value}</a> : <strong>{value}</strong>}
        </li>
      ))}
    </ul>
  );
}

const profileSnapshot = ({ user, accountForm, profileForm, candidateProfile }) => ({
  name: accountForm.name.trim(),
  savedName: (user?.name ?? "").trim(),
  headline: profileForm.headline.trim(),
  savedHeadline: (candidateProfile?.headline ?? "").trim(),
  summary: profileForm.summary.trim(),
  savedSummary: (candidateProfile?.summary ?? "").trim(),
  skills: toList(profileForm.skills),
  savedSkills: candidateProfile?.skills ?? [],
  languages: toList(profileForm.languages),
  savedLanguages: candidateProfile?.languages ?? [],
  accessibilityPreferences: profileForm.accessibilityPreferences.trim(),
  savedAccessibilityPreferences: (candidateProfile?.accessibilityPreferences ?? "").trim(),
  location: profileForm.location.trim(),
  savedLocation: (candidateProfile?.location ?? "").trim(),
  portfolio: profileForm.portfolio.trim(),
  savedPortfolio: (candidateProfile?.portfolio ?? "").trim(),
  availability: profileForm.availability.trim(),
  savedAvailability: (candidateProfile?.availability ?? "Готов(а) к предложениям").trim(),
  employmentFormat: profileForm.employmentFormat,
  savedEmploymentFormat: candidateProfile?.employmentFormat ?? "remote",
  contactEmail: profileForm.contactEmail.trim(),
  savedContactEmail: (candidateProfile?.contacts?.email ?? user?.email ?? "").trim(),
  messengerType: profileForm.messengerType,
  savedMessengerType: candidateProfile?.contacts?.messengerType ?? "telegram",
  messenger: profileForm.messenger.trim(),
  savedMessenger: (candidateProfile?.contacts?.messenger ?? "").trim()
});

function ProfilePage({ user, accountForm, setAccountForm, profileForm, setProfileForm, profileLists, candidateProfile, saveProfile, uploadCv, profileViews, profileViewsLoaded, profileViewsLoading, loadProfileViews, downloadCandidateCv, openDeleteAccount, notice }) {
  const snapshot = profileSnapshot({ user, accountForm, profileForm, candidateProfile });
  const currentProfileState = {
    name: snapshot.name,
    headline: snapshot.headline,
    summary: snapshot.summary,
    skills: snapshot.skills,
    languages: snapshot.languages,
    accessibilityPreferences: snapshot.accessibilityPreferences,
    location: snapshot.location,
    portfolio: snapshot.portfolio,
    availability: snapshot.availability,
    employmentFormat: snapshot.employmentFormat,
    contactEmail: snapshot.contactEmail,
    messengerType: snapshot.messengerType,
    messenger: snapshot.messenger
  };
  const savedProfileState = {
    name: snapshot.savedName,
    headline: snapshot.savedHeadline,
    summary: snapshot.savedSummary,
    skills: snapshot.savedSkills,
    languages: snapshot.savedLanguages,
    accessibilityPreferences: snapshot.savedAccessibilityPreferences,
    location: snapshot.savedLocation,
    portfolio: snapshot.savedPortfolio,
    availability: snapshot.savedAvailability,
    employmentFormat: snapshot.savedEmploymentFormat,
    contactEmail: snapshot.savedContactEmail,
    messengerType: snapshot.savedMessengerType,
    messenger: snapshot.savedMessenger
  };
  const profileChanged = JSON.stringify(currentProfileState) !== JSON.stringify(savedProfileState);
  const profileSaved = notice === "Профиль сохранен." && !profileChanged;
  const topNotice = notice && notice !== "Профиль сохранен." ? notice : "";
  const preview = {
    user,
    ...candidateProfile,
    headline: profileForm.headline,
    location: profileForm.location,
    skills: profileLists.skills,
    languages: profileLists.languages,
    summary: profileForm.summary,
    accessibilityPreferences: profileForm.accessibilityPreferences,
    portfolio: profileForm.portfolio,
    availability: profileForm.availability,
    employmentFormat: profileForm.employmentFormat,
    contacts: {
      email: profileForm.contactEmail || user.email,
      messengerType: profileForm.messengerType,
      messenger: profileForm.messenger || "@inclusive_hire"
    }
  };

  return (
    <section className="profile-page">
      <div className="profile-title">
        <div>
          <p className="eyebrow">Отдельная страница профиля</p>
          <h2>Редактирование профиля</h2>
          <p>Все ключевые поля анкеты редактируются здесь: имя, опыт, навыки, языки, локация, условия доступности и резюме.</p>
        </div>
        <span className="profile-state">{profileForm.availability}</span>
      </div>
      {topNotice && <p className="inline-notice" role="status">{topNotice}</p>}
      <div className="profile-grid">
        <form className="profile-editor" onSubmit={saveProfile}>
          <section className="edit-card">
            <h3>Аккаунт</h3>
            <Field id="accountName" label="Имя и фамилия" value={accountForm.name} onChange={(value) => setAccountForm({ name: value })} required />
            <Field id="accountEmail" label="Email" value={user.email} onChange={() => {}} disabled />
          </section>
          <section className="edit-card">
            <h3>Профессиональный профиль</h3>
            <Field id="headline" label="Профессиональный заголовок" value={profileForm.headline} onChange={(value) => setProfileForm({ ...profileForm, headline: value })} placeholder="Например: Frontend разработчик" />
            <TextField id="summary" label="Опыт и сильные стороны" value={profileForm.summary} onChange={(value) => setProfileForm({ ...profileForm, summary: value })} rows="5" />
            <Field id="skills" label="Навыки через запятую" value={profileForm.skills} onChange={(value) => setProfileForm({ ...profileForm, skills: value })} />
            <Field id="languages" label="Языки через запятую" value={profileForm.languages} onChange={(value) => setProfileForm({ ...profileForm, languages: value })} />
            <div className="field-pair">
              <Field id="location" label="Город" value={profileForm.location} onChange={(value) => setProfileForm({ ...profileForm, location: value })} placeholder="Бишкек, Ош, Нарын" />
              <div>
                <label htmlFor="employmentFormat">Формат работы</label>
                <select id="employmentFormat" value={profileForm.employmentFormat} onChange={(event) => setProfileForm({ ...profileForm, employmentFormat: event.target.value })}>
                  {Object.entries(employmentFormatLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <Field id="portfolio" label="Портфолио или ссылка на работы" value={profileForm.portfolio} onChange={(value) => setProfileForm({ ...profileForm, portfolio: value })} placeholder="https://..." />
            <Field id="contactEmail" label="Email для связи" type="email" value={profileForm.contactEmail} onChange={(value) => setProfileForm({ ...profileForm, contactEmail: value })} />
            <div className="field-pair">
              <div>
                <label htmlFor="messengerType">Мессенджер</label>
                <select id="messengerType" value={profileForm.messengerType} onChange={(event) => setProfileForm({ ...profileForm, messengerType: event.target.value })}>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <div>
                <Field id="messenger" label="Контакт" value={profileForm.messenger} onChange={(value) => setProfileForm({ ...profileForm, messenger: value })} placeholder="@username или номер" />
              </div>
            </div>
            <TextField id="accessibility" label="Условия доступности" value={profileForm.accessibilityPreferences} onChange={(value) => setProfileForm({ ...profileForm, accessibilityPreferences: value })} rows="4" />
            <div>
              <label htmlFor="availability">Статус поиска</label>
              <select id="availability" value={profileForm.availability} onChange={(event) => setProfileForm({ ...profileForm, availability: event.target.value })}>
                {availabilityOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </section>
          <div className="profile-save-block">
            <button className="button primary wide" type="submit" disabled={!profileChanged}>Сохранить профиль</button>
            {profileSaved && <p className="save-status" role="status">Профиль сохранен.</p>}
          </div>
        </form>
        <aside className="profile-side">
          <ProfileSummary profile={preview} detailed />
          <form className="edit-card resume-upload-card" onSubmit={uploadCv}>
            <h3>Резюме</h3>
            <Field id="cv" name="cv" label="Файл резюме" type="file" onChange={() => {}} accept=".pdf,.doc,.docx" required />
            <button className="button secondary full" type="submit">Загрузить резюме</button>
            {candidateProfile?.cv?.originalName && (
              <button className="button primary full" type="button" onClick={() => downloadCandidateCv(candidateProfile)}>Скачать резюме</button>
            )}
            {candidateProfile?.cv?.originalName ? (
              <p className="resume-file-name">Загружено: {candidateProfile.cv.originalName}</p>
            ) : (
              <p className="hint">Резюме пока не загружено.</p>
            )}
          </form>
          <section className="edit-card">
            <div className="card-heading-row">
              <h3>Просмотры профиля</h3>
              <button className="button quiet" type="button" onClick={loadProfileViews} disabled={profileViewsLoading}>
                {profileViewsLoading ? "Загрузка" : "Обновить"}
              </button>
            </div>
            {profileViewsLoading ? (
              <p className="empty-state">Загружаем просмотры.</p>
            ) : profileViews.length === 0 ? (
              <p className="empty-state">{profileViewsLoaded ? "Пока никто не просматривал профиль." : "Просмотры загрузятся автоматически."}</p>
            ) : (
              <ul className="views-list">
                {profileViews.map((view) => {
                  const recruiterId = view.recruiter?.id ?? view.recruiter?._id;
                  return (
                    <li key={view.id}>
                      {recruiterId ? (
                        <a href={`/recruiters/${recruiterId}`}>{view.recruiter.name ?? "Рекрутер"}</a>
                    ) : (
                      <span>Рекрутер</span>
                    )}
                      <span>{new Date(view.viewedAt).toLocaleDateString("ru-RU")}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="edit-card danger-zone">
            <h3>Удаление аккаунта</h3>
            <p className="hint">Будут удалены аккаунт, профиль, резюме и связанные данные. Это действие нельзя отменить.</p>
            <button className="button danger full" type="button" onClick={openDeleteAccount}>Удалить аккаунт</button>
          </section>
        </aside>
      </div>
    </section>
  );
}

function CandidateCard({ candidate, onClick, preview = false }) {
  const name = candidate.user?.name ?? candidate.name ?? "Кандидат";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const contacts = contactInfo(candidate);
  const portfolioUrl = externalUrl(candidate.portfolio);
  const body = (
    <>
      <div className="logo-mark">{initials}</div>
      <div className="candidate-main">
        <div className="candidate-title-row">
          <div>
            <h3>{candidate.headline || "Профиль кандидата"}</h3>
            <p>{name}</p>
          </div>
        </div>
        <ul className="meta-list">
          <li>{candidate.location || "Локация не указана"}</li>
          <li>Формат: {employmentFormatLabels[candidate.employmentFormat] ?? "Онлайн"}</li>
          <li>Навыки: {(candidate.skills ?? []).slice(0, 3).join(", ") || "не указаны"}</li>
          <li>Языки: {(candidate.languages ?? []).join(", ") || "не указаны"}</li>
          {portfolioUrl && (
            <li>
              Портфолио:{" "}
              <a href={portfolioUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                открыть
              </a>
            </li>
          )}
          {!preview && <li>{contacts.email}</li>}
        </ul>
        <TagList items={candidate.skills ?? []} />
        {!preview && <button className="button primary card-action" type="button" onClick={onClick}>Смотреть полный профиль</button>}
      </div>
    </>
  );

  if (preview) return <article className="candidate-card preview">{body}</article>;
  return <article className="candidate-card interactive">{body}</article>;
}

function CandidateProfilePage({ profile, onBack, downloadCandidateCv, canManageCandidates = true }) {
  const canDownloadCv = Boolean(profile.cv?.originalName);

  return (
    <section className="candidate-profile-page" aria-label="Профиль кандидата">
      <div className="profile-title">
        <div>
          <p className="eyebrow">Полный профиль</p>
          <h2>{profile.user?.name}</h2>
        </div>
        <button className="button secondary" type="button" onClick={onBack}>Назад к профилям</button>
      </div>
      <div className="candidate-profile-layout">
        <ProfileSummary profile={profile} detailed onDownloadCv={canDownloadCv ? () => downloadCandidateCv(profile) : undefined} />
      </div>
    </section>
  );
}

function ProfileSummary({ profile, detailed = false, onDownloadCv }) {
  const contacts = contactInfo(profile);
  const messengerLabel = contacts.messengerType === "whatsapp" ? "WhatsApp" : "Telegram";
  const profilePortfolioUrl = externalUrl(profile?.portfolio);
  const profileMessengerUrl = messengerUrl(contacts);
  return (
    <section className={detailed ? "profile-card detailed" : "profile-card"}>
      <div className="profile-avatar">{(profile?.user?.name ?? "П").slice(0, 1)}</div>
      <h3>{profile?.headline || "Профиль соискателя"}</h3>
      {profile?.location && <p className="profile-location">{profile.location}</p>}
      {profile?.employmentFormat && <p className="profile-location">Формат работы: {employmentFormatLabels[profile.employmentFormat] ?? "Онлайн"}</p>}
      {profile?.availability && <p className="profile-location">Статус: {profile.availability}</p>}
      {detailed && profile?.summary && <p className="profile-summary-text">{profile.summary}</p>}
      {detailed && profilePortfolioUrl && (
        <p className="profile-location">
          <a href={profilePortfolioUrl} target="_blank" rel="noreferrer">Портфолио</a>
        </p>
      )}
      {detailed && (
        <>
          <h4>Контакты</h4>
          <ul className="contact-list">
            <li><span>Email</span><a href={`mailto:${contacts.email}`}>{contacts.email}</a></li>
            <li>
              <span>{messengerLabel}</span>
              {profileMessengerUrl ? (
                <a href={profileMessengerUrl} target="_blank" rel="noreferrer">{contacts.messenger}</a>
              ) : (
                <strong>{contacts.messenger}</strong>
              )}
            </li>
          </ul>
        </>
      )}
      <h4>Навыки</h4>
      <TagList items={profile?.skills ?? []} empty="Навыки не указаны." />
      <h4>Языки</h4>
      <TagList items={profile?.languages ?? []} empty="Языки не указаны." />
      {detailed && profile?.accessibilityPreferences && (
        <>
          <h4>Условия доступности</h4>
          <p className="accessibility-note">{profile.accessibilityPreferences}</p>
        </>
      )}
      {onDownloadCv && (
        <div className="resume-row">
          <p className="hint">{profile?.cv?.originalName ?? "Резюме можно загрузить в профиле."}</p>
          <button className="button primary" type="button" onClick={onDownloadCv}>Скачать резюме</button>
        </div>
      )}
    </section>
  );
}

function DeleteAccountModal({ loading, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop">
      <section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
        <div className="card-heading-row">
          <h2 id="delete-account-title">Удалить аккаунт?</h2>
          <button className="icon-close" type="button" aria-label="Закрыть" onClick={onCancel} disabled={loading}>×</button>
        </div>
        <p className="form-copy">
          Будут удалены ваш аккаунт, профиль, резюме и связанные данные. Восстановить их после удаления нельзя.
        </p>
        <div className="confirm-actions">
          <button className="button secondary" type="button" onClick={onCancel} disabled={loading}>Отмена</button>
          <button className="button danger" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "Удаляем..." : "Удалить аккаунт"}
          </button>
        </div>
      </section>
    </div>
  );
}

function AuthPage({ authForm, authMode, authError, authLoading, authNotice, verificationToken, resetForm, setAuthForm, setResetForm, showAuth, closeAuth, setAuthError, setAuthNotice, submitAuth, verifyEmail, requestPasswordReset, resetPassword }) {
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = authMode === "login";
  const isRegister = authMode === "register";
  const isVerify = authMode === "verify";
  const isForgot = authMode === "forgot";
  const isReset = authMode === "reset";
  const title = isVerify
    ? "Подтверждение email"
    : isForgot
      ? "Восстановление пароля"
      : isReset
        ? "Новый пароль"
        : isLogin
          ? "Войти"
          : "Регистрация";
  const switchMode = (nextMode) => {
    if (authLoading) return;
    setAuthError("");
    setAuthNotice("");
    showAuth(nextMode, authForm.role);
  };

  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <div className="auth-page-card">
        <div className="card-heading-row">
          <h2 id="auth-title">{title}</h2>
          <button className="icon-close" type="button" aria-label="Закрыть" onClick={closeAuth} disabled={authLoading}>×</button>
        </div>
        {authError && <p className="inline-notice error" role="alert">{authError}</p>}
        {authNotice && <p className="inline-notice" role="status">{authNotice}</p>}
        {isVerify ? (
          <div className="verification-panel">
            {verificationToken ? (
              <>
                <p>Нажмите кнопку ниже, чтобы завершить подтверждение email.</p>
                <button className="button primary wide" type="button" onClick={verifyEmail} disabled={authLoading}>
                  {authLoading ? "Подтверждаем..." : "Подтвердить email"}
                </button>
              </>
            ) : (
              <p>Письмо с подтверждением отправлено. Проверьте входящие и папку Спам, затем откройте ссылку из письма.</p>
            )}
          </div>
        ) : isForgot ? (
          <form onSubmit={requestPasswordReset}>
            <p className="form-copy">Введите email, и мы отправим ссылку для установки нового пароля.</p>
            <Field id="resetEmail" label="Email" type="email" value={resetForm.email} onChange={(value) => setResetForm({ ...resetForm, email: value })} required />
            <button className="button primary wide" type="submit" disabled={authLoading}>
              {authLoading ? "Отправляем..." : "Получить ссылку"}
            </button>
            <p className="auth-switch">
              Вспомнили пароль?{" "}
              <button type="button" className="link-button" onClick={() => showAuth("login", authForm.role)} disabled={authLoading}>Войти</button>
            </p>
          </form>
        ) : isReset ? (
          <form onSubmit={resetPassword}>
            <p className="form-copy">Введите новый пароль для вашего аккаунта.</p>
            <PasswordField id="newPassword" label="Новый пароль" value={resetForm.password} onChange={(value) => setResetForm({ ...resetForm, password: value })} showPassword={showPassword} setShowPassword={setShowPassword} required />
            <button className="button primary wide" type="submit" disabled={authLoading}>
              {authLoading ? "Сохраняем..." : "Сохранить новый пароль"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitAuth}>
            {isRegister && (
              <>
                <Field id="name" label="Имя и фамилия" value={authForm.name} onChange={(value) => setAuthForm({ ...authForm, name: value })} required />
                <label htmlFor="role">Роль</label>
                <select id="role" value={authForm.role} onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}>
                  <option value="candidate">Ищу подходящую работу</option>
                  <option value="hiring_manager">Ищу сотрудника с ограниченными возможностями</option>
                </select>
              </>
            )}
            <Field id="email" label="Email" type="email" value={authForm.email} onChange={(value) => setAuthForm({ ...authForm, email: value })} required />
            <PasswordField id="password" label="Пароль" value={authForm.password} onChange={(value) => setAuthForm({ ...authForm, password: value })} showPassword={showPassword} setShowPassword={setShowPassword} required />
            {isLogin && <button className="link-button forgot-button" type="button" onClick={() => { setResetForm({ ...emptyResetForm, email: authForm.email }); switchMode("forgot"); }} disabled={authLoading}>Забыли пароль?</button>}
            {isRegister && authLoading && (
              <div className="auth-progress" role="status" aria-label="Создаем аккаунт">
                <span />
              </div>
            )}
            <button className="button primary wide" type="submit" disabled={authLoading}>
              {authLoading ? (isLogin ? "Входим..." : "Создаем аккаунт...") : (isLogin ? "Войти" : "Создать аккаунт")}
            </button>
            <p className="auth-switch">
              {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
              <button type="button" className="link-button" onClick={() => switchMode(isLogin ? "register" : "login")} disabled={authLoading}>
                {isLogin ? "Зарегистрироваться" : "Войти"}
              </button>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

function PasswordField({ id, label, value, onChange, showPassword, setShowPassword, ...props }) {
  const handleInvalid = (event) => {
    if (props.required && !event.currentTarget.value) {
      event.currentTarget.setCustomValidity("Заполните это поле");
      return;
    }

    event.currentTarget.setCustomValidity("Проверьте правильность заполнения");
  };

  const handleInput = (event) => {
    event.currentTarget.setCustomValidity("");
  };

  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrap">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onInput={handleInput}
          onInvalid={handleInvalid}
          {...props}
        />
        <button className="button quiet password-toggle" type="button" onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? "Скрыть" : "Показать"}
        </button>
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, type = "text", className = "", ...props }) {
  const handleInvalid = (event) => {
    if (props.required && !event.currentTarget.value) {
      event.currentTarget.setCustomValidity("Заполните это поле");
      return;
    }
    if (event.currentTarget.validity.typeMismatch) {
      event.currentTarget.setCustomValidity("Проверьте формат поля");
      return;
    }
    event.currentTarget.setCustomValidity("Проверьте правильность заполнения");
  };

  const handleInput = (event) => {
    event.currentTarget.setCustomValidity("");
  };

  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={type === "file" ? undefined : value}
        onChange={(event) => onChange(event.target.value)}
        onInput={handleInput}
        onInvalid={handleInvalid}
        {...props}
      />
    </div>
  );
}

function TextField({ id, label, value, onChange, rows = "4", className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value} rows={rows} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TagList({ items, empty = "Не указано." }) {
  return items.length ? (
    <ul className="tag-list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  ) : (
    <p className="empty-inline">{empty}</p>
  );
}

export default App;
