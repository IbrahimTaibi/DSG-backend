const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

function emailWrapper({ title, bodyHtml }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
      <div style="background: #4f8cff; color: #fff; padding: 24px 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 2em;">DSG</h1>
        <h2 style="margin: 0; font-size: 1.2em; font-weight: 400;">${title}</h2>
      </div>
      <div style="padding: 24px 20px;">
        ${bodyHtml}
      </div>
      <div style="background: #f7f7f7; color: #888; padding: 12px 20px; text-align: center; font-size: 13px;">
        &copy; ${new Date().getFullYear()} DSG. All rights reserved.
      </div>
    </div>
  `;
}

module.exports = Object.assign(sendEmail, { emailWrapper });
