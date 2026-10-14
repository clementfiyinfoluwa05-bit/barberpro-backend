const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { describeEmailError, getEmailConfig } = require("../utils/sendEmail");

// A repeat of the same booking within this window is treated as a retry
// (double-click, network retry) and returns the existing appointment.
const RETRY_WINDOW_MS = 10 * 60 * 1000;
// A notification stuck in "sending" longer than this may be re-attempted.
const STALE_SENDING_MS = 5 * 60 * 1000;

// Sends the business notification at most once per appointment.
// Never throws: a failed email must not affect the saved booking.
const notifyNewBooking = async (appointmentId) => {
  let claimed;
  try {
    // Atomically claim the notification so concurrent retries can't both send.
    claimed = await Appointment.findOneAndUpdate(
      {
        _id: appointmentId,
        $or: [
          { notificationStatus: { $in: [null, "pending", "failed"] } },
          { notificationStatus: "sending", notificationAttemptAt: { $lt: new Date(Date.now() - STALE_SENDING_MS) } }
        ]
      },
      { $set: { notificationStatus: "sending", notificationAttemptAt: new Date() }, $inc: { notificationAttempts: 1 } },
      { returnDocument: "after" }
    );
    if (!claimed) {
      console.log(`[booking-notification] skipped appointment=${appointmentId} (already sent or in progress)`);
      return;
    }

    const service = await Service.findById(claimed.serviceId);
    const customer = await User.findById(claimed.customerId);

    await sendEmail({
      to: getEmailConfig().user,
      subject: "New Booking Alert - BarberPro",
      html: `<h2 style="color:#FBBF24;">New Appointment Booked!</h2>
        <p><b>Customer:</b> ${customer?.fullName}</p>
        <p><b>Phone:</b> ${customer?.phone}</p>
        <p><b>Service:</b> ${service?.serviceName}</p>
        <p><b>Date:</b> ${claimed.appointmentDate}</p>
        <p><b>Time:</b> ${claimed.appointmentTime}</p>
        <p><b>Notes:</b> ${claimed.notes || "None"}</p>`
    });

    await Appointment.updateOne(
      { _id: appointmentId },
      { $set: { notificationStatus: "sent", notifiedAt: new Date() } }
    );
    console.log(`[booking-notification] sent appointment=${appointmentId}`);
  } catch (emailErr) {
    console.error(
      `[booking-notification] FAILED appointment=${appointmentId} attempt=${claimed?.notificationAttempts ?? "?"} ${describeEmailError(emailErr)}`
    );
    if (claimed) {
      await Appointment.updateOne(
        { _id: appointmentId },
        { $set: { notificationStatus: "failed" } }
      ).catch((dbErr) => console.error(`[booking-notification] could not record failure: ${dbErr.message}`));
    }
  }
};

const createAppointment = async (req, res) => {
  try {
    const { serviceId, appointmentDate, appointmentTime, notes } = req.body;

    // Retry protection: same customer, service, slot and notes submitted
    // again shortly after -> return the existing booking, don't create another.
    let appointment = await Appointment.findOne({
      customerId: req.user._id,
      serviceId,
      appointmentDate,
      appointmentTime,
      notes: notes || "",
      status: { $ne: "cancelled" },
      createdAt: { $gte: new Date(Date.now() - RETRY_WINDOW_MS) }
    });

    if (!appointment) {
      appointment = await Appointment.create({
        customerId: req.user._id,
        serviceId,
        appointmentDate,
        appointmentTime,
        notes
      });
    } else {
      console.log(`[booking] duplicate submission returned existing appointment=${appointment._id}`);
    }

    // Respond as soon as the booking is saved; email is sent afterwards so a
    // slow or failing mail server never delays or breaks the booking.
    res.status(201).json(appointment);

    // Sends only if not already sent (a retry re-attempts a failed email).
    notifyNewBooking(appointment._id);
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