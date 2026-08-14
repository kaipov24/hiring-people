# Laptop Self-Hosted Runner

Use this when GitHub Actions should deploy the latest GHCR images directly on the Linux laptop.

The workflow is:

```text
push to main
-> Deploy images builds and pushes GHCR images
-> Deploy laptop runs on the laptop
-> laptop pulls images and restarts containers
```

## 1. Prepare Laptop

Install Docker, Git, curl, and tar:

```bash
sudo apt update
sudo apt install -y git curl tar docker.io docker-compose-plugin openssl
sudo usermod -aG docker $USER
```

Log out and log back in, then check:

```bash
docker version
docker compose version
```

## 2. Prepare Runtime Directory

The deploy workflow writes runtime files to:

```text
/opt/inclusive-hire
```

Create it once and give your user ownership:

```bash
sudo mkdir -p /opt/inclusive-hire
sudo chown -R $USER:$USER /opt/inclusive-hire
```

The deploy workflow creates these files automatically from GitHub vars/secrets:

```text
/opt/inclusive-hire/.env
/opt/inclusive-hire/secrets/mongodb_password
/opt/inclusive-hire/secrets/jwt_secret
```

No full app source checkout is required on the laptop.

## 3. Configure GitHub Variables And Secrets

In GitHub:

```text
Repository -> Settings -> Secrets and variables -> Actions
```

Add variables:

```text
PUBLIC_SITE_URL=https://kaipov24.github.io/hiring-people
PUBLIC_APP_URL=http://localhost:8080
VITE_APP_BASE_URL=http://localhost:8080
JWT_EXPIRES_IN=8h
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_REQUIRE_TLS=false
SMTP_TLS_REJECT_UNAUTHORIZED=true
SMTP_CONNECTION_TIMEOUT_MS=10000
SMTP_SOCKET_TIMEOUT_MS=30000
MAIL_FROM=kaipov.kayrat@gmail.com
```

Add secrets:

```text
ADMIN_EMAILS=your-email@example.com
MONGODB_PASSWORD=<strong random value>
JWT_SECRET=<strong random value>
```

For local Mailpit testing, do not add `SMTP_USER`, `SMTP_PASS`, or `CLOUDFLARE_TUNNEL_TOKEN`.

Add these later only when needed:

```text
SMTP_USER=<brevo smtp login>
SMTP_PASS=<brevo smtp key>
CLOUDFLARE_TUNNEL_TOKEN=<cloudflare tunnel token>
```

Generate strong values locally if needed:

```bash
openssl rand -base64 32
openssl rand -base64 64
```

## 4. Add GitHub Runner

In GitHub:

```text
Repository -> Settings -> Actions -> Runners -> New self-hosted runner
```

Choose:

```text
Linux
x64
```

GitHub will show commands similar to:

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/vX.Y.Z/actions-runner-linux-x64-X.Y.Z.tar.gz
tar xzf ./actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/kaipov24/hiring-people --token YOUR_RUNNER_TOKEN
```

When it asks for labels, include this exact label:

```text
inclusive-hire-laptop
```

Keep the default labels too:

```text
self-hosted, linux, x64, inclusive-hire-laptop
```

## 5. Run Runner As A Service

From the `actions-runner` directory:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

## 6. Start Initial App

After the first successful deploy, check the app:

```bash
cd /opt/inclusive-hire
docker compose ps
curl -i http://localhost:8080/health
```

## 7. Deploy From GitHub

After `deploy-laptop.yml` is pushed:

1. Push to `main`.
2. Wait for `Deploy images` to finish.
3. `Deploy laptop` starts automatically on the laptop runner.

You can also run it manually:

```text
GitHub -> Actions -> Deploy laptop -> Run workflow
```

## Notes

- The laptop must be powered on and connected to the internet.
- The runner user must be able to run Docker.
- If GHCR packages are private, run `docker login ghcr.io` on the laptop once with a GitHub token that has `read:packages`.
