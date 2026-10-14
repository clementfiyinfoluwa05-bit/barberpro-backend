// Lists admin accounts, or sets a new password for one account.
// Usage (from the backend folder):
//   node scripts/resetAdminPassword.js                       -> list admin accounts
//   node scripts/resetAdminPassword.js you@example.com       -> set a new password
//   node scripts/resetAdminPassword.js you@example.com --make-admin
//                                                            -> also give that account admin role
require("dotenv").config();
const readline = require("readline");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const ask = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => { rl.close(); resolve(answer); });
  });

const listAdmins = async () => {
  const admins = await User.find({ role: "admin" }).select("fullName email");
  if (!admins.length) console.log("No admin accounts found.");
  else admins.forEach((a) => console.log(`  admin: ${a.email} (${a.fullName})`));
};

(async () => {
  const email = (process.argv[2] || "").trim().toLowerCase();
  const makeAdmin = process.argv.includes("--make-admin");

  await mongoose.connect(process.env.MONGO_URI);
  try {
    if (!email) {
      await listAdmins();
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`No account found for ${email}. Existing admin accounts:`);
      await listAdmins();
      return;
    }

    if (user.role !== "admin" && !makeAdmin) {
      console.log(`${email} is a "${user.role}" account, not admin.`);
      console.log("Re-run with --make-admin if you want this account to be the admin.");
      return;
    }

    const password = await ask(`New password for ${email} (min 6 characters): `);
    if (password.length < 6) {
      console.log("Password too short. Nothing changed.");
      return;
    }

    const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const update = { password: hashed };
    if (makeAdmin) update.role = "admin";
    await User.updateOne({ _id: user._id }, { $set: update });

    console.log(`Password updated for ${email}${makeAdmin ? " (role: admin)" : ""}. You can log in now.`);
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
});
