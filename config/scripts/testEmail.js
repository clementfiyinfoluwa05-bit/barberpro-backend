// Sends one test notification to EMAIL_USER using the app's real email code.
// Usage (from the backend folder):  node scripts/testEmail.js
require("dotenv").config();
const { sendEmail, verifyEmailTransport, describeEmailError, getEmailConfig } = require("../utils/sendEmail");

(async () => {
  const ok = await verifyEmailTransport();
  if (!ok) process.exit(1);
  try {
    const info = await sendEmail({
      to: getEmailConfig().user,
      subject: "Test - BarberPro booking notifications",
      html: "<p>If you can read this, booking notification emails are working.</p>",
    });
    console.log(`[email] test email accepted by Gmail: ${info.response}`);
  } catch (err) {
    console.error(`[email] test email FAILED: ${describeEmailError(err)}`);
    process.exit(1);
  }
})();
