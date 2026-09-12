import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patientId: String,
  facility: String,
  requestedFor: String,
  contact: String,
  status: { type: String, default: 'Requested — demo booking' },
  details: Object,
  createdAt: { type: Date, default: Date.now }
});

export const Appointment = mongoose.model('Appointment', appointmentSchema);
