# inclusive-hire

`inclusive-hire` is a non-profit hiring platform for inclusive employment in Kyrgyzstan.

The project helps recruiters find candidates with disabilities and helps job seekers present their experience, skills, work preferences, contacts, and resume in a calm, accessible format.

## What It Does

- Supports registration and login for candidates, recruiters, and admins.
- Verifies user email addresses before full account access.
- Lets candidates create and edit a full profile with skills, languages, location, availability, employment format, contacts, portfolio, and resume.
- Shows candidate cards with filtering by location, skills, languages, and work format.
- Provides separate full profile pages for candidates.
- Lets recruiters view candidate details, open contact links, and download resumes.
- Lets recruiters create and edit their own public recruiter profile.
- Tracks profile views and platform activity.
- Gives admins tools to manage users, reset passwords, verify accounts, disable users, delete users, and review activity.
- Stores uploaded resumes in Cloudflare R2 when cloud storage is enabled.

## Technologies

- **React**: frontend user interface.
- **Vite**: frontend build tooling.
- **Node.js**: backend runtime.
- **Express**: API server.
- **MongoDB**: database for users, profiles, recruiters, views, and activity.
- **Mongoose**: MongoDB models and queries.
- **Nginx**: internal entry point and reverse proxy.
- **Docker Compose**: container orchestration for the app services.
- **Cloudflare Tunnel**: public HTTPS access to the home-lab server.
- **Cloudflare R2**: object storage for resumes and backups.
- **Nodemailer**: email sending from the API.
- **Mailpit**: local test email inbox.
- **GitHub Actions**: image builds and laptop deployment automation.
- **GitHub Container Registry**: storage for production Docker images.

## Project Goal

The goal is to make inclusive hiring easier by giving employers a simple way to discover candidates and giving people with disabilities a respectful place to show their professional profile.

This is a non-profit website for supporting inclusive employment.
