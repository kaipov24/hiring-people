import nodemailer from "nodemailer";

const smtpConfigured = () => Boolean(process.env.SMTP_HOST);

const buildTransport = () => {
  if (!smtpConfigured()) return null;

  const auth = process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS ?? ""
      }
    : undefined;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth
  });
};

let transport;

export const getPublicAppUrl = () => {
  return (process.env.PUBLIC_APP_URL ?? "http://localhost:8080").replace(/\/$/, "");
};

export const sendEmail = async ({ to, subject, text, html }) => {
  transport ??= buildTransport();

  if (!transport) {
    console.info(`Email delivery disabled. Message for ${to}: ${subject}\n${text}`);
    return;
  }

  await transport.sendMail({
    from: process.env.MAIL_FROM ?? "inclusive-hire <no-reply@inclusive-hire.local>",
    to,
    subject,
    text,
    html
  });
};

export const sendVerificationEmail = async ({ to, name, token }) => {
  const url = `${getPublicAppUrl()}/#verify-email?token=${token}`;

  await sendEmail({
    to,
    subject: "Подтверждение email для inclusive-hire",
    text: `Здравствуйте, ${name}.\n\nПодтвердите email, перейдя по ссылке:\n${url}\n\nЕсли вы не регистрировались на inclusive-hire, просто проигнорируйте это письмо.`,
    html: `<p>Здравствуйте, ${name}.</p><p>Подтвердите email, перейдя по ссылке:</p><p><a href="${url}">${url}</a></p><p>Если вы не регистрировались на inclusive-hire, просто проигнорируйте это письмо.</p>`
  });
};

export const sendPasswordResetEmail = async ({ to, name, token }) => {
  const url = `${getPublicAppUrl()}/#reset-password?token=${token}`;

  await sendEmail({
    to,
    subject: "Смена пароля inclusive-hire",
    text: `Здравствуйте, ${name}.\n\nЧтобы установить новый пароль, перейдите по ссылке:\n${url}\n\nСсылка действует 30 минут. Если вы не запрашивали смену пароля, просто проигнорируйте это письмо.`,
    html: `<p>Здравствуйте, ${name}.</p><p>Чтобы установить новый пароль, перейдите по ссылке:</p><p><a href="${url}">${url}</a></p><p>Ссылка действует 30 минут. Если вы не запрашивали смену пароля, просто проигнорируйте это письмо.</p>`
  });
};
