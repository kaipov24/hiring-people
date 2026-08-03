# inclusive-hire

`inclusive-hire` is an accessible, multi-service hiring platform intended to help people with disabilities connect with inclusive employers.

## Current Status

### Step 1: Directory Inspection

Completed:
- Inspected the current working directory.
- Confirmed the repository contains an empty `README.md` and a `.git` directory.
- Confirmed the Git working tree was clean before project setup began.

Why it was needed:
- The project instructions require checking existing files before creating or modifying anything.
- This avoids deleting, overwriting, or reorganizing existing work.

Commands used:
```bash
pwd
rg --files
ls -la
git status --short
sed -n '1,220p' README.md
```

How to verify:
```bash
git status --short
```

Verification result:
- `git status --short` returned no output before Step 2 began.

### Step 2: Initial Directory Structure

Completed:
- Created the initial project directories for the API, frontend, Nginx, reusable Docker base images, and local secret placeholders.
- Added `.gitkeep` placeholder files so empty directories can be tracked by Git.

Why it was needed:
- The project needs clear service boundaries before implementing Express, React, Docker, Nginx, MongoDB, and Redis.
- Keeping the initial structure small makes each later step verifiable.

Commands used:
```bash
mkdir -p api web nginx docker/base/api docker/base/web secrets
```

Important configuration decisions:
- No application framework, package manager files, Dockerfiles, or secrets were added in this step.
- The `secrets/` directory exists only as a local placeholder location. Real secret values must not be committed.

How to verify:
```bash
find . -maxdepth 4 -type d
find . -maxdepth 5 -name .gitkeep
git status --short
```

Verification result:
- The expected service directories exist: `api/`, `web/`, `nginx/`, `docker/base/api/`, `docker/base/web/`, and `secrets/`.
- The expected `.gitkeep` files exist in each empty project directory.
- `git status --short` shows only the Step 2 additions and README update.

### Step 3: Express API Foundation

Completed:
- Added a minimal Express API package.
- Added an application entry point, server startup file, health route, and centralized 404/error middleware.
- Removed `api/.gitkeep` because the API directory now contains real project files.

Why it was needed:
- The backend needs a small foundation before database, authentication, file upload, and role-based hiring workflows are added.
- A health endpoint gives later Docker and Nginx configuration something stable to verify.

Commands used:
```bash
node --check api/src/server.js
node --check api/src/app.js
node --check api/src/routes/health.routes.js
node --check api/src/middleware/error.middleware.js
find api -maxdepth 3 -type f
git status --short
```

Important configuration decisions:
- The API uses native ECMAScript modules with `"type": "module"`.
- The only runtime dependency declared so far is `express`.
- Dependencies were declared but not installed in this step, so no `node_modules/` or lockfile was created.
- The API listens on `PORT` and defaults to `4000`.
- The initial health endpoint is `GET /health`.

How to verify:
```bash
node --check api/src/server.js
node --check api/src/app.js
node --check api/src/routes/health.routes.js
node --check api/src/middleware/error.middleware.js
find api -maxdepth 3 -type f
git status --short
```

Verification result:
- All API source files passed `node --check`.
- `find api -maxdepth 3 -type f` showed the expected API package and source files.
- `git status --short` shows the README update and untracked project directories from the setup steps.

### Step 4: MongoDB Integration and Initial Models

Completed:
- Added a reusable MongoDB connection module using Mongoose.
- Added initial Mongoose models for users, companies, candidate profiles, profile views, and candidate hiring statuses.
- Updated the API server startup and shutdown flow to connect and disconnect from MongoDB.
- Declared `mongoose` as an API dependency.

Why it was needed:
- The platform needs persistent data for authentication, company profiles, candidate profiles, CV metadata, profile views, and hiring statuses.
- Defining the initial models now gives later endpoint work clear data relationships and indexes.

Commands used:
```bash
node --check api/src/config/database.js
node --check api/src/models/user.model.js
node --check api/src/models/company.model.js
node --check api/src/models/candidate-profile.model.js
node --check api/src/models/profile-view.model.js
node --check api/src/models/candidate-status.model.js
node --check api/src/server.js
find api/src -maxdepth 3 -type f
git status --short
```

Important configuration decisions:
- MongoDB access is configured through `MONGODB_URI`; no credentials or secret values are stored in the repository.
- Mongoose `autoIndex` is enabled outside production and disabled in production by default.
- Users support the `candidate` and `hiring_manager` roles.
- Candidate statuses are limited to `Viewed`, `Contacted`, and `Hired`.
- Candidate status records are unique per candidate and company.
- Candidate profile CV fields store metadata only; actual upload handling will be added later.

How to verify:
```bash
node --check api/src/config/database.js
node --check api/src/models/user.model.js
node --check api/src/models/company.model.js
node --check api/src/models/candidate-profile.model.js
node --check api/src/models/profile-view.model.js
node --check api/src/models/candidate-status.model.js
node --check api/src/server.js
find api/src -maxdepth 3 -type f
git status --short
```

Verification result:
- The database module, all model files, and the updated server file passed `node --check`.
- `find api/src -maxdepth 3 -type f` showed the expected config, middleware, model, route, app, and server files.
- `git status --short` shows the README update and untracked project directories from the setup steps.

### Step 5: Redis Integration

Completed:
- Added a reusable Redis cache connection module.
- Updated API startup and shutdown to connect and disconnect Redis alongside MongoDB.
- Declared `redis` as an API dependency.

Why it was needed:
- The platform requires Redis for caching.
- Centralizing the Redis client gives later endpoint work one consistent way to cache and retrieve data.

Commands used:
```bash
node --check api/src/config/cache.js
node --check api/src/server.js
find api/src/config -maxdepth 1 -type f
git status --short
```

Important configuration decisions:
- Redis access is configured through `REDIS_URL`; no credentials or secret values are stored in the repository.
- The cache client is initialized during API startup and closed during graceful shutdown.
- No endpoint-level caching was added in this step; that will be added later where it provides clear value.

How to verify:
```bash
node --check api/src/config/cache.js
node --check api/src/server.js
find api/src/config -maxdepth 1 -type f
git status --short
```

Verification result:
- The Redis cache module and updated server file passed `node --check`.
- `find api/src/config -maxdepth 1 -type f` showed both `database.js` and `cache.js`.
- `git status --short` shows the README update and untracked project directories from the setup steps.

### Step 6: Authentication and Role Authorization

Completed:
- Added candidate and hiring-manager registration and login routes.
- Added password hashing with `bcryptjs` and JWT signing/verification with `jsonwebtoken`.
- Added request validation with `zod`.
- Added authentication and role authorization middleware.
- Added `GET /api/auth/me` for retrieving the authenticated user.
- Updated centralized error responses to include validation details when present.

Why it was needed:
- Later candidate, company, CV, profile-view, and hiring-status endpoints need authenticated users and role checks.
- Registration and login are required features for both candidates and hiring managers.

Commands used:
```bash
node --check api/src/controllers/auth.controller.js
node --check api/src/middleware/auth.middleware.js
node --check api/src/routes/auth.routes.js
node --check api/src/utils/async-handler.js
node --check api/src/utils/jwt.js
node --check api/src/utils/validation.js
node --check api/src/app.js
node --check api/src/middleware/error.middleware.js
find api/src -maxdepth 3 -type f
git status --short
```

Important configuration decisions:
- JWT signing uses `JWT_SECRET`; no secret value is stored in the repository.
- JWT expiry defaults to `1h` and can be overridden with `JWT_EXPIRES_IN`.
- Registration supports only the `candidate` and `hiring_manager` roles.
- Passwords must be 8 to 128 characters and are stored only as bcrypt hashes.
- Role authorization middleware was added for future protected endpoints, but no role-restricted business routes were added in this step.

How to verify:
```bash
node --check api/src/controllers/auth.controller.js
node --check api/src/middleware/auth.middleware.js
node --check api/src/routes/auth.routes.js
node --check api/src/utils/async-handler.js
node --check api/src/utils/jwt.js
node --check api/src/utils/validation.js
node --check api/src/app.js
node --check api/src/middleware/error.middleware.js
find api/src -maxdepth 3 -type f
git status --short
```

Verification result:
- The auth controller, auth middleware, auth routes, utility modules, app file, and centralized error middleware passed `node --check`.
- `find api/src -maxdepth 3 -type f` showed the expected auth, config, model, route, utility, app, and server files.
- `git status --short` shows the README update and untracked project directories from the setup steps.

### Step 7: Candidate Profiles and CV Uploads

Completed:
- Added protected candidate profile routes for profile creation, update, and retrieval.
- Added protected hiring-manager routes for listing candidate profiles, viewing one profile, and downloading a candidate CV.
- Added CV upload handling with `multer`.
- Added local upload storage under `api/uploads/`.
- Declared `multer` as an API dependency.

Why it was needed:
- Candidates need an accessible professional profile and CV upload capability.
- Hiring managers need protected access to browse candidate profiles and retrieve uploaded CVs.

Commands used:
```bash
node --check api/src/config/uploads.js
node --check api/src/controllers/candidate.controller.js
node --check api/src/routes/candidate.routes.js
node --check api/src/app.js
find api -maxdepth 3 -type f
git status --short
```

Important configuration decisions:
- Candidate profile create/update uses `PUT /api/candidates/me` and is restricted to candidates.
- CV upload uses `POST /api/candidates/me/cv` with multipart field name `cv` and is restricted to candidates.
- Candidate listing, profile detail, and CV download routes are restricted to hiring managers.
- CV uploads are limited to 5 MB and to PDF, DOC, or DOCX MIME types.
- Uploaded files are stored locally for now; Docker volume mapping will be handled later.

How to verify:
```bash
node --check api/src/config/uploads.js
node --check api/src/controllers/candidate.controller.js
node --check api/src/routes/candidate.routes.js
node --check api/src/app.js
find api -maxdepth 3 -type f
git status --short
```

Verification result:
- The upload configuration, candidate controller, candidate routes, and updated app file passed `node --check`.
- `find api -maxdepth 3 -type f` showed the expected API source files and upload placeholder.
- `git status --short` shows the README update and untracked project directories from the setup steps.

### Step 8: Profile Views and Hiring Statuses

Completed:
- Added hiring-manager company profile creation and retrieval.
- Added public hired-company listing with Redis caching.
- Recorded a profile view when a hiring manager retrieves a candidate profile.
- Added candidate access to profile-view history.
- Added hiring-manager candidate status updates for `Viewed`, `Contacted`, and `Hired`.
- Invalidated the hired-companies cache when a company profile changes or a candidate is newly marked `Hired`.

Why it was needed:
- Candidates need to see which companies opened their profile.
- Hiring managers need to manage candidate progress through the required hiring statuses.
- The hired-companies public section needs a backend endpoint and is a clear use case for Redis caching.

Commands used:
```bash
node --check api/src/controllers/company.controller.js
node --check api/src/routes/company.routes.js
node --check api/src/controllers/candidate.controller.js
node --check api/src/routes/candidate.routes.js
node --check api/src/app.js
find api/src -maxdepth 3 -type f
git status --short
```

Important configuration decisions:
- Hiring managers must create a company profile before viewing candidates or updating candidate statuses.
- `GET /api/candidates/:id` records a profile view for the hiring manager's company.
- `GET /api/candidates/me/views` returns the authenticated candidate's recent profile views.
- `PATCH /api/candidates/:id/status` updates one company-specific candidate status.
- `GET /api/companies/hired` returns up to 12 companies with at least one hired candidate and caches the response for 300 seconds.

How to verify:
```bash
node --check api/src/controllers/company.controller.js
node --check api/src/routes/company.routes.js
node --check api/src/controllers/candidate.controller.js
node --check api/src/routes/candidate.routes.js
node --check api/src/app.js
find api/src -maxdepth 3 -type f
git status --short
```

Verification result:
- The company controller, company routes, updated candidate controller, updated candidate routes, and app wiring passed `node --check`.
- `find api/src -maxdepth 3 -type f` showed the expected controllers, routes, config, middleware, model, utility, app, and server files.
- `git status --short` shows the README update and untracked project directories from the setup steps.

### Step 9: Accessible React Frontend

Completed:
- Added a React frontend package using Vite.
- Added the HTML entry point, React entry point, main app component, and responsive CSS.
- Added accessible public, candidate, and hiring-manager UI sections.
- Removed `web/.gitkeep` because the frontend directory now contains real project files.

Why it was needed:
- The platform needs a browser interface for account access, candidate profiles, CV uploads, company profiles, candidate browsing, status updates, profile views, and hired-company highlights.
- The frontend must use semantic HTML, labels, keyboard-friendly controls, visible focus states, responsive layout, and useful status messages.

Commands used:
```bash
node -p "JSON.parse(require('node:fs').readFileSync('web/package.json', 'utf8')) && 'web/package.json is valid JSON'"
find web -maxdepth 3 -type f
git status --short
```

Important configuration decisions:
- The frontend uses React with Vite as the build tool.
- API requests default to same-origin paths and can use `VITE_API_BASE_URL` when needed.
- The UI includes a skip link, semantic regions, labeled inputs, native form controls, visible focus states, `role="status"` messaging, and responsive layouts.
- Dependencies were declared but not installed in this step, so no `node_modules/` or lockfile was created.

How to verify:
```bash
node -p "JSON.parse(require('node:fs').readFileSync('web/package.json', 'utf8')) && 'web/package.json is valid JSON'"
find web -maxdepth 3 -type f
git status --short
```

Verification result:
- `web/package.json` parsed as valid JSON.
- `find web -maxdepth 3 -type f` showed the expected React package, HTML entry point, source files, and stylesheet.
- `git status --short` shows the README update and untracked project directories from the setup steps.

### Step 10: Nginx Reverse Proxy

Completed:
- Added an Nginx configuration for the platform request flow.
- Configured `/api/` requests to proxy to the Express API service.
- Configured `/uploads/` requests to proxy to the Express API service for uploaded-file retrieval.
- Configured all other requests to proxy to the React web service.
- Removed `nginx/.gitkeep` because the Nginx directory now contains real configuration.

Why it was needed:
- The platform requires Nginx as the reverse proxy.
- Nginx provides one browser-facing entry point while keeping service-to-service traffic on the Docker network later.

Commands used:
```bash
find nginx -maxdepth 2 -type f
rg "proxy_pass http://api_service" nginx/nginx.conf
rg "proxy_pass http://web_service" nginx/nginx.conf
rg "X-Forwarded-For" nginx/nginx.conf
git status --short
```

Important configuration decisions:
- Nginx listens on port `80`.
- The API upstream is named `api_service` and points to `api:4000`.
- The web upstream is named `web_service` and points to `web:3000`.
- `client_max_body_size` is set to `6m`, slightly above the API CV upload limit of 5 MB.
- Proxy headers include `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto`.
- A lightweight `GET /health` response is defined for the future Nginx container health check.

How to verify:
```bash
find nginx -maxdepth 2 -type f
rg "proxy_pass http://api_service" nginx/nginx.conf
rg "proxy_pass http://web_service" nginx/nginx.conf
rg "X-Forwarded-For" nginx/nginx.conf
git status --short
```

Verification result:
- `find nginx -maxdepth 2 -type f` showed `nginx/nginx.conf`.
- `rg "proxy_pass http://api_service" nginx/nginx.conf` found the API and uploads proxy locations.
- `rg "proxy_pass http://web_service" nginx/nginx.conf` found the React web proxy location.
- `rg "X-Forwarded-For" nginx/nginx.conf` found forwarded client IP headers in the proxy locations.
- `git status --short` shows the README update and untracked project directories from the setup steps.

### Step 11: Custom Reusable Base Images

Completed:
- Added a reusable Node base Dockerfile for the Express API service.
- Added a reusable Node base Dockerfile for the React web service.
- Removed base-image `.gitkeep` files because those directories now contain real Dockerfiles.

Why it was needed:
- The project requires custom reusable base images for the React and Express services.
- Shared base images keep common runtime defaults in one place before optimized application Dockerfiles are added.

Commands used:
```bash
find docker/base -maxdepth 3 -type f
rg "FROM node:20-alpine" docker/base
rg "USER node" docker/base
rg "ENTRYPOINT" docker/base
git status --short
```

Important configuration decisions:
- Both base images use `node:20-alpine`.
- Both base images set `NODE_ENV=production` and `WORKDIR /app`.
- Both base images install `dumb-init` for signal handling.
- Both base images switch to the built-in non-root `node` user.
- Base images were defined but not built in this step.

How to verify:
```bash
find docker/base -maxdepth 3 -type f
rg "FROM node:20-alpine" docker/base
rg "USER node" docker/base
rg "ENTRYPOINT" docker/base
git status --short
```

Verification result:
- `find docker/base -maxdepth 3 -type f` showed the API and web base Dockerfiles.
- `rg "FROM node:20-alpine" docker/base` found the shared Node Alpine base in both Dockerfiles.
- `rg "USER node" docker/base` found the non-root user setting in both Dockerfiles.
- `rg "ENTRYPOINT" docker/base` found the `dumb-init` entrypoint in both Dockerfiles.
- `git status --short` shows the README update and untracked project directories from the setup steps.

### Step 12: Git Ignore Rules and Frontend Polish

Completed:
- Added a root `.gitignore`.
- Ignored Node dependencies, build output, environment files, local secrets, uploaded CV files, logs, and local tooling caches.
- Polished the React interface with a role summary strip, clearer empty states, candidate skill tags, stronger status styling, and improved responsive layout.
- Fixed a JSX fallback expression so the frontend source is ready for a later build check.

Why it was needed:
- The repository needs guardrails before dependency installation, builds, uploads, secrets, and container artifacts are introduced.
- The frontend needed a refinement pass before Docker work so the app has a clearer first screen and more usable role-specific workspaces.

Commands used:
```bash
find . -maxdepth 2 -name .gitignore -type f
rg "node_modules" .gitignore
rg "secrets/\\*" .gitignore
rg "api/uploads/\\*" .gitignore
rg "role-strip" web/src/App.jsx web/src/styles.css
rg "empty-state" web/src/App.jsx web/src/styles.css
git status --short
```

Important configuration decisions:
- `secrets/.gitkeep` remains trackable, but real files under `secrets/` are ignored.
- `api/uploads/.gitkeep` remains trackable, but uploaded CV files are ignored.
- No dependencies were installed and no build was run in this step.
- The next Docker step will be the optimized application Dockerfiles.

How to verify:
```bash
find . -maxdepth 2 -name .gitignore -type f
rg "node_modules" .gitignore
rg "secrets/\\*" .gitignore
rg "api/uploads/\\*" .gitignore
rg "role-strip" web/src/App.jsx web/src/styles.css
rg "empty-state" web/src/App.jsx web/src/styles.css
git status --short
```

Verification result:
- `find . -maxdepth 2 -name .gitignore -type f` showed the root `.gitignore`.
- `rg "node_modules" .gitignore` found dependency ignore rules.
- `rg "secrets/\\*" .gitignore` found the local secret-file ignore rule.
- `rg "api/uploads/\\*" .gitignore` found the uploaded CV-file ignore rule.
- `rg "role-strip" web/src/App.jsx web/src/styles.css` found the polished role summary UI and styles.
- `rg "empty-state" web/src/App.jsx web/src/styles.css` found the improved empty-state UI and styles.
- `git status --short` shows the README update, new `.gitignore`, and untracked project directories from the setup steps.

### Step 13: Optimized Application Dockerfiles

Completed:
- Added an API application Dockerfile that inherits from the custom API base image.
- Added a web application Dockerfile with a multi-stage React production build and Nginx runtime.
- Added API and web `.dockerignore` files.

Why it was needed:
- The project requires optimized application Dockerfiles with useful layer caching and small production images.
- Docker build contexts need to exclude local dependencies, build output, environment files, uploads, logs, and editor noise.

Commands used:
```bash
find api web -maxdepth 2 -name Dockerfile -o -name .dockerignore
rg "FROM inclusive-hire-api-base" api/Dockerfile
rg "FROM inclusive-hire-web-base" web/Dockerfile
rg "FROM nginx:1.27-alpine" web/Dockerfile
rg "HEALTHCHECK" api/Dockerfile web/Dockerfile
rg "node_modules" api/.dockerignore web/.dockerignore
git status --short
```

Important configuration decisions:
- The API runtime image inherits from `inclusive-hire-api-base:latest`.
- The web build stage inherits from `inclusive-hire-web-base:latest`.
- The web runtime image uses `nginx:1.27-alpine` and copies only the built React `dist/` output.
- Both application Dockerfiles include service-level health checks for later Compose wiring.
- Because lockfiles do not exist yet, Dockerfiles use `npm install`; once lockfiles are generated, this should be tightened to `npm ci`.
- Docker images were defined but not built in this step.

How to verify:
```bash
find api web -maxdepth 2 -name Dockerfile -o -name .dockerignore
rg "FROM inclusive-hire-api-base" api/Dockerfile
rg "FROM inclusive-hire-web-base" web/Dockerfile
rg "FROM nginx:1.27-alpine" web/Dockerfile
rg "HEALTHCHECK" api/Dockerfile web/Dockerfile
rg "node_modules" api/.dockerignore web/.dockerignore
git status --short
```

Verification result:
- `find api web -maxdepth 2 -name Dockerfile -o -name .dockerignore` showed the API and web Dockerfiles plus `.dockerignore` files.
- `rg "FROM inclusive-hire-api-base" api/Dockerfile` found the custom API base image in dependency and runtime stages.
- `rg "FROM inclusive-hire-web-base" web/Dockerfile` found the custom web base image in the dependency stage.
- `rg "FROM nginx:1.27-alpine" web/Dockerfile` found the small production web runtime image.
- `rg "HEALTHCHECK" api/Dockerfile web/Dockerfile` found health checks in both app Dockerfiles.
- `rg "node_modules" api/.dockerignore web/.dockerignore` found dependency exclusions in both Docker build contexts.
- `git status --short` shows the README update, new `.gitignore`, and untracked project directories from the setup steps.

### Step 14: Initial Docker Compose Topology

Completed:
- Added `compose.yaml` with the required `web`, `api`, `mongodb`, `redis`, and `nginx` services.
- Wired the API service to the local API Dockerfile.
- Wired the web service to the local web Dockerfile.
- Mounted `nginx/nginx.conf` into the Nginx service.
- Exposed Nginx on host port `8080`.
- Updated the Nginx web upstream from `web:3000` to `web:80` to match the production web container.

Why it was needed:
- Docker Compose is the required entry point for running the multi-container application.
- The production web Dockerfile serves static React assets through Nginx on port `80`, so the reverse proxy must target that port.

Commands used:
```bash
docker compose config
rg "web:80" nginx/nginx.conf
rg "mongodb:" compose.yaml
rg "redis:" compose.yaml
rg "nginx:" compose.yaml
git status --short
```

Important configuration decisions:
- The host-facing application port is `8080` for now to avoid requiring privileged port `80`.
- `JWT_SECRET` is temporarily a placeholder so `docker compose config` can validate; it will move to Docker secrets in the next secrets step.
- MongoDB currently uses a no-auth local URI; Docker secrets and MongoDB credentials will be added in the next focused step.
- Named volumes, a custom network, health-based dependencies, and logging rotation are intentionally left for the next focused Docker steps.
- Compose was validated but containers were not started in this step.

How to verify:
```bash
docker compose config
rg "web:80" nginx/nginx.conf
rg "mongodb:" compose.yaml
rg "redis:" compose.yaml
rg "nginx:" compose.yaml
git status --short
```

Verification result:
- `docker compose config` rendered a valid Compose configuration.
- `rg "web:80" nginx/nginx.conf` confirmed Nginx points to the production web container port.
- `rg "mongodb:" compose.yaml` found the MongoDB service and API MongoDB URI.
- `rg "redis:" compose.yaml` found the Redis service and API Redis URL.
- `rg "nginx:" compose.yaml` found the Nginx service.
- `git status --short` shows the README update, new `.gitignore`, new Compose file, and untracked project directories from the setup steps.

### Step 15: Docker Network, Volumes, and Secrets

Completed:
- Added a custom Docker bridge network named `inclusive_hire_net`.
- Added named volumes for MongoDB data, Redis data, and API uploads.
- Added Docker secrets for the MongoDB password and JWT secret.
- Added example secret files without real secret values.
- Added API startup logic that reads Docker secret files and builds the MongoDB URI from secret-backed values.

Why it was needed:
- The project requires a custom Docker network, named persistence volumes, and Docker secrets for sensitive values.
- Secrets must not be hardcoded in Git or passed as plain committed values.

Commands used:
```bash
node --check api/src/config/secrets.js
node --check api/src/server.js
docker compose config
rg "inclusive_hire_net" compose.yaml
rg "mongodb_data" compose.yaml
rg "redis_data" compose.yaml
rg "api_uploads" compose.yaml
rg "mongodb_password" compose.yaml secrets/mongodb_password.example
rg "jwt_secret" compose.yaml secrets/jwt_secret.example
git status --short
```

Important configuration decisions:
- Real secret files are expected at `secrets/mongodb_password` and `secrets/jwt_secret`, and those paths are ignored by `.gitignore`.
- Example files are committed as `secrets/mongodb_password.example` and `secrets/jwt_secret.example`.
- `.gitignore` explicitly allows `secrets/*.example` while ignoring real secret files.
- MongoDB root username is `inclusive_hire`; the password comes from the Docker secret.
- API upload persistence uses the `api_uploads` named volume mounted at `/app/uploads`.
- Containers were not started in this step.

How to verify:
```bash
node --check api/src/config/secrets.js
node --check api/src/server.js
docker compose config
rg "inclusive_hire_net" compose.yaml
rg "mongodb_data" compose.yaml
rg "redis_data" compose.yaml
rg "api_uploads" compose.yaml
rg "mongodb_password" compose.yaml secrets/mongodb_password.example
rg "jwt_secret" compose.yaml secrets/jwt_secret.example
git status --short
```

Verification result:
- `api/src/config/secrets.js` and the updated API server passed `node --check`.
- `docker compose config` rendered a valid Compose configuration with the custom network, named volumes, and secrets.
- `rg "inclusive_hire_net" compose.yaml` found the custom network on services and in the network definition.
- `rg "mongodb_data" compose.yaml`, `rg "redis_data" compose.yaml`, and `rg "api_uploads" compose.yaml` found the named persistence volumes.
- `rg "mongodb_password" compose.yaml secrets/mongodb_password.example` found MongoDB secret wiring and the example file.
- `rg "jwt_secret" compose.yaml secrets/jwt_secret.example` found JWT secret wiring and the example file.
- `git status --short` shows the README update, new `.gitignore`, new Compose file, and untracked project directories from the setup steps.

### Step 16: Compose Health Checks and Health-Based Dependencies

Completed:
- Added health checks for `mongodb`, `redis`, `api`, `web`, and `nginx`.
- Updated API dependencies to wait for healthy MongoDB and Redis services.
- Updated Nginx dependencies to wait for healthy API and web services.

Why it was needed:
- Every required service needs a meaningful health check.
- Health-based dependencies make startup order more reliable than service-start ordering alone.

Commands used:
```bash
docker compose config
rg "healthcheck" compose.yaml
rg "condition: service_healthy" compose.yaml
rg "mongosh" compose.yaml
rg "redis-cli" compose.yaml
rg "127.0.0.1:4000/health" compose.yaml
rg "127.0.0.1/health" compose.yaml
git status --short
```

Important configuration decisions:
- MongoDB health uses `mongosh` with a ping command.
- Redis health uses `redis-cli ping`.
- API health checks `GET /health` on port `4000`.
- Web health checks the static Nginx runtime at `http://127.0.0.1/`.
- Nginx health checks its own `/health` endpoint.
- Containers were not started in this step.

How to verify:
```bash
docker compose config
rg "healthcheck" compose.yaml
rg "condition: service_healthy" compose.yaml
rg "mongosh" compose.yaml
rg "redis-cli" compose.yaml
rg "127.0.0.1:4000/health" compose.yaml
rg "127.0.0.1/health" compose.yaml
git status --short
```

Verification result:
- `docker compose config` rendered a valid Compose configuration with health checks and health-based dependencies.
- `rg "healthcheck" compose.yaml` found five service health-check blocks.
- `rg "condition: service_healthy" compose.yaml` found health-based dependencies for API and Nginx.
- `rg "mongosh" compose.yaml` found the MongoDB ping health check.
- `rg "redis-cli" compose.yaml` found the Redis ping health check.
- `rg "127.0.0.1:4000/health" compose.yaml` found the API health check.
- `rg "127.0.0.1/health" compose.yaml` found the Nginx health check.
- `git status --short` shows the README update, new `.gitignore`, new Compose file, and untracked project directories from the setup steps.

### Step 17: JSON-File Logging with Rotation

Completed:
- Added explicit Docker `json-file` logging configuration to `mongodb`, `redis`, `api`, `web`, and `nginx`.
- Added log rotation limits for every service.

Why it was needed:
- The project requires JSON-file logging with log rotation for every service.
- Rotation prevents local container logs from growing without bounds.

Commands used:
```bash
docker compose config
rg "driver: json-file" compose.yaml
rg "max-size" compose.yaml
rg "max-file" compose.yaml
git status --short
```

Important configuration decisions:
- Each service uses Docker's `json-file` logging driver.
- Each service caps individual log files at `10m`.
- Each service keeps up to `5` rotated log files.
- Containers were not started in this step.

How to verify:
```bash
docker compose config
rg "driver: json-file" compose.yaml
rg "max-size" compose.yaml
rg "max-file" compose.yaml
git status --short
```

Verification result:
- `docker compose config` rendered a valid Compose configuration with logging blocks.
- `rg "driver: json-file" compose.yaml` found five JSON-file logging driver entries.
- `rg "max-size" compose.yaml` found five log-size rotation entries.
- `rg "max-file" compose.yaml` found five rotated-file count entries.
- `git status --short` shows the README update, new `.gitignore`, new Compose file, and untracked project directories from the setup steps.

### Step 18: First Full Build and Run Attempt

Completed:
- Created local Docker secret files for MongoDB and JWT.

Why it was needed:
- Docker Compose needs the secret source files before the stack can build and run.
- This is the first step that attempts to move from static configuration checks to container build and startup verification.

Commands used:
```bash
openssl rand -base64 48
openssl rand -base64 48
git status --short
docker build -t inclusive-hire-api-base:latest docker/base/api
docker build -t inclusive-hire-web-base:latest docker/base/web
docker compose build
docker compose up -d
docker compose ps
curl -i http://localhost:8080/health
curl -I http://localhost:8080/
curl -i http://localhost:8080/api/companies/hired
```

Important configuration decisions:
- Real secret files are local-only and ignored by `.gitignore`.
- The base images must be built before the API and web application images because their Dockerfiles inherit from `inclusive-hire-api-base:latest` and `inclusive-hire-web-base:latest`.
- If build or startup fails, the failed command output is the verification result for this step.

How to verify:
```bash
git status --short
docker build -t inclusive-hire-api-base:latest docker/base/api
docker build -t inclusive-hire-web-base:latest docker/base/web
docker compose build
docker compose up -d
docker compose ps
curl -i http://localhost:8080/health
curl -I http://localhost:8080/
curl -i http://localhost:8080/api/companies/hired
```

Verification result:
- Local ignored secret files were created at `secrets/mongodb_password` and `secrets/jwt_secret`.
- `git status --short` did not list the real secret files individually.
- The first unprivileged `docker build` attempt failed with Docker socket permission denied, then the same base-image builds succeeded after Docker access approval.
- `docker compose build` built `inclusive-hire-api:latest` and `inclusive-hire-web:latest`.
- `docker compose up -d` started the complete stack.
- `docker compose ps` showed `mongodb`, `redis`, `api`, `web`, and `nginx` all `healthy`.
- `curl -i http://localhost:8080/health` returned `HTTP/1.1 200 OK` and `nginx ok`.
- `curl -I http://localhost:8080/` returned `HTTP/1.1 200 OK` with `Content-Type: text/html`.
- `curl -i http://localhost:8080/api/companies/hired` returned `HTTP/1.1 200 OK` with `{"companies":[],"cached":false}`.

Known warnings:
- API image build reported the `multer` 1.x deprecation warning.
- Web image build reported two npm audit findings from the declared frontend dependency set.

### Step 19: End-to-End API Workflow Verification

Completed:
- Registered a candidate through Nginx.
- Registered a hiring manager through Nginx.
- Created a candidate profile.
- Created a hiring-manager company profile.
- Listed candidate profiles as the hiring manager.
- Viewed a candidate profile as the hiring manager.
- Retrieved the candidate's profile-view history.
- Updated the candidate status to `Hired`.
- Verified the company appears in the public hired-companies endpoint.
- Verified the hired-companies endpoint returns cached data on the second request.

Why it was needed:
- Container health checks verify service readiness, but not application behavior.
- This workflow proves authentication, role authorization, MongoDB persistence, profile views, hiring statuses, and Redis caching work together through the Nginx entry point.

Commands used:
```bash
curl -s -X POST http://localhost:8080/api/auth/register
curl -s -X POST http://localhost:8080/api/auth/register
curl -s -X PUT http://localhost:8080/api/candidates/me
curl -s -X PUT http://localhost:8080/api/companies/me
curl -s http://localhost:8080/api/candidates
curl -s http://localhost:8080/api/candidates/6a702b880c3d045a131a89cb
curl -s http://localhost:8080/api/candidates/me/views
curl -s -X PATCH http://localhost:8080/api/candidates/6a702b880c3d045a131a89cb/status
curl -s http://localhost:8080/api/companies/hired
curl -s http://localhost:8080/api/companies/hired
```

Important configuration decisions:
- Test users used unique `+e2e` email addresses.
- CV upload was not included in this workflow; it should be verified in a separate focused step.
- The running stack was left up after verification.

How to verify:
```bash
docker compose ps
curl -s http://localhost:8080/api/companies/hired
```

Verification result:
- Candidate registration returned a candidate user and JWT.
- Hiring-manager registration returned a hiring-manager user and JWT.
- Candidate profile creation returned profile ID `6a702b880c3d045a131a89cb`.
- Company profile creation returned company ID `6a702b910c3d045a131a89d1`.
- Candidate listing returned the created candidate profile.
- Candidate detail retrieval succeeded and recorded a profile view.
- Candidate profile-view history returned `Northstar Inclusive Labs`.
- Status update returned `Hired`.
- First public hired-companies request returned `hiredCandidateCount: 1` and `cached: false`.
- Second public hired-companies request returned the same company with `cached: true`.

### Step 20: Frontend Redesign and Directory Filters

Completed:
- Replaced the old `Workspace` interface with role-specific product flows.
- Added header `Sign in` and `Sign up` buttons that open an authentication modal.
- Added a hiring-manager employee directory with candidate cards.
- Added location, skills, and languages filters.
- Added click-to-open candidate profile details with hiring status actions.
- Added candidate profile language support.
- Added backend filtering for candidate `location`, `skills`, and `languages`.
- Fixed the blank-page React runtime bug by importing the default `React` binding in `App.jsx`.
- Added defensive parsing for the stored browser session.

Why it was needed:
- The previous UI was too generic and centered on a vague `Workspace` section.
- Hiring managers need to browse candidate cards, filter them, and open profiles directly.
- The blank page was caused by the production bundle referencing `React.createElement` without a default `React` import.

Commands used:
```bash
node --check api/src/models/candidate-profile.model.js
node --check api/src/controllers/candidate.controller.js
node --check api/src/routes/candidate.routes.js
docker compose build api web
docker compose up -d api web
docker compose ps
curl -s "http://localhost:8080/api/candidates?location=Remote&skills=accessibility%20testing"
curl -s http://localhost:8080/
curl -I http://localhost:8080/assets/index-BYRuGw_L.js
```

Important configuration decisions:
- Employee filters are comma-separated text fields.
- Skills and languages are matched case-insensitively as exact array entries.
- Location uses a case-insensitive partial text match.
- Hiring managers must still have a company profile before opening a candidate detail, because profile views are recorded against a company.

How to verify:
```bash
docker compose ps
curl -s http://localhost:8080/
curl -s "http://localhost:8080/api/candidates?location=Remote&skills=accessibility%20testing"
```

Verification result:
- API model, controller, and route syntax checks passed.
- API and web images rebuilt successfully.
- API and web containers were recreated and are healthy.
- The filtered candidate API route returned the matching Remote candidate with `accessibility testing`.
- Live HTML serves the redesigned frontend bundle `index-BYRuGw_L.js`.
- The live bundle contains `Employee directory`, `Filters`, `Sign in`, and `Sign up`.
- The live bundle has zero unresolved `React.createElement` references.

## Directory Structure

Implemented so far:
```text
.
├── .gitignore
├── README.md
├── compose.yaml
├── api/
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── config/
│       │   ├── cache.js
│       │   ├── database.js
│       │   ├── secrets.js
│       │   └── uploads.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── candidate.controller.js
│       │   └── company.controller.js
│       ├── middleware/
│       │   ├── auth.middleware.js
│       │   └── error.middleware.js
│       ├── models/
│       │   ├── candidate-profile.model.js
│       │   ├── candidate-status.model.js
│       │   ├── company.model.js
│       │   ├── profile-view.model.js
│       │   └── user.model.js
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── candidate.routes.js
│       │   ├── company.routes.js
│       │   └── health.routes.js
│       ├── server.js
│       └── utils/
│           ├── async-handler.js
│           ├── jwt.js
│           └── validation.js
│   └── uploads/
│       └── .gitkeep
├── docker/
│   └── base/
│       ├── api/
│       │   └── Dockerfile
│       └── web/
│           └── Dockerfile
├── nginx/
│   └── nginx.conf
├── secrets/
│   ├── .gitkeep
│   ├── jwt_secret.example
│   └── mongodb_password.example
└── web/
    ├── .dockerignore
    ├── Dockerfile
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx
        ├── main.jsx
        └── styles.css
```

## Planned Documentation

This README will be expanded only as features are implemented and verified. It will eventually document:
- Project purpose.
- Main user roles and features.
- Architecture and request flow.
- Directory structure.
- Prerequisites.
- Local setup.
- Environment configuration.
- Secret creation.
- Base-image creation.
- Docker image builds.
- Docker Compose usage.
- Service descriptions.
- Network and volume configuration.
- Health checks.
- Logging and rotation.
- API endpoint summary.
- Accessibility decisions.
- Verification and testing commands.
- Troubleshooting.
- Cleanup commands.
