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

## 2. Clone App

The deploy workflow expects this exact path:

```text
/home/kayrat/hiring-people
```

Clone there:

```bash
mkdir -p /home/kayrat/hiring-people
cd /home/kayrat/hiring-people
git clone git@github.com:kaipov24/hiring-people.git .
```

Create runtime config:

```bash
cp .env.homelab.example .env
openssl rand -base64 32 > secrets/mongodb_password
openssl rand -base64 64 > secrets/jwt_secret
```

Edit `.env` for local laptop testing:

```env
PUBLIC_SITE_URL=https://kaipov24.github.io/hiring-people
PUBLIC_APP_URL=http://localhost:8080
VITE_APP_BASE_URL=http://localhost:8080
ADMIN_EMAILS=your-email@example.com
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
MAIL_FROM=kaipov.kayrat@gmail.com
```

Check:

```bash
./scripts/check-homelab-env.sh
```

## 3. Add GitHub Runner

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

## 4. Run Runner As A Service

From the `actions-runner` directory:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

## 5. Start Initial App

Before relying on CI/CD, run once manually:

```bash
cd /home/kayrat/hiring-people
docker compose pull
docker compose up -d
docker compose ps
curl -i http://localhost:8080/health
```

## 6. Deploy From GitHub

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
