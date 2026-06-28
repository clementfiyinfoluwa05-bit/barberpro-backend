const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const createAppointment = async (req, res) => {
  try {
    const { serviceId, appointmentDate, appointmentTime, notes } = req.body;
    const appointment = await Appointment.create({
      customerId: req.user._id,
      serviceId,
      appointmentDate,
      appointmentTime,
      notes
    });
    const service = await Service.findById(serviceId);
    const customer = await User.findById(req.user._id);
    try {
      await sendEmail({
        to: process.env.EMAIL_USER,
        subject: "New Booking Alert - BarberPro",
        html: `<h2 style="color:#FBBF24;">New Appointment Booked!</h2>
        <p><b>Customer:</b> ${customer?.fullName}</p>
        <p><b>Phone:</b> ${customer?.phone}</p>
        <p><b>Service:</b> ${service?.serviceName}</p>
        <p><b>Date:</b> ${appointmentDate}</p>
        <p><b>Time:</b> ${appointmentTime}</p>
        <p><b>Notes:</b> ${notes || "None"}</p>`
      });
    } catch(emailErr) {
      console.error("Email error:", emailErr.message);
    }
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAppointments = async (req, res) => {
  try {
    let appointments;
    if (req.user.role === "admin") {
      appointments = await Appointment.find()
        .populate("customerId", "fullName email phone")
        .populate("serviceId", "serviceName price duration");
    } else {
      appointments = await Appointment.find({ customerId: req.user._id })
        .populate("serviceId", "serviceName price duration");
    }
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createAppointment, getAppointments, updateAppointment, deleteAppointment };