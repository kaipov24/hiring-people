import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const YEAR = new Date().getFullYear();
const statuses = ["Viewed", "Contacted", "Hired"];

const statusLabels = {
  Viewed: "Просмотрен",
  Contacted: "Связались",
  Hired: "Нанят"
};

const roleLabels = {
  candidate: "Соискатель",
  hiring_manager: "Работодатель",
  admin: "Админ"
};

const emptyAuthForm = { name: "", email: "", password: "", role: "candidate" };
const emptyResetForm = { email: "", token: "", password: "" };
const emptyAccountForm = { name: "" };
const emptyProfileForm = {
  headline: "",
  summary: "",
  skills: "",
  languages: "",
  accessibilityPreferences: "",
  location: "",
  portfolio: "",
  availability: "Готов(а) к предложениям",
  contactEmail: "",
  messengerType: "telegram",
  messenger: ""
};
const emptyCompanyForm = {
  name: "",
  description: "",
  website: "",
  contactEmail: "",
  phone: "",
  messenger: "",
  accessibilityCommitments: ""
};
const emptyFilters = { query: "", location: "", skills: "", languages: "" };

const sampleCandidates = [
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

const toList = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);
const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });
const contactInfo = (profile) => ({
  email: profile?.contacts?.email || profile?.user?.email || "contact@inclusive-hire.local",
  messengerType: profile?.contacts?.messengerType || "telegram",
  messenger: profile?.contacts?.messenger || "@inclusive_hire"
});

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message ?? "Запрос не выполнен");
    error.status = response.status;
    throw error;
  }
  return data;
};

const readStoredSession = () => {
  try {
    const stored = window.localStorage.getItem("inclusive-hire-session");
    return stored ? JSON.parse(stored) : null;
  } catch {
    window.localStorage.removeItem("inclusive-hire-session");
    return null;
  }
};

const readVisitorId = () => {
  const existing = window.localStorage.getItem("inclusive-hire-visitor");
  if (existing) return existing;

  const id = window.crypto?.randomUUID?.() ?? `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem("inclusive-hire-visitor", id);
  return id;
};

const readAuthLink = () => {
  const hash = window.location.hash;
  const [route, query = ""] = hash.slice(1).split("?");
  const params = new URLSearchParams(query || window.location.search);
  const token = params.get("token") ?? "";

  if (route === "reset-password" && token) return { mode: "reset", token };
  if (route === "verify-email" && token) return { mode: "verify", token };
  return null;
};

const readCandidateRoute = () => {
  const pathMatch = window.location.pathname.match(/^\/candidates\/([^/]+)$/);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);

  const route = window.location.hash.slice(1).split("?")[0];
  const match = route.match(/^candidates\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : "";
};

const readCompanyRoute = () => {
  const pathMatch = window.location.pathname.match(/^\/companies\/([^/]+)$/);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);

  const route = window.location.hash.slice(1).split("?")[0];
  const match = route.match(/^companies\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : "";
};

function App() {
  const [session, setSession] = useState(readStoredSession);
  const [page, setPageState] = useState("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [resetForm, setResetForm] = useState(emptyResetForm);
  const [formNotice, setFormNotice] = useState("");
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [profileViews, setProfileViews] = useState([]);
  const [profileViewsLoaded, setProfileViewsLoaded] = useState(false);
  const [profileViewsLoading, setProfileViewsLoading] = useState(false);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [companyEditing, setCompanyEditing] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const [employees, setEmployees] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminActivity, setAdminActivity] = useState(null);
  const [adminNotice, setAdminNotice] = useState("");

  const user = session?.user;
  const token = session?.token;
  const isCandidate = user?.role === "candidate";
  const isManager = user?.role === "hiring_manager";
  const isAdmin = user?.role === "admin";
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
    setSelectedCompany(null);
    setFormNotice("");
  };

  useEffect(() => {
    document.documentElement.lang = "ru";
    const authLink = readAuthLink();
    if (!authLink) return;

    if (authLink.mode === "reset") {
      setResetForm({ ...emptyResetForm, token: authLink.token });
      setAuthMode("reset");
      setAuthOpen(true);
    }

    if (authLink.mode === "verify") {
      setVerificationToken(authLink.token);
      setAuthMode("verify");
      setAuthOpen(true);
    }
  }, []);

  useEffect(() => {
    if (session) window.localStorage.setItem("inclusive-hire-session", JSON.stringify(session));
    else window.localStorage.removeItem("inclusive-hire-session");
  }, [session]);

  useEffect(() => {
    if (!user) {
      setPageState("home");
      return;
    }

    setAccountForm({ name: user.name ?? "" });
    setPageState(readCompanyRoute() ? "companies" : isManager && readCandidateRoute() ? "candidate" : isAdmin ? "adminActivity" : isManager ? "directory" : "profile");
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
    request("/api/companies/me", { headers: authHeaders(token) })
      .then((data) => {
        const company = data.company;
        setCompanyProfile(company);
        setCompanyForm({
          name: company.name ?? "",
          description: company.description ?? "",
          website: company.website ?? "",
          contactEmail: company.contacts?.email ?? "",
          phone: company.contacts?.phone ?? "",
          messenger: company.contacts?.messenger ?? "",
          accessibilityCommitments: (company.accessibilityCommitments ?? []).join(", ")
        });
        setCompanyEditing(false);
      })
      .catch(() => {
        setCompanyProfile(null);
        setCompanyForm(emptyCompanyForm);
        setCompanyEditing(true);
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
    if (page === "companies") loadCompanies();
  }, [user?.id, isCandidate, token, page]);

  useEffect(() => {
    if (!user || !token) return;

    const loadCompanyRoute = async () => {
      const companyId = readCompanyRoute();
      if (!companyId) return;

      try {
        const data = await request(`/api/companies/${companyId}`, { headers: authHeaders(token) });
        setSelectedCompany(data.company);
        setPageState("companies");
      } catch (error) {
        setFormNotice(error.message);
        setPage(isCandidate ? "companies" : isManager ? "directory" : "home");
      }
    };

    loadCompanyRoute();
    window.addEventListener("hashchange", loadCompanyRoute);
    window.addEventListener("popstate", loadCompanyRoute);
    return () => {
      window.removeEventListener("hashchange", loadCompanyRoute);
      window.removeEventListener("popstate", loadCompanyRoute);
    };
  }, [user?.id, token]);

  useEffect(() => {
    if (user || page !== "home") return;
    recordPageView("home");
  }, [page, user?.id]);

  useEffect(() => {
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

  const showAuth = (mode, role = "candidate") => {
    setAuthMode(mode);
    setAuthForm({ ...emptyAuthForm, role });
    setAuthError("");
    setAuthNotice("");
    setVerificationToken("");
    setResetForm({ ...emptyResetForm, email: authForm.email });
    setAuthOpen(true);
  };

  const handleAuthExpired = (error) => {
    if (error.status !== 401 && error.status !== 403) return false;

    setSession(null);
    setCandidateProfile(null);
    setProfileViews([]);
    setProfileViewsLoaded(false);
    setProfileViewsLoading(false);
    setEmployees([]);
    setSelectedProfile(null);
    setSelectedCompany(null);
    setFormNotice("Сессия истекла. Войдите снова.");
    showAuth("login", user?.role === "hiring_manager" ? "hiring_manager" : "candidate");
    return true;
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setAuthError("");

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
        setAuthNotice("Мы отправили ссылку для подтверждения email. Откройте письмо и перейдите по ссылке, чтобы завершить регистрацию.");
        setAuthMode("verify");
        return;
      }

      setSession(data);
      setAuthOpen(false);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const verifyEmail = async () => {
    setAuthError("");
    setAuthNotice("");

    try {
      const data = await request("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken })
      });
      setSession(data);
      setAuthOpen(false);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const requestPasswordReset = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");

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
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");

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
      window.history.replaceState(null, "", "#home");
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const signOut = () => {
    setSession(null);
    setCandidateProfile(null);
    setProfileViews([]);
    setProfileViewsLoaded(false);
    setProfileViewsLoading(false);
    setEmployees([]);
    setSelectedProfile(null);
    setPage("home");
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

  const saveCompany = async (event) => {
    event.preventDefault();
    setFormNotice("");

    try {
      await request("/api/companies/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          ...companyForm,
          website: companyForm.website || undefined,
          contacts: {
            email: companyForm.contactEmail || undefined,
            phone: companyForm.phone || undefined,
            messenger: companyForm.messenger || undefined
          },
          accessibilityCommitments: toList(companyForm.accessibilityCommitments)
        })
      });
      const company = await request("/api/companies/me", { headers: authHeaders(token) });
      setCompanyProfile(company.company);
      setCompanyEditing(false);
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

  const loadCompanies = async () => {
    try {
      const data = await request("/api/companies", { headers: authHeaders(token) });
      setCompanies(data.companies ?? []);
    } catch (error) {
      setFormNotice(error.message);
    }
  };

  const openCompany = async (company) => {
    try {
      const data = await request(`/api/companies/${company.id}`, { headers: authHeaders(token) });
      setSelectedCompany(data.company);
      setPageState("companies");
      window.history.pushState(null, "", `/companies/${company.id}`);
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
    try {
      const data = await request(`/api/admin/users/${userId}/password-reset`, {
        method: "POST",
        headers: authHeaders(token)
      });
      setAdminNotice(data.message ?? "Ссылка отправлена.");
    } catch (error) {
      setAdminNotice(error.message);
    }
  };

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
      />

      <main id="main-content">
        {page !== "candidate" && <Hero user={user} isCandidate={isCandidate} isManager={isManager} isAdmin={isAdmin} page={page} showAuth={showAuth} setPage={setPage} />}
        {!user && <PublicHome />}
        {isAdmin && (page === "adminUsers" || page === "adminActivity") && (
          <AdminPage
            page={page}
            users={adminUsers}
            activity={adminActivity}
            notice={adminNotice}
            loadUsers={loadAdminUsers}
            loadActivity={loadAdminActivity}
            sendPasswordReset={sendAdminPasswordReset}
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
        {isManager && page === "company" && (
          <CompanyPage
            companyForm={companyForm}
            setCompanyForm={setCompanyForm}
            companyProfile={companyProfile}
            companyEditing={companyEditing}
            setCompanyEditing={setCompanyEditing}
            saveCompany={saveCompany}
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
            setPage={setPage}
            returnPage="candidates"
            canManageCandidates={false}
          />
        )}
        {user && page === "companies" && (
          <CompaniesPage
            companies={companies}
            selectedCompany={selectedCompany}
            setSelectedCompany={setSelectedCompany}
            openCompany={openCompany}
            loadCompanies={loadCompanies}
            setPage={setPage}
            notice={formNotice}
          />
        )}
        <LegalNote />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <span>{YEAR}</span>
          <span>Некоммерческий сайт для поддержки инклюзивного трудоустройства.</span>
        </div>
      </footer>

      {authOpen && (
        <AuthModal
          authForm={authForm}
          authMode={authMode}
          authError={authError}
          authNotice={authNotice}
          verificationToken={verificationToken}
          resetForm={resetForm}
          setAuthForm={setAuthForm}
          setResetForm={setResetForm}
          setAuthMode={setAuthMode}
          setAuthOpen={setAuthOpen}
          setAuthError={setAuthError}
          setAuthNotice={setAuthNotice}
          submitAuth={submitAuth}
          verifyEmail={verifyEmail}
          requestPasswordReset={requestPasswordReset}
          resetPassword={resetPassword}
        />
      )}
    </div>
  );
}

function Header({ user, page, isCandidate, isManager, isAdmin, setPage, showAuth, signOut }) {
  const openStartPage = () => setPage(isAdmin ? "adminActivity" : isManager ? "directory" : isCandidate ? "profile" : "home");
  return (
    <header className="site-header">
      <button className="brand-button" type="button" onClick={openStartPage}>inclusive-hire</button>
      <nav aria-label="Главная навигация">
        {isManager && <button type="button" className={page === "directory" ? "nav-active" : ""} onClick={() => setPage("directory")}>Кандидаты</button>}
        {isManager && <button type="button" className={page === "company" ? "nav-active" : ""} onClick={() => setPage("company")}>Моя компания</button>}
        {isAdmin && <button type="button" className={page === "adminActivity" ? "nav-active" : ""} onClick={() => setPage("adminActivity")}>Активность</button>}
        {isAdmin && <button type="button" className={page === "adminUsers" ? "nav-active" : ""} onClick={() => setPage("adminUsers")}>Пользователи</button>}
        {isCandidate && <button type="button" className={page === "profile" ? "nav-active" : ""} onClick={() => setPage("profile")}>Мой профиль</button>}
        {isCandidate && <button type="button" className={page === "candidates" || page === "candidate" ? "nav-active" : ""} onClick={() => setPage("candidates")}>Кандидаты</button>}
        {isCandidate && <button type="button" className={page === "companies" ? "nav-active" : ""} onClick={() => setPage("companies")}>Компании</button>}
      </nav>
      <div className="header-actions">
        {user ? (
          <>
            <span className="account-chip">{user.name}</span>
            <button className="button secondary" type="button" onClick={signOut}>Выйти</button>
          </>
        ) : (
          <>
            <button className="button secondary" type="button" onClick={() => showAuth("login")}>Войти</button>
            <button className="button primary" type="button" onClick={() => showAuth("register")}>Регистрация</button>
          </>
        )}
      </div>
    </header>
  );
}

function Hero({ user, isCandidate, isManager, isAdmin, page, showAuth, setPage }) {
  const publicHero = !user;
  const title = publicHero
    ? "Найм людей с инвалидностью в Бишкеке"
    : isAdmin
      ? page === "adminUsers"
        ? "Пользователи"
        : "Активность платформы"
    : isManager
      ? page === "company"
        ? "Профиль компании"
        : "Профили соискателей"
      : page === "candidates"
        ? "Профили соискателей"
        : page === "companies"
          ? "Компании"
      : "Ваш профиль соискателя";
  const text = publicHero
    ? "Работодатели находят сильных специалистов, соискатели показывают опыт, навыки и удобный формат работы."
    : isAdmin
      ? page === "adminUsers"
        ? "Просматривайте аккаунты и отправляйте ссылки для смены пароля."
        : "Следите за пользователями, регистрациями и просмотрами главной страницы."
    : isManager
      ? page === "company"
        ? "Заполните описание, контакты и условия работы, чтобы соискатели понимали вашу команду."
        : "Используйте поиск, фильтры и карточки кандидатов, чтобы быстро найти человека под роль и открыть полный профиль."
      : page === "candidates"
        ? "Смотрите примеры профилей, навыки и форматы работы других соискателей."
        : page === "companies"
          ? "Изучайте компании, условия, контакты и подход к инклюзивному найму."
      : "Заполните профиль так, чтобы работодатель сразу понял ваш опыт, формат работы и условия доступности.";

  return (
    <section className={`hero hero-${publicHero ? "public" : page}`}>
      <div className="hero-content">
        <p className="eyebrow">Инклюзивный найм</p>
        <h1>{title}</h1>
        <p>{text}</p>
        {publicHero && (
          <div className="hero-actions">
            <button className="button primary" type="button" onClick={() => showAuth("login", "hiring_manager")}>Найти сотрудника</button>
            <button className="button secondary" type="button" onClick={() => showAuth("login", "candidate")}>Загрузить резюме</button>
          </div>
        )}
        {isCandidate && <button className="button primary" type="button" onClick={() => setPage("profile")}>Редактировать профиль</button>}
      </div>
    </section>
  );
}

function AdminPage({ page, users, activity, notice, loadUsers, loadActivity, sendPasswordReset }) {
  const metrics = activity
    ? [
        ["Всего пользователей", activity.totalUsers],
        ["Новые за 7 дней", activity.newUsersLast7Days],
        ["Профили соискателей", activity.candidates],
        ["Работодатели", activity.employers],
        ["Компании", activity.companies],
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
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                  <td>{roleLabels[item.role] ?? item.role}</td>
                  <td>{item.emailVerified ? "Подтвержден" : "Email не подтвержден"}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString("ru-RU")}</td>
                  <td>
                    <button className="button quiet compact" type="button" onClick={() => sendPasswordReset(item.id)}>
                      Сбросить пароль
                    </button>
                  </td>
                </tr>
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
        updateStatus={updateStatus}
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

function CompanyPage({ companyForm, setCompanyForm, companyProfile, companyEditing, setCompanyEditing, saveCompany, notice }) {
  return (
    <section className="company-profile-page">
      <div className="profile-title">
        <div>
          <p className="eyebrow">Работодатель</p>
          <h2>{companyProfile && !companyEditing ? "Профиль компании" : "Создать профиль компании"}</h2>
          <p>Эта информация будет доступна соискателям на странице компании.</p>
        </div>
        {companyProfile && !companyEditing && (
          <button className="button secondary" type="button" onClick={() => setCompanyEditing(true)}>Редактировать</button>
        )}
      </div>
      {notice && <p className="inline-notice error" role="alert">{notice}</p>}
      <CompanyPanel
        companyForm={companyForm}
        setCompanyForm={setCompanyForm}
        companyProfile={companyProfile}
        companyEditing={companyEditing}
        saveCompany={saveCompany}
      />
    </section>
  );
}

function CompanyPanel({ companyForm, setCompanyForm, companyProfile, companyEditing, saveCompany }) {
  if (companyProfile && !companyEditing) {
    return (
      <article className="company-panel company-page-card company-overview-card">
        <div className="company-overview-header">
          <div className="logo-mark company-logo">{companyProfile.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <h3>{companyProfile.name}</h3>
            {companyProfile.website && (
              <a className="company-website" href={companyProfile.website} target="_blank" rel="noreferrer">
                {companyProfile.website}
              </a>
            )}
          </div>
        </div>
        {companyProfile.description && <p className="company-description">{companyProfile.description}</p>}
        <div className="company-overview-grid">
          <section className="company-info-block">
            <h4>Контакты</h4>
            <CompanyContacts company={companyProfile} />
          </section>
          <section className="company-info-block">
            <h4>Условия работы</h4>
            <TagList items={companyProfile.accessibilityCommitments ?? []} empty="Условия пока не указаны." />
          </section>
        </div>
      </article>
    );
  }

  return (
    <article className="company-panel company-page-card">
      <form onSubmit={saveCompany}>
        <h3>Компания</h3>
        <div className="company-form-grid">
          <Field id="companyName" label="Название" value={companyForm.name} onChange={(value) => setCompanyForm({ ...companyForm, name: value })} required className="span-2" />
          <Field id="website" label="Сайт" type="url" value={companyForm.website} onChange={(value) => setCompanyForm({ ...companyForm, website: value })} className="span-2" />
          <Field id="companyContactEmail" label="Email для связи" type="email" value={companyForm.contactEmail} onChange={(value) => setCompanyForm({ ...companyForm, contactEmail: value })} />
          <Field id="companyPhone" label="Телефон" value={companyForm.phone} onChange={(value) => setCompanyForm({ ...companyForm, phone: value })} />
          <Field id="companyMessenger" label="Мессенджер" value={companyForm.messenger} onChange={(value) => setCompanyForm({ ...companyForm, messenger: value })} placeholder="@company или номер" className="span-2" />
          <TextField id="companyDescription" label="Описание" value={companyForm.description} onChange={(value) => setCompanyForm({ ...companyForm, description: value })} rows="4" className="span-2" />
          <TextField id="commitments" label="Инклюзивные условия" value={companyForm.accessibilityCommitments} onChange={(value) => setCompanyForm({ ...companyForm, accessibilityCommitments: value })} rows="4" className="span-2" />
        </div>
        <button className="button secondary full" type="submit">Сохранить компанию</button>
      </form>
    </article>
  );
}

function CompaniesPage({ companies, selectedCompany, setSelectedCompany, openCompany, loadCompanies, setPage, notice }) {
  if (selectedCompany) {
    return (
      <section className="companies-section">
        <div className="profile-title">
          <div>
            <p className="eyebrow">Компания</p>
            <h2>{selectedCompany.name}</h2>
            {selectedCompany.website && <p><a href={selectedCompany.website} target="_blank" rel="noreferrer">{selectedCompany.website}</a></p>}
          </div>
          <button className="button secondary" type="button" onClick={() => { setSelectedCompany(null); setPage("companies"); }}>Назад к компаниям</button>
        </div>
        {notice && <p className="inline-notice error" role="alert">{notice}</p>}
        <article className="company-detail-card">
          {selectedCompany.description && <p>{selectedCompany.description}</p>}
          <CompanyContacts company={selectedCompany} />
          <h3>Инклюзивные условия</h3>
          <TagList items={selectedCompany.accessibilityCommitments ?? []} empty="Условия пока не указаны." />
        </article>
      </section>
    );
  }

  return (
    <section className="companies-section">
      <div className="results-top">
        <div>
          <p className="eyebrow">Работодатели</p>
          <h2>Компании</h2>
          <p>Посмотрите описание компании, контакты и условия для инклюзивной работы.</p>
        </div>
        <button className="button quiet" type="button" onClick={loadCompanies}>Обновить</button>
      </div>
      {notice && <p className="inline-notice error" role="alert">{notice}</p>}
      <div className="company-list-grid">
        {companies.length === 0 ? (
          <p className="empty-state">Компании пока не добавлены.</p>
        ) : (
          companies.map((company) => <CompanyCard key={company.id} company={company} onClick={() => openCompany(company)} />)
        )}
      </div>
    </section>
  );
}

function CompanyCard({ company, onClick }) {
  return (
    <article className="company-card compact">
      <div className="logo-mark company-logo">{company.name.slice(0, 2).toUpperCase()}</div>
      <div className="company-card-body">
        <h3>{company.name}</h3>
        {company.website && <p>{company.website}</p>}
        {company.description && <p>{company.description}</p>}
        <CompanyContacts company={company} compact />
        <button className="button primary card-action" type="button" onClick={onClick}>Подробнее</button>
      </div>
    </article>
  );
}

function CompanyContacts({ company, compact = false }) {
  const contacts = company?.contacts ?? {};
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

function ProfilePage({ user, accountForm, setAccountForm, profileForm, setProfileForm, profileLists, candidateProfile, saveProfile, uploadCv, profileViews, profileViewsLoaded, profileViewsLoading, loadProfileViews, downloadCandidateCv, notice }) {
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
      {notice && <p className="inline-notice" role="status">{notice}</p>}
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
            <Field id="location" label="Город или формат работы" value={profileForm.location} onChange={(value) => setProfileForm({ ...profileForm, location: value })} />
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
            <Field id="availability" label="Статус поиска" value={profileForm.availability} onChange={(value) => setProfileForm({ ...profileForm, availability: value })} />
          </section>
          <button className="button primary wide" type="submit">Сохранить профиль</button>
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
                  const companyId = view.company?.id ?? view.company?._id;
                  return (
                    <li key={view.id}>
                      {companyId ? (
                        <a href={`/companies/${companyId}`}>{view.company.name ?? "Компания"}</a>
                    ) : (
                      <span>Компания</span>
                    )}
                      <span>{new Date(view.viewedAt).toLocaleDateString("ru-RU")}</span>
                    </li>
                  );
                })}
              </ul>
            )}
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
          <li>Навыки: {(candidate.skills ?? []).slice(0, 3).join(", ") || "не указаны"}</li>
          <li>Языки: {(candidate.languages ?? []).join(", ") || "не указаны"}</li>
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

function CandidateProfilePage({ profile, onBack, downloadCandidateCv, updateStatus, canManageCandidates = true }) {
  return (
    <section className="candidate-profile-page" aria-label="Профиль кандидата">
      <div className="profile-title">
        <div>
          <p className="eyebrow">Полный профиль</p>
          <h2>{profile.user?.name}</h2>
        </div>
        <button className="button secondary" type="button" onClick={onBack}>Назад к профилям</button>
      </div>
      <div className={canManageCandidates ? "candidate-profile-layout" : "candidate-profile-layout simple"}>
        <ProfileSummary profile={profile} detailed onDownloadCv={!canManageCandidates && profile.cv?.originalName ? () => downloadCandidateCv(profile) : undefined} />
        {canManageCandidates && (
          <aside className="profile-actions-card">
            <h3>Действия</h3>
            <button className="button primary full" type="button" onClick={() => downloadCandidateCv(profile)} disabled={!profile.cv?.originalName}>
              {profile.cv?.originalName ? "Скачать резюме" : "Резюме не загружено"}
            </button>
            <div className="status-actions vertical">
              {statuses.map((status) => (
                <button key={status} className="button secondary full" type="button" onClick={() => updateStatus(profile.id, status)}>
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

function ProfileDrawer({ profile, onClose, updateStatus }) {
  return (
    <section className="profile-drawer" aria-label="Профиль кандидата">
      <div className="drawer-shell">
        <div className="card-heading-row">
          <h2>{profile.user?.name}</h2>
          <button className="button quiet" type="button" onClick={onClose}>Закрыть</button>
        </div>
        <ProfileSummary profile={profile} detailed />
        <div className="status-actions">
          {statuses.map((status) => (
            <button key={status} className="button secondary" type="button" onClick={() => updateStatus(profile.id, status)}>
              {statusLabels[status]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProfileSummary({ profile, detailed = false, onDownloadCv }) {
  const contacts = contactInfo(profile);
  const messengerLabel = contacts.messengerType === "whatsapp" ? "WhatsApp" : "Telegram";
  return (
    <section className={detailed ? "profile-card detailed" : "profile-card"}>
      <div className="profile-avatar">{(profile?.user?.name ?? "П").slice(0, 1)}</div>
      <h3>{profile?.headline || "Профиль соискателя"}</h3>
      {profile?.location && <p className="profile-location">{profile.location}</p>}
      {detailed && profile?.summary && <p className="profile-summary-text">{profile.summary}</p>}
      {detailed && profile?.portfolio && <p className="profile-location">{profile.portfolio}</p>}
      {detailed && (
        <>
          <h4>Контакты</h4>
          <ul className="contact-list">
            <li><span>Email</span><a href={`mailto:${contacts.email}`}>{contacts.email}</a></li>
            <li><span>{messengerLabel}</span><strong>{contacts.messenger}</strong></li>
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

function AuthModal({ authForm, authMode, authError, authNotice, verificationToken, resetForm, setAuthForm, setResetForm, setAuthMode, setAuthOpen, setAuthError, setAuthNotice, submitAuth, verifyEmail, requestPasswordReset, resetPassword }) {
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
    setAuthMode(nextMode);
    setAuthError("");
    setAuthNotice("");
  };

  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="card-heading-row">
          <h2 id="auth-title">{title}</h2>
          <button className="icon-close" type="button" aria-label="Закрыть" onClick={() => setAuthOpen(false)}>×</button>
        </div>
        {authError && <p className="inline-notice error" role="alert">{authError}</p>}
        {authNotice && <p className="inline-notice" role="status">{authNotice}</p>}
        {isVerify ? (
          <div className="verification-panel">
            {verificationToken ? (
              <>
                <p>Нажмите кнопку ниже, чтобы завершить подтверждение email.</p>
                <button className="button primary wide" type="button" onClick={verifyEmail}>Подтвердить email</button>
              </>
            ) : (
              <p>Письмо с подтверждением отправлено. Откройте ссылку из письма, чтобы завершить регистрацию.</p>
            )}
          </div>
        ) : isForgot ? (
          <form onSubmit={requestPasswordReset}>
            <p className="form-copy">Введите email, и мы отправим ссылку для установки нового пароля.</p>
            <Field id="resetEmail" label="Email" type="email" value={resetForm.email} onChange={(value) => setResetForm({ ...resetForm, email: value })} required />
            <button className="button primary wide" type="submit">Получить ссылку</button>
            <p className="auth-switch">
              Вспомнили пароль?{" "}
              <button type="button" className="link-button" onClick={() => switchMode("login")}>Войти</button>
            </p>
          </form>
        ) : isReset ? (
          <form onSubmit={resetPassword}>
            <p className="form-copy">Введите новый пароль для вашего аккаунта.</p>
            <PasswordField id="newPassword" label="Новый пароль" value={resetForm.password} onChange={(value) => setResetForm({ ...resetForm, password: value })} showPassword={showPassword} setShowPassword={setShowPassword} required />
            <button className="button primary wide" type="submit">Сохранить новый пароль</button>
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
            {isLogin && <button className="link-button forgot-button" type="button" onClick={() => { setResetForm({ ...emptyResetForm, email: authForm.email }); switchMode("forgot"); }}>Забыли пароль?</button>}
            <button className="button primary wide" type="submit">{isLogin ? "Войти" : "Создать аккаунт"}</button>
            <p className="auth-switch">
              {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
              <button type="button" className="link-button" onClick={() => switchMode(isLogin ? "register" : "login")}>
                {isLogin ? "Зарегистрироваться" : "Войти"}
              </button>
            </p>
          </form>
        )}
      </section>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, showPassword, setShowPassword, ...props }) {
  return (
    <div className="password-field">
      <Field id={id} label={label} type={showPassword ? "text" : "password"} value={value} onChange={onChange} {...props} />
      <button className="button quiet password-toggle" type="button" onClick={() => setShowPassword(!showPassword)}>
        {showPassword ? "Скрыть" : "Показать"}
      </button>
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
