# inclusive-hire

`inclusive-hire` is a non-profit hiring platform for inclusive employment in Kyrgyzstan.

The site helps employers find candidates with limited abilities and helps job seekers present their experience, skills, preferred working conditions, contacts, and resume.

## Main Features

- Employer and job seeker registration with email verification.
- Candidate profile cards with filters by location, languages, and skills.
- Separate full profile pages for each candidate.
- Resume upload and download.
- Cloudflare R2 storage support for uploaded resumes.
- Editable job seeker and company profiles.
- Local email testing through Mailpit.

## Run Locally

```bash
docker compose up -d
```

Open:

- App: http://localhost:8080
- Local email inbox: http://localhost:8025

## Environment

Copy `.env.example` to `.env` for local or cloud configuration.

Required production values:

- `PUBLIC_SITE_URL`: `https://kaipov24.github.io/hiring-people`.
- `PUBLIC_APP_URL`: local or tunnel URL for the running app/API.
- `JWT_EXPIRES_IN`: login session lifetime.
- SMTP settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
- `ADMIN_EMAILS`: comma-separated admin account emails.
- Optional Cloudflare R2 resume storage: `STORAGE_DRIVER=r2`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
- `secrets/mongodb_password` and `secrets/jwt_secret`: strong private values.

## Admin

Create a normal account first, then add its email to `ADMIN_EMAILS` in `.env` and restart the API. Use that same account password to log in as admin.

Admins can check SMTP readiness through `/api/admin/email/status` and send a test message through `/api/admin/email/test`.

## SEO

The public homepage is crawlable and includes canonical metadata, Open Graph/Twitter tags, JSON-LD, `robots.txt`, and `sitemap.xml`.

Candidate profiles, company pages, API responses, and uploaded files are protected/private surfaces and are marked `noindex`.

Set `PUBLIC_SITE_URL=https://kaipov24.github.io/hiring-people` before building the landing page so canonical URLs and the sitemap use the live GitHub Pages URL.

## Cloud Deploy

1. Provision MongoDB, persistent upload storage, and SMTP.
2. Set production secrets and environment variables from `.env.example`.
3. Build with `PUBLIC_SITE_URL` set to the final HTTPS domain.
4. Put TLS in front of nginx through your cloud load balancer, reverse proxy, or managed ingress.
5. Keep `/health`, `/robots.txt`, and `/sitemap.xml` publicly reachable.
6. Configure SPF, DKIM, and DMARC for the email sender domain.

## GitHub Pages + Home Lab

You can keep the public landing page on GitHub Pages and run the private app/API from a home lab server.

- Landing page: build with `VITE_DEPLOY_TARGET=landing`.
- Home app: build normally with `VITE_DEPLOY_TARGET=app`.
- `VITE_APP_BASE_URL` should point to the home app URL. Keep `http://localhost:8080` for local testing, then change it when the Cloudflare Tunnel hostname is ready.
- The landing page checks `VITE_APP_BASE_URL/health`.
- If the home server is online, login and registration buttons link to the app.
- If the home server is offline, the landing page stays online but disables login/registration.

GitHub Pages workflow: `.github/workflows/deploy-landing.yml`.

Required GitHub repository variables:

- `PUBLIC_SITE_URL`: `https://kaipov24.github.io/hiring-people`.
- `APP_BASE_URL`: home app URL.
- `PAGES_BASE_PATH`: optional. Leave empty for relative GitHub Pages assets, use `/repo-name/` only if you want an explicit project-page base path.

Optional home lab tunnel:

```bash
docker compose -f compose.yaml -f compose.homelab.yaml up -d
```

Set `CLOUDFLARE_TUNNEL_TOKEN` in `.env` before using the tunnel override.

Full setup guide: `docs/homelab-cloudflare.md`.
Temporary internet access without a domain is also documented there.

## Image Deploy

GitHub Actions builds and pushes runtime images to GitHub Container Registry:

- `ghcr.io/kaipov24/inclusive-hire-api:latest`
- `ghcr.io/kaipov24/inclusive-hire-web:latest`

On the Linux laptop:

```bash
git pull
docker compose pull
docker compose up -d
```

If the GHCR packages are private, log in first with a GitHub token that has `read:packages`:

```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u kaipov24 --password-stdin
```

Automatic laptop deploy uses a GitHub self-hosted runner. Setup guide: `docs/laptop-runner.md`.
Laptop backup and restore commands: `docs/laptop-operations.md`.
Cloudflare R2 resume storage setup: `docs/cloudflare-r2.md`.

Quick runner setup on the laptop:

```bash
cd ~
mkdir -p actions-runner
cd actions-runner
```

In GitHub, open:

```text
Repository -> Settings -> Actions -> Runners -> New self-hosted runner
```

Choose Linux x64 and run the download/config commands GitHub shows.

Answer the config prompts like this:

```text
Runner group: press Enter for Default
Runner name: inclusive-hire-laptop
Additional labels: inclusive-hire-laptop
Work folder: press Enter for _work
```

Install and start the runner service:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

The deploy workflow writes runtime files to:

```text
/opt/inclusive-hire
```

Create it once on the laptop:

```bash
sudo mkdir -p /opt/inclusive-hire
sudo chown -R $USER:$USER /opt/inclusive-hire
```

To redeploy manually from GitHub:

```text
Actions -> Deploy laptop -> Run workflow
```

## Notes

This is a non-profit project. It is designed to support fairer and more accessible hiring.

