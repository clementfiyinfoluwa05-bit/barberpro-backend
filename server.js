const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const { verifyEmailTransport } = require("./utils/sendEmail");

dotenv.config();
connectDB();

const app = express();
app.use(cors({
  origin: ["http://localhost:5173", "https://barberpro-frontend-gules.vercel.app"],
  credentials: true
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/appointments", appointmentRoutes);

app.get("/", (req, res) => {
  res.send("BarberPro API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Logs whether Gmail SMTP is reachable/authorised (does not send an email).
  verifyEmailTransport();
});
