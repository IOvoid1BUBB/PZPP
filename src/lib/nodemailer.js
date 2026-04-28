import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT ?? 1025);

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "127.0.0.1",
  port: Number.isNaN(smtpPort) ? 1025 : smtpPort,
  secure: smtpPort === 465, // true dla portu 465, false dla innych
  ...(process.env.SMTP_USER
    ? {
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
    : {}),
});

export const mailOptions = {
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
};