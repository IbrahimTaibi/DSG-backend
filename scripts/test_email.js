require("dotenv").config();
const sendEmail = require("../utils/email");

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

console.log("Starting test email script...");

(async () => {
  try {
    await sendEmail({
      to: process.env.SMTP_USER,
      subject: "Test Email from DSG Backend",
      html: "<p>This is a test email to confirm your email configuration is working.</p>",
    });
    console.log("Test email sent successfully!");
  } catch (err) {
    console.error("Failed to send test email:", err);
  }
  console.log("Test email script finished.");
})();
