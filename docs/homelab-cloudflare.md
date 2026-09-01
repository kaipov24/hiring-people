# Home Lab Cloudflare Tunnel

Use this setup when GitHub Pages serves the always-online landing page at `https://inclusive-hire.org.kg` and the full app runs on your Linux laptop at `https://app.inclusive-hire.org.kg`.

## Temporary Internet Access Without A Domain

Use this for testing before buying a domain. It creates a temporary `trycloudflare.com` URL. The URL changes when the tunnel restarts.

On the laptop:

```bash
cd /opt/inclusive-hire
docker compose -f compose.yaml -f compose.quick-tunnel.yaml up -d cloudflared-quick
docker logs inclusive-hire-cloudflared-quick 2>&1 | grep -o 'https://[^ ]*trycloudflare.com' | tail -1
```

Open the printed URL in a browser.

If registration and password reset emails should use this public URL, update these GitHub repository variables to the printed URL:

```text
PUBLIC_APP_URL
VITE_APP_BASE_URL
APP_BASE_URL
```

Then rerun:

```text
Actions -> Deploy laptop -> Run workflow
Actions -> Deploy landing page -> Run workflow
```

Do not expose Mailpit to the internet. Mailpit is only for local email testing.

## 1. Prepare DNS and Tunnel

In Cloudflare Zero Trust:

1. Open `Networks` -> `Tunnels`.
2. Create a tunnel named `inclusive-hire`.
3. Choose Docker as the connector.
4. Copy the tunnel token.
5. Add a public hostname:
  - Subdomain: `app`
  - Domain: `inclusive-hire.org.kg`
  - Service type: `HTTP`
  - Service URL: `http://nginx:80`

The final app URL should look like:

```text
https://app.inclusive-hire.org.kg
```

## 2. Configure The Laptop

Copy the example env file:

```bash
cp .env.homelab.example .env
```

Edit `.env`:

```env
PUBLIC_SITE_URL=https://inclusive-hire.org.kg
PUBLIC_APP_URL=https://app.inclusive-hire.org.kg
VITE_APP_BASE_URL=https://app.inclusive-hire.org.kg
CLOUDFLARE_TUNNEL_TOKEN=your-cloudflare-token
ADMIN_EMAILS=your-email@example.com
SMTP_USER=your-brevo-smtp-login
SMTP_PASS=your-brevo-smtp-key
MAIL_FROM="inclusive-hire <no-reply@inclusive-hire.org.kg>"
```

Create secrets if they do not exist:

```bash
openssl rand -base64 32 > secrets/mongodb_password
openssl rand -base64 64 > secrets/jwt_secret
```

Check the configuration:

```bash
./scripts/check-env.sh --require-tunnel
```

## 3. Start The App

```bash
docker compose -f compose.yaml -f compose.homelab.yaml up -d --build
```

Check status:

```bash
docker compose -f compose.yaml -f compose.homelab.yaml ps
curl -i https://app.inclusive-hire.org.kg/health
```

## 4. GitHub Pages Variables

In GitHub repository settings, set:

```text
PUBLIC_SITE_URL=https://inclusive-hire.org.kg
APP_BASE_URL=https://app.inclusive-hire.org.kg
```

Then rerun the `Deploy landing page` workflow.

## 5. What Happens When Laptop Is Off

GitHub Pages remains online.

The landing page checks:

```text
https://app.inclusive-hire.org.kg/health
```

If the laptop is offline, login and registration buttons are disabled and the page shows the offline DevOps message.
