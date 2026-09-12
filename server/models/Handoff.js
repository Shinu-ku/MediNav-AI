import mongoose from 'mongoose';

const handoffSchema = new mongoose.Schema({
  patientId: String,
  summary: Object,
  text: String,
  createdAt: { type: Date, default: Date.now }
});

export const Handoff = mongoose.model('Handoff', handoffSchema);
