const nodemailer = require("nodemailer");

// Read an env var safely: trims whitespace and strips accidental surrounding
// quotes (a common mistake when pasting values into the Render dashboard).
const readEnv = (name) =>
  (process.env[name] || "").trim().replace(/^["']|["']$/g, "");

const getEmailConfig = () => ({
  user: readEnv("EMAIL_USER"),
  // Gmail App Passwords are shown with spaces ("abcd efgh ..."); remove them.
  pass: readEnv("EMAIL_PASS").replace(/\s+/g, ""),
});

const createTransporter = () => {
  const { user, pass } = getEmailConfig();
  const missing = [];
  if (!user) missing.push("EMAIL_USER");
  if (!pass) missing.push("EMAIL_PASS");
  if (missing.length) {
    const err = new Error(`Missing environment variable(s): ${missing.join(", ")}`);
    err.code = "ENOCONFIG";
    throw err;
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
    // Fail fast instead of hanging for minutes when SMTP is unreachable.
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
};

// Builds a log-safe description of an email error. Never includes credentials.
const describeEmailError = (err) => {
  const parts = [];
  if (err.code) parts.push(`code=${err.code}`);
  if (err.command) parts.push(`command=${err.command}`);
  if (err.responseCode) parts.push(`responseCode=${err.responseCode}`);
  parts.push(`message="${err.message}"`);

  let hint = "";
  if (err.code === "ENOCONFIG") {
    hint = "Set EMAIL_USER and EMAIL_PASS on the backend (Render > Environment).";
  } else if (err.code === "EAUTH") {
    hint = "Gmail rejected the login. Check EMAIL_USER and generate a new Gmail App Password for EMAIL_PASS.";
  } else if (["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ENETUNREACH", "ECONNREFUSED", "EDNS"].includes(err.code)) {
    hint = "Could not reach smtp.gmail.com:587. Render FREE instances block outbound SMTP ports (25/465/587); a paid instance type is required for Gmail SMTP.";
  }
  if (hint) parts.push(`hint="${hint}"`);
  return parts.join(" ");
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  const { user } = getEmailConfig();

  return transporter.sendMail({
    from: `"BarberPro - Tech Barber Queen" <${user}>`,
    to,
    subject,
    html,
  });
};

// Checks the SMTP connection + login at startup so problems show up in the
// Render logs immediately, without waiting for a real booking.
const verifyEmailTransport = async () => {
  try {
    await createTransporter().verify();
    console.log(`[email] SMTP ready: smtp.gmail.com:587 as ${getEmailConfig().user}`);
    return true;
  } catch (err) {
    console.error(`[email] SMTP check FAILED: ${describeEmailError(err)}`);
    return false;
  }
};

module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
module.exports.verifyEmailTransport = verifyEmailTransport;
module.exports.describeEmailError = describeEmailError;
module.exports.getEmailConfig = getEmailConfig;
