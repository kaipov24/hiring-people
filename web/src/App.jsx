import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const authRoles = ["candidate", "hiring_manager"];
const statuses = ["Viewed", "Contacted", "Hired"];

const emptyAuthForm = {
  name: "",
  email: "",
  password: "",
  role: "candidate"
};

const emptyProfileForm = {
  headline: "",
  summary: "",
  skills: "",
  languages: "",
  accessibilityPreferences: "",
  location: ""
};

const emptyCompanyForm = {
  name: "",
  description: "",
  website: "",
  accessibilityCommitments: ""
};

const emptyFilters = {
  location: "",
  skills: "",
  languages: ""
};

const toList = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Request failed");
  }

  return data;
};

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`
});

const readStoredSession = () => {
  try {
    const stored = window.localStorage.getItem("inclusive-hire-session");
    return stored ? JSON.parse(stored) : null;
  } catch {
    window.localStorage.removeItem("inclusive-hire-session");
    return null;
  }
};

function App() {
  const [session, setSession] = useState(readStoredSession);
  const [authMode, setAuthMode] = useState("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [message, setMessage] = useState("");
  const [hiredCompanies, setHiredCompanies] = useState([]);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [profileViews, setProfileViews] = useState([]);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [filters, setFilters] = useState(emptyFilters);
  const [employees, setEmployees] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const user = session?.user;
  const token = session?.token;
  const isCandidate = user?.role === "candidate";
  const isHiringManager = user?.role === "hiring_manager";

  useEffect(() => {
    if (session) {
      window.localStorage.setItem("inclusive-hire-session", JSON.stringify(session));
      return;
    }

    window.localStorage.removeItem("inclusive-hire-session");
  }, [session]);

  useEffect(() => {
    request("/api/companies/hired")
      .then((data) => setHiredCompanies(data.companies ?? []))
      .catch(() => setHiredCompanies([]));
  }, []);

  useEffect(() => {
    if (!isHiringManager) {
      return;
    }

    loadEmployees();
  }, [isHiringManager]);

  const profileLists = useMemo(
    () => ({
      skills: toList(profileForm.skills),
      languages: toList(profileForm.languages)
    }),
    [profileForm.skills, profileForm.languages]
  );

  const showAuth = (mode) => {
    setAuthMode(mode);
    setAuthForm(emptyAuthForm);
    setMessage("");
    setAuthOpen(true);
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const path = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        authMode === "login"
          ? { email: authForm.email, password: authForm.password }
          : authForm;
      const data = await request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      setSession(data);
      setAuthOpen(false);
      setMessage("Signed in.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const signOut = () => {
    setSession(null);
    setCandidateProfile(null);
    setProfileViews([]);
    setEmployees([]);
    setSelectedProfile(null);
    setMessage("Signed out.");
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const data = await request("/api/candidates/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token)
        },
        body: JSON.stringify({
          ...profileForm,
          skills: profileLists.skills,
          languages: profileLists.languages
        })
      });

      setCandidateProfile(data.candidate);
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const uploadCv = async (event) => {
    event.preventDefault();
    setMessage("");

    const file = event.currentTarget.elements.cv.files[0];
    const formData = new FormData();
    formData.append("cv", file);

    try {
      const data = await fetch(`${API_BASE_URL}/api/candidates/me/cv`, {
        method: "POST",
        headers: authHeaders(token),
        body: formData
      }).then(async (response) => {
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error?.message ?? "CV upload failed");
        }

        return body;
      });

      setCandidateProfile(data.candidate);
      setMessage("CV uploaded.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const loadProfileViews = async () => {
    setMessage("");

    try {
      const data = await request("/api/candidates/me/views", {
        headers: authHeaders(token)
      });
      setProfileViews(data.views ?? []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const saveCompany = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await request("/api/companies/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token)
        },
        body: JSON.stringify({
          ...companyForm,
          accessibilityCommitments: toList(companyForm.accessibilityCommitments)
        })
      });
      setMessage("Company profile saved.");
      loadEmployees();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const loadEmployees = async (event, nextFilters = filters) => {
    event?.preventDefault();
    setMessage("");

    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value.trim()) {
        params.set(key, value.trim());
      }
    });

    try {
      const data = await request(`/api/candidates${params.toString() ? `?${params}` : ""}`, {
        headers: authHeaders(token)
      });
      setEmployees(data.candidates ?? []);
      setSelectedProfile(null);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const openEmployeeProfile = async (employee) => {
    setMessage("");

    try {
      const data = await request(`/api/candidates/${employee.id}`, {
        headers: authHeaders(token)
      });
      setSelectedProfile(data.candidate);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateStatus = async (candidateId, status) => {
    setMessage("");

    try {
      await request(`/api/candidates/${candidateId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token)
        },
        body: JSON.stringify({ status })
      });
      setMessage(`Candidate marked ${status}.`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <a className="brand" href="#main-content" aria-label="inclusive-hire home">
          inclusive-hire
        </a>
        <nav aria-label="Primary navigation">
          <a href="#directory">Employees</a>
          <a href="#companies">Hired companies</a>
          {isCandidate && <a href="#candidate-profile">My profile</a>}
        </nav>
        <div className="auth-actions">
          {user ? (
            <>
              <span>{user.name}</span>
              <button type="button" className="secondary-button" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button type="button" className="secondary-button" onClick={() => showAuth("login")}>
                Sign in
              </button>
              <button type="button" onClick={() => showAuth("register")}>
                Sign up
              </button>
            </>
          )}
        </div>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">Accessible hiring platform</p>
            <h1 id="hero-title">Find skilled candidates ready for inclusive teams</h1>
            <p>
              Browse employee profiles, filter by skills, languages, and location, then open a
              full profile to review accessibility preferences and hiring progress.
            </p>
            {!user && (
              <div className="button-row start-row">
                <button type="button" onClick={() => showAuth("register")}>
                  Create account
                </button>
                <button type="button" className="secondary-button" onClick={() => showAuth("login")}>
                  Sign in
                </button>
              </div>
            )}
          </div>
          <div className="hero-stats" aria-label="Platform highlights">
            <article>
              <strong>Profiles</strong>
              <span>Accessible candidate records with CV support</span>
            </article>
            <article>
              <strong>Filters</strong>
              <span>Location, languages, and skills</span>
            </article>
            <article>
              <strong>Status</strong>
              <span>Viewed, Contacted, Hired</span>
            </article>
          </div>
        </section>

        {message && (
          <p className="status-message" role="status" aria-live="polite">
            {message}
          </p>
        )}

        {isCandidate && (
          <CandidateProfilePanel
            candidateProfile={candidateProfile}
            loadProfileViews={loadProfileViews}
            profileForm={profileForm}
            profileLists={profileLists}
            profileViews={profileViews}
            saveProfile={saveProfile}
            setProfileForm={setProfileForm}
            uploadCv={uploadCv}
          />
        )}

        {isHiringManager ? (
          <EmployeeDirectory
            companyForm={companyForm}
            employees={employees}
            filters={filters}
            loadEmployees={loadEmployees}
            openEmployeeProfile={openEmployeeProfile}
            saveCompany={saveCompany}
            selectedProfile={selectedProfile}
            setCompanyForm={setCompanyForm}
            setFilters={setFilters}
            setSelectedProfile={setSelectedProfile}
            updateStatus={updateStatus}
          />
        ) : (
          <section id="directory" className="directory-preview" aria-labelledby="directory-title">
            <h2 id="directory-title">Employee directory</h2>
            <p className="section-copy">
              Hiring managers can sign in to browse employee cards, filter candidate profiles, and
              open full profiles.
            </p>
          </section>
        )}

        <section id="companies" aria-labelledby="companies-title">
          <h2 id="companies-title">Companies hiring through inclusive-hire</h2>
          <div className="company-list" aria-live="polite">
            {hiredCompanies.length === 0 ? (
              <p className="empty-state">No hired-company results are available yet.</p>
            ) : (
              hiredCompanies.map((company) => (
                <article key={company.id} className="company-card">
                  <h3>{company.name}</h3>
                  <p>{company.description}</p>
                  <p className="metric">{company.hiredCandidateCount} candidate hires</p>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {authOpen && (
        <AuthModal
          authForm={authForm}
          authMode={authMode}
          setAuthForm={setAuthForm}
          setAuthMode={setAuthMode}
          setAuthOpen={setAuthOpen}
          submitAuth={submitAuth}
        />
      )}
    </div>
  );
}

function AuthModal({ authForm, authMode, setAuthForm, setAuthMode, setAuthOpen, submitAuth }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="inline-heading">
          <h2 id="auth-title">{authMode === "login" ? "Sign in" : "Create account"}</h2>
          <button type="button" className="icon-button" onClick={() => setAuthOpen(false)}>
            Close
          </button>
        </div>

        <form onSubmit={submitAuth}>
          <fieldset className="segmented-control">
            <legend>Account action</legend>
            <label>
              <input
                type="radio"
                name="authMode"
                checked={authMode === "login"}
                onChange={() => setAuthMode("login")}
              />
              Sign in
            </label>
            <label>
              <input
                type="radio"
                name="authMode"
                checked={authMode === "register"}
                onChange={() => setAuthMode("register")}
              />
              Sign up
            </label>
          </fieldset>

          {authMode === "register" && (
            <>
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                value={authForm.name}
                onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                required
              />

              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={authForm.role}
                onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}
              >
                {authRoles.map((role) => (
                  <option key={role} value={role}>
                    {role === "candidate" ? "Candidate" : "Hiring manager"}
                  </option>
                ))}
              </select>
            </>
          )}

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={authForm.email}
            onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={authMode === "login" ? "current-password" : "new-password"}
            minLength="8"
            value={authForm.password}
            onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
            required
          />

          <button type="submit">{authMode === "login" ? "Sign in" : "Create account"}</button>
        </form>
      </section>
    </div>
  );
}

function CandidateProfilePanel({
  candidateProfile,
  loadProfileViews,
  profileForm,
  profileLists,
  profileViews,
  saveProfile,
  setProfileForm,
  uploadCv
}) {
  return (
    <section id="candidate-profile" className="panel-grid" aria-labelledby="candidate-profile-title">
      <form className="form-panel" onSubmit={saveProfile}>
        <h2 id="candidate-profile-title">My candidate profile</h2>

        <label htmlFor="headline">Headline</label>
        <input
          id="headline"
          value={profileForm.headline}
          onChange={(event) => setProfileForm({ ...profileForm, headline: event.target.value })}
          maxLength="160"
        />

        <label htmlFor="summary">Summary</label>
        <textarea
          id="summary"
          value={profileForm.summary}
          onChange={(event) => setProfileForm({ ...profileForm, summary: event.target.value })}
          rows="5"
          maxLength="3000"
        />

        <label htmlFor="skills">Skills, separated by commas</label>
        <input
          id="skills"
          value={profileForm.skills}
          onChange={(event) => setProfileForm({ ...profileForm, skills: event.target.value })}
        />

        <label htmlFor="languages">Languages, separated by commas</label>
        <input
          id="languages"
          value={profileForm.languages}
          onChange={(event) => setProfileForm({ ...profileForm, languages: event.target.value })}
        />

        <label htmlFor="accessibilityPreferences">Accessibility preferences</label>
        <textarea
          id="accessibilityPreferences"
          value={profileForm.accessibilityPreferences}
          onChange={(event) =>
            setProfileForm({ ...profileForm, accessibilityPreferences: event.target.value })
          }
          rows="4"
          maxLength="2000"
        />

        <label htmlFor="location">Location</label>
        <input
          id="location"
          value={profileForm.location}
          onChange={(event) => setProfileForm({ ...profileForm, location: event.target.value })}
          maxLength="160"
        />

        <button type="submit">Save profile</button>
      </form>

      <div className="stack">
        <form className="form-panel" onSubmit={uploadCv}>
          <h3>CV upload</h3>
          <label htmlFor="cv">CV file</label>
          <input id="cv" name="cv" type="file" accept=".pdf,.doc,.docx" required />
          <button type="submit">Upload CV</button>
        </form>

        <ProfileSummary
          profile={{
            ...candidateProfile,
            headline: candidateProfile?.headline ?? profileForm.headline,
            skills: candidateProfile?.skills ?? profileLists.skills,
            languages: candidateProfile?.languages ?? profileLists.languages,
            location: candidateProfile?.location ?? profileForm.location,
            cv: candidateProfile?.cv
          }}
        />

        <section className="summary-panel" aria-labelledby="profile-views-title">
          <div className="inline-heading">
            <h3 id="profile-views-title">Companies that opened my profile</h3>
            <button type="button" className="secondary-button" onClick={loadProfileViews}>
              Refresh
            </button>
          </div>
          {profileViews.length === 0 ? (
            <p className="empty-state">No company views loaded.</p>
          ) : (
            <ul className="plain-list">
              {profileViews.map((view) => (
                <li key={view.id}>
                  {view.company?.name ?? "Company"} viewed on{" "}
                  {new Date(view.viewedAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

function EmployeeDirectory({
  companyForm,
  employees,
  filters,
  loadEmployees,
  openEmployeeProfile,
  saveCompany,
  selectedProfile,
  setCompanyForm,
  setFilters,
  setSelectedProfile,
  updateStatus
}) {
  return (
    <section id="directory" aria-labelledby="directory-title">
      <div className="directory-header">
        <div>
          <p className="eyebrow">Hiring manager</p>
          <h2 id="directory-title">Employee directory</h2>
          <p className="section-copy">
            Filter candidates, open cards for a full profile, and update hiring status.
          </p>
        </div>
      </div>

      <div className="manager-layout">
        <aside className="filter-panel" aria-labelledby="filters-title">
          <form onSubmit={saveCompany}>
            <h3>Company profile</h3>
            <label htmlFor="companyName">Company name</label>
            <input
              id="companyName"
              value={companyForm.name}
              onChange={(event) => setCompanyForm({ ...companyForm, name: event.target.value })}
              required
              maxLength="160"
            />
            <label htmlFor="companyWebsite">Website</label>
            <input
              id="companyWebsite"
              type="url"
              value={companyForm.website}
              onChange={(event) => setCompanyForm({ ...companyForm, website: event.target.value })}
            />
            <label htmlFor="companyDescription">Description</label>
            <textarea
              id="companyDescription"
              value={companyForm.description}
              onChange={(event) => setCompanyForm({ ...companyForm, description: event.target.value })}
              rows="3"
              maxLength="2000"
            />
            <label htmlFor="accessibilityCommitments">
              Accessibility commitments, separated by commas
            </label>
            <textarea
              id="accessibilityCommitments"
              value={companyForm.accessibilityCommitments}
              onChange={(event) =>
                setCompanyForm({ ...companyForm, accessibilityCommitments: event.target.value })
              }
              rows="3"
            />
            <button type="submit">Save company</button>
          </form>

          <form onSubmit={loadEmployees}>
            <h3 id="filters-title">Filters</h3>
            <label htmlFor="filterLocation">Location</label>
            <input
              id="filterLocation"
              value={filters.location}
              onChange={(event) => setFilters({ ...filters, location: event.target.value })}
              placeholder="Remote, Bishkek, Berlin"
            />
            <label htmlFor="filterSkills">Skills</label>
            <input
              id="filterSkills"
              value={filters.skills}
              onChange={(event) => setFilters({ ...filters, skills: event.target.value })}
              placeholder="accessibility testing, data analysis"
            />
            <label htmlFor="filterLanguages">Languages</label>
            <input
              id="filterLanguages"
              value={filters.languages}
              onChange={(event) => setFilters({ ...filters, languages: event.target.value })}
              placeholder="English, Kyrgyz"
            />
            <div className="button-row">
              <button type="submit">Apply filters</button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setFilters(emptyFilters);
                  loadEmployees(undefined, emptyFilters);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </aside>

        <div>
          {employees.length === 0 ? (
            <p className="empty-state">No employee profiles match the current filters.</p>
          ) : (
            <div className="employee-grid">
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  className="employee-card"
                  onClick={() => openEmployeeProfile(employee)}
                >
                  <span>{employee.user?.name ?? "Candidate"}</span>
                  <strong>{employee.headline || "No headline provided"}</strong>
                  <small>{employee.location || "Location not provided"}</small>
                  <TagList items={employee.skills?.slice(0, 4) ?? []} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedProfile && (
        <section className="profile-drawer" aria-labelledby="selected-profile-title">
          <div className="inline-heading">
            <h3 id="selected-profile-title">{selectedProfile.user?.name ?? "Candidate profile"}</h3>
            <button type="button" className="secondary-button" onClick={() => setSelectedProfile(null)}>
              Close profile
            </button>
          </div>
          <ProfileSummary profile={selectedProfile} detailed />
          <div className="button-row" aria-label="Update candidate status">
            {statuses.map((status) => (
              <button
                key={status}
                type="button"
                className="secondary-button"
                onClick={() => updateStatus(selectedProfile.id, status)}
              >
                {status}
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function ProfileSummary({ profile, detailed = false }) {
  return (
    <section className="summary-panel" aria-labelledby="profile-summary-title">
      <h3 id="profile-summary-title">{profile?.headline || "Profile preview"}</h3>
      {profile?.location && <p className="metric">{profile.location}</p>}
      {detailed && profile?.summary && <p>{profile.summary}</p>}
      <h4>Skills</h4>
      <TagList items={profile?.skills ?? []} emptyText="No skills added yet." />
      <h4>Languages</h4>
      <TagList items={profile?.languages ?? []} emptyText="No languages added yet." />
      {detailed && profile?.accessibilityPreferences && (
        <>
          <h4>Accessibility preferences</h4>
          <p>{profile.accessibilityPreferences}</p>
        </>
      )}
      <p className="file-note">{profile?.cv?.originalName ?? "No CV uploaded yet."}</p>
    </section>
  );
}

function TagList({ items, emptyText = "None added." }) {
  if (!items || items.length === 0) {
    return <p className="empty-inline">{emptyText}</p>;
  }

  return (
    <ul className="tag-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default App;
