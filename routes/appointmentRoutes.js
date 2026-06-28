const express = require("express");
const router = express.Router();
const { createAppointment, getAppointments, updateAppointment, deleteAppointment } = require("../controllers/appointmentController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/", protect, createAppointment);
router.get("/", protect, getAppointments);
router.put("/:id", protect, adminOnly, updateAppointment);
router.delete("/:id", protect, adminOnly, deleteAppointment);

module.exports = router;
