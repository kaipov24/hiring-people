# inclusive-hire

`inclusive-hire` is a non-profit hiring platform for inclusive employment in Kyrgyzstan.

The site helps employers find candidates with limited abilities and helps job seekers present their experience, skills, preferred working conditions, contacts, and resume.

## Main Features

- Employer and job seeker registration with email verification.
- Candidate profile cards with filters by location, languages, and skills.
- Separate full profile pages for each candidate.
- Resume upload and download.
- Editable job seeker and company profiles.
- Local email testing through Mailpit.

## Run Locally

```bash
docker compose up -d
```

Open:

- App: http://localhost:8080
- Local email inbox: http://localhost:8025

## Email

Local email goes to Mailpit by default. For real SMTP, copy `.env.example` to `.env`, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, then restart the API.

## Admin

Create a normal account first, then add its email to `ADMIN_EMAILS` in `.env` and restart the API. Use that same account password to log in as admin.

Admins can check SMTP readiness through `/api/admin/email/status` and send a test message through `/api/admin/email/test`.

## Notes

This is a non-profit project. It is designed to support fairer and more accessible hiring.
